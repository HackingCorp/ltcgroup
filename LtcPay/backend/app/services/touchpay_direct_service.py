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

from app.core.velocity import check_phone_velocity
from app.services.country_service import country_service

logger = logging.getLogger(__name__)


class TouchPayDirectError(Exception):
    """Error from TouchPay Direct API (HTTP or business-level)."""

    def __init__(self, message: str, status_code: int | None = None, raw_response: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.raw_response = raw_response or {}


def friendly_initiation_error(exc: "TouchPayDirectError") -> str:
    """Customer-facing French message for a TouchPay initiation rejection."""
    raw = str(exc).lower()
    if "operation similaire" in raw:
        return "Une operation similaire a deja ete envoyee. Patientez 5 minutes avant de reessayer."
    if "tec-internal" in raw or "erreur interne" in raw:
        return "L'operateur est momentanement indisponible. Reessayez dans quelques minutes."
    if "numero de telephone" in raw or "indicatif" in raw:
        return "Numero de telephone invalide. Saisissez 9 chiffres sans indicatif pays."
    if "insuffisant" in raw:
        return "Solde insuffisant sur le compte Mobile Money. Rechargez votre compte et reessayez."
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
)


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

        # Find operator's service_code
        operators = await country_service.get_active_operators(db, country_code)
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

        # Anti-spam: cap initiation attempts per phone number
        check_phone_velocity(normalized_phone)

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
                logger.error(
                    "TouchPay Direct HTTP error: status=%s body=%s ref=%s",
                    response.status_code, error_text, payment_reference,
                )
                try:
                    err_data = response.json()
                except ValueError:
                    err_data = None
                msg = (err_data or {}).get("detailMessage") or (err_data or {}).get("message") \
                    or f"HTTP {response.status_code}: {error_text}"
                raise TouchPayDirectError(
                    msg,
                    status_code=response.status_code,
                    raw_response=err_data,
                )

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
                    logger.warning(
                        "TouchPay Direct business error: status=%s message=%s ref=%s",
                        tp_status, msg, payment_reference,
                    )
                    raise TouchPayDirectError(msg, status_code=tp_status_int, raw_response=data)

            logger.info(
                "TouchPay Direct: payment initiated successfully ref=%s data=%s",
                payment_reference, data,
            )
            return data

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
