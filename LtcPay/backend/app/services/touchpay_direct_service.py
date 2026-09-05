"""
TouchPay Direct API Service (apidist.gutouch.net)

Server-to-server payment initiation via the TouchPay Direct API.
Uses HTTP Digest Authentication and PUT method.

Credentials are loaded per-country from the DB via country_service.

API endpoint:
  PUT /apidist/sec/touchpayapi/{agency_code}/transaction
      ?loginAgent={login}&passwordAgent={password}

Request body (JSON):
  {
    "idFromClient": "PAY-xxx",
    "amount": "5000",
    "recipientNumber": "237670000000",
    "serviceCode": "PAIEMENTMARCHAND_MTN_CM",
    "callback": "https://example.com/webhooks/touchpay/direct-callback",
    "additionnalInfos": {"key": "value"}
  }
"""
import logging
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.velocity import (
    annotate_payin_attempt,
    clear_payin_attempt,
    format_delay,
    check_phone_velocity,
    duplicate_payin_status,
    record_payin_attempt,
)
from app.services.country_service import country_service
from app.services.failure_reasons import extract_operator_reference

logger = logging.getLogger(__name__)


class TouchPayDirectError(Exception):
    """Error from TouchPay Direct API (HTTP or business-level)."""

    def __init__(self, message: str, status_code: int | None = None, raw_response: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.raw_response = raw_response or {}


class OperatorMismatchError(TouchPayDirectError):
    """The phone number provably belongs to a different operator.

    Raised before any TouchPay call; callers map it to HTTP 400. Subclasses
    TouchPayDirectError so an unaware caller still handles it safely.
    """


class InvalidPhoneNumberError(OperatorMismatchError):
    """The number does not have the digit count the country requires.

    Every country carries a phone_digits, we publish it in the API and the
    docs tell merchants to respect it — but nothing checked it, so a number
    missing a digit was silently truncated by normalize_phone and sent to
    the operator anyway. Seen 2026-09-01: 241 74452464 (8 digits) reached
    AccountPE, which answered "Invalid phone number"; the customer retried
    44 seconds later with the ninth digit and it went through.

    Subclasses OperatorMismatchError so the callers that already map that to
    HTTP 400 — and the router, which never fails over on it — treat this
    identically without touching every call site.
    """


def friendly_initiation_error(exc: "TouchPayDirectError") -> str:
    """Customer-facing French message for a TouchPay initiation rejection."""
    raw = str(exc).lower()
    if "appartient a" in raw:
        return str(exc)  # already a customer-facing French message
    if "operation similaire" in raw:
        info = exc.raw_response or {}
        wait = info.get("retry_after")
        if not wait:
            return "Une operation similaire a deja ete envoyee. Patientez 5 minutes avant de reessayer."

        delay = format_delay(int(wait))
        # Repeat why the previous attempt failed — that is what the customer
        # has to act on. "Operation similaire" only explains our refusal.
        previous = info.get("previous_error")
        if previous:
            return (
                f"{friendly_initiation_error(TouchPayDirectError(previous))} "
                f"Le paiement precedent est en cours de traitement chez l'operateur : "
                f"patientez encore {delay} avant de reessayer."
            )
        return (
            "Une operation similaire a deja ete envoyee pour ce numero. "
            f"Patientez encore {delay} avant de reessayer."
        )
    if "tec-internal" in raw or "erreur interne" in raw or "pas autorise a effectuer" in raw:
        # Never echo "Vous n'etes pas autorise a effectuer cette operation" to
        # the customer: it accuses them of a permissions problem, when TouchPay
        # says it means their own service is momentarily unavailable.
        return "L'operateur est momentanement indisponible. Reessayez dans quelques minutes."
    if "numero de telephone" in raw or "indicatif" in raw:
        # Our own length check already names both counts and the country;
        # replacing it with a generic "9 digits" would be wrong outside
        # Cameroon — Ivory Coast expects 10, Benin/Mali/Togo 8.
        if "chiffres recus" in raw:
            return str(exc)
        return "Numero de telephone invalide pour ce pays. Saisissez le numero sans indicatif pays."
    if "insuffisant" in raw:
        return "Solde insuffisant sur le compte Mobile Money. Rechargez votre compte et reessayez."
    if "bloque" in raw or "blocked" in raw:
        return "Ce compte Mobile Money est bloque. Contactez votre operateur."
    if "introuvable" in raw or "not found" in raw:
        return "Compte Mobile Money introuvable pour ce numero. Verifiez le numero saisi."
    return f"Le paiement n'a pas pu etre initie : {exc}"


# Rejections caused by the customer or their wallet rather than by a fault on
# our side or the operator's. They are expected traffic, so they must not be
# logged as errors nor counted toward the operator-outage alert — otherwise a
# normal afternoon of shoppers with empty wallets trips it.
_CUSTOMER_ERROR_MARKERS = (
    "insuffisant",          # OM: solde du compte du payeur est insuffisant
    "introuvable",          # OM: beneficiaire introuvable
    "not found",            # MTN: [04] Account not found
    "operation similaire",  # TouchPay 5-minute duplicate guard
    "numero de telephone",  # bad phone format submitted by the customer
    "indicatif",
    "disabled or blocked",  # MTN: [11] account disabled
    "bloque",               # OM: utilisateur bloque
    "appartient a",         # local prefix check: number belongs to another operator
)


def duplicate_retry_after(exc: "TouchPayDirectError") -> int | None:
    """Seconds to wait when the rejection is our pre-flight duplicate guard.

    None for every other rejection, including TouchPay's own duplicate error,
    which does not tell us how much of its window is left.
    """
    wait = (exc.raw_response or {}).get("retry_after")
    return int(wait) if wait else None


def is_customer_error(exc: "TouchPayDirectError") -> bool:
    """True when the rejection is the customer's situation, not an incident."""
    raw = str(exc).lower()
    return any(marker in raw for marker in _CUSTOMER_ERROR_MARKERS)


class TouchPayDirectService:
    """Client for the TouchPay Direct API (server-to-server).

    Credentials are loaded per-country from the database.
    """

    @staticmethod
    def _build_url(api_url: str, agency_code: str, login: str, password: str) -> str:
        """Build the full transaction endpoint URL with query params."""
        return (
            f"{api_url.rstrip('/')}/{agency_code}/transaction"
            f"?loginAgent={login}&passwordAgent={password}"
        )

    @staticmethod
    def _normalize_phone(phone: str, phone_prefix: str, phone_digits: int) -> str:
        """Normalize phone number to local digits (no country code).

        TouchPay requires digits without the country prefix.
        """
        return country_service.normalize_phone(phone, phone_prefix, phone_digits)

    async def initiate_payment(
        self,
        db: AsyncSession,
        payment_reference: str,
        amount: int,
        phone_number: str,
        operator_code: str,
        country_code: str,
        callback_url: str,
        additional_info: dict[str, Any] | None = None,
    ) -> dict:
        """Initiate a mobile money payment via TouchPay Direct API.

        Args:
            db: Database session.
            payment_reference: Our internal payment reference (idFromClient).
            amount: Payment amount (integer).
            phone_number: Customer phone number.
            operator_code: Operator code (e.g. "MTN", "ORANGE").
            country_code: ISO country code (e.g. "CM", "CI").
            callback_url: URL for TouchPay to POST payment status updates.
            additional_info: Optional metadata dict.

        Returns:
            Parsed JSON response from TouchPay.

        Raises:
            TouchPayDirectError: On HTTP or business-level errors.
        """
        # Load credentials and operator from DB
        try:
            creds = await country_service.get_decrypted_credentials(db, country_code)
        except ValueError as exc:
            raise TouchPayDirectError(f"Country '{country_code}' not available: {exc}") from exc

        country = await country_service.get_active_country(db, country_code)

        # Find operator's service_code (TouchPay-scoped rows only)
        operators = await country_service.get_active_operators(db, country_code, provider_code="TOUCHPAY")
        op = next((o for o in operators if o.operator_code == operator_code.upper()), None)
        if not op:
            raise TouchPayDirectError(
                f"Operator '{operator_code}' not available for country '{country_code}'"
            )

        service_code = op.service_code
        api_url = creds["direct_api_url"]
        agency_code = creds["agency_code"]
        login = creds["login"]
        password = creds["password"]

        if not agency_code or not login:
            raise TouchPayDirectError(
                f"TouchPay Direct API credentials not configured for {country_code}"
            )

        url = self._build_url(api_url, agency_code, login, password)
        normalized_phone = self._normalize_phone(
            phone_number, country.phone_prefix, country.phone_digits,
        )

        # A wrong digit count is a typo, not an operator problem: catch it
        # here rather than letting normalize_phone truncate it and spending
        # a round-trip to have the operator say "invalid phone number".
        length_error = country_service.phone_length_error(normalized_phone, country)
        if length_error:
            raise InvalidPhoneNumberError(length_error)

        # Reject numbers that provably belong to another operator before
        # sending anything to TouchPay (mismatch-only: unknown ranges pass).
        # Skipped for countries with number portability, where a prefix no
        # longer proves the operator (enforce_phone_prefix_check=false).
        if getattr(country, "enforce_phone_prefix_check", True):
            all_operators = await country_service.get_operators(db, country_code)
            mismatch = country_service.operator_mismatch(
                all_operators, normalized_phone, operator_code,
            )
            if mismatch:
                raise OperatorMismatchError(
                    f"Ce numero appartient a {mismatch.operator_name}, pas a {op.operator_name}. "
                    "Verifiez le numero saisi ou changez d'operateur.",
                    raw_response={"detected_operator": mismatch.operator_code},
                )

        # TouchPay rejects a repeat of the same payin within 5 minutes. Answer
        # locally with the time left rather than spending a round-trip on a
        # request we know it will refuse. Raised as a TouchPayDirectError so
        # every caller treats it exactly like TouchPay's own rejection.
        #
        # Checked *before* the velocity counter on purpose: a retry we refuse
        # ourselves must not burn an anti-spam slot, otherwise TouchPay's own
        # window pushes customers into a 30-minute lockout they did nothing
        # to deserve (seen 2026-08-23, 4 customers).
        wait, previous_error = duplicate_payin_status(
            operator_code, normalized_phone, amount,
        )
        if wait:
            logger.info(
                "TouchPay Direct: duplicate window active for ref=%s phone=%s "
                "amount=%s — %ss left, skipping the call (previous: %s)",
                payment_reference, normalized_phone, amount, wait,
                previous_error or "unknown",
            )
            raise TouchPayDirectError(
                "Une operation similaire a ete envoyee il y a moins de 5 minutes",
                status_code=300,
                raw_response={"retry_after": wait, "previous_error": previous_error},
            )

        # Anti-spam: cap initiation attempts per phone number
        check_phone_velocity(normalized_phone)

        # Open the window now rather than on success: TouchPay counts the
        # attempt even when it rejects it outright.
        record_payin_attempt(operator_code, normalized_phone, amount)

        payload = {
            "idFromClient": payment_reference,
            "amount": str(amount),
            "recipientNumber": normalized_phone,
            "serviceCode": service_code,
            "callback": callback_url,
        }
        if additional_info:
            payload["additionnalInfos"] = additional_info

        logger.info(
            "TouchPay Direct: initiating payment ref=%s amount=%s operator=%s country=%s phone=%s (raw=%s)",
            payment_reference, amount, operator_code, country_code, normalized_phone, phone_number,
        )

        try:
            auth = httpx.DigestAuth(login, password)
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(
                    url,
                    json=payload,
                    auth=auth,
                )

            logger.info(
                "TouchPay Direct: HTTP %s for ref=%s",
                response.status_code, payment_reference,
            )

            # TouchPay signals rejections with HTTP 300 ("Mauvaise requete",
            # bad phone format, ...) as well as 4xx/5xx — only 2xx is success.
            if response.status_code >= 300:
                error_text = response.text
                try:
                    err_data = response.json()
                except ValueError:
                    err_data = None
                msg = (err_data or {}).get("detailMessage") or (err_data or {}).get("message") \
                    or f"HTTP {response.status_code}: {error_text}"
                exc = TouchPayDirectError(
                    msg,
                    status_code=response.status_code,
                    raw_response=err_data,
                )
                logger.log(
                    logging.INFO if is_customer_error(exc) else logging.ERROR,
                    "TouchPay Direct %s: status=%s body=%s ref=%s",
                    "customer rejection" if is_customer_error(exc) else "HTTP error",
                    response.status_code, error_text, payment_reference,
                )
                raise exc

            data = response.json()

            # Check business-level status in response body (HTTP can be 200
            # with an error status inside — same convention as the SDK API)
            tp_status = data.get("status")
            if tp_status is not None:
                try:
                    tp_status_int = int(tp_status)
                except (ValueError, TypeError):
                    tp_status_int = None

                if tp_status_int is not None and tp_status_int >= 300:
                    msg = data.get("message") or data.get("detailMessage") \
                        or "TouchPay Direct business error"
                    exc = TouchPayDirectError(msg, status_code=tp_status_int, raw_response=data)
                    logger.log(
                        logging.INFO if is_customer_error(exc) else logging.WARNING,
                        "TouchPay Direct business error: status=%s message=%s ref=%s",
                        tp_status, msg, payment_reference,
                    )
                    raise exc

            logger.info(
                "TouchPay Direct: payment initiated successfully ref=%s data=%s",
                payment_reference, data,
            )
            return data

        except TouchPayDirectError as exc:
            # Keep the window only when the operator actually registered the
            # transaction — its own reference in the message proves it did.
            # Otherwise nothing is pending on their side and holding the
            # window for five minutes just blocks a legitimate retry.
            if extract_operator_reference(str(exc)):
                # Remember why this attempt was refused: the next one lands
                # inside the duplicate window and must repeat the real reason
                # instead of the opaque "operation similaire".
                annotate_payin_attempt(
                    operator_code, normalized_phone, amount, str(exc),
                )
            else:
                clear_payin_attempt(operator_code, normalized_phone, amount)
            raise
        except httpx.TimeoutException as exc:
            logger.error(
                "TouchPay Direct timeout for ref=%s: %s",
                payment_reference, exc,
            )
            raise TouchPayDirectError(f"Request timed out: {exc}") from exc
        except httpx.HTTPError as exc:
            logger.error(
                "TouchPay Direct HTTP error for ref=%s: %s",
                payment_reference, exc,
            )
            raise TouchPayDirectError(f"HTTP error: {exc}") from exc


touchpay_direct_service = TouchPayDirectService()
