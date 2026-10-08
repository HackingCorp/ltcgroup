"""
SebPay Collections Service

Server-to-server mobile money collection via the SebPay API
(https://new.sebpay.bj/fr/docs):

  POST {base_url}/collections                      initiate a payin
  GET  {base_url}/collections/{id_or_reference}    current status
  GET  {base_url}/operators                        operator catalogue

Every call carries X-Public-Key (pk_live_/pk_test_) and X-Secret-Key
(sk_live_/sk_test_). Responses are wrapped in {"success", "data", "message"}.

What the docs leave out, and how this module copes:
  - Idempotence of POST /collections on external_reference is only promised
    for payouts. A timeout or 5xx on initiation is therefore an unknown
    outcome (no failover), never a refusal.
  - A rejected collection carries no reason, neither in the webhook nor in
    GET /collections — the customer gets the generic failure message.
  - Some operators need an OTP the payer obtains by dialling a USSD code
    (Orange CI, Orange BF, ...). Those rows carry otp_required; the code comes
    from the merchant (otp_code on POST /payments) or from the hosted checkout.
    Without it the call is refused before reaching SebPay, so the router can
    still fail over to a provider that needs none.
  - Wave answers with a provider_link the payer must open. It is returned as
    redirect_url: to the merchant in the API response, and opened by the
    hosted checkout.

Webhooks: POST to the callback_url given at initiation, signed with
HMAC-SHA256 over the raw body, hex digest, key = secret key, header
X-SebPay-Signature. No timestamp, so no replay window: the handler relies on
idempotent settlement instead.

Account-level config lives in payment_providers.config for code SEBPAY:
  public_key     (plain)      - pk_live_... / pk_test_...
  secret_key     (encrypted)  - sk_live_... / sk_test_...
  base_url       (plain)      - default https://newapi.sebpay.bj/api/v1
"""
import hashlib
import hmac
import logging
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.velocity import check_phone_velocity
from app.models.provider import ProviderConfig
from app.services.country_service import country_service
from app.services.failure_reasons import is_customer_failure
from app.services.provider_service import provider_service
from app.services.touchpay_direct_service import (
    InvalidPhoneNumberError,
    OperatorMismatchError,
    TouchPayDirectError,
)

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://newapi.sebpay.bj/api/v1"

STATUS_APPROVED = "approved"
STATUS_REJECTED = "rejected"
STATUS_PENDING = "pending"

# SebPay operator code -> our operator_code, where they differ. Anything
# else is upper-cased with spaces and dashes removed ("EZY PESA" -> EZYPESA).
_OPERATOR_CODE_MAP = {
    "togocom": "TMONEY",
    "wligdicash": "LIGDICASH",
}


class SebPayError(TouchPayDirectError):
    """SebPay API error. Subclasses TouchPayDirectError so the existing
    initiation error handling (customer-error classification, friendly
    messages, HTTP mapping, failover rules) applies unchanged."""


class SebPayOtpRequiredError(SebPayError):
    """The operator needs the payer's OTP and none was given.

    Raised before calling SebPay: nothing is live, the router may fail over.
    Carries the USSD code the payer dials to obtain the OTP.
    """

    def __init__(self, message: str, ussd_code: str = ""):
        super().__init__(message)
        self.ussd_code = ussd_code


def to_operator_code(sebpay_code: str) -> str:
    """Our operator_code for a SebPay operator code."""
    code = (sebpay_code or "").strip()
    mapped = _OPERATOR_CODE_MAP.get(code.lower())
    if mapped:
        return mapped
    return code.upper().replace(" ", "").replace("-", "").replace("_", "")


def otp_ussd_for_amount(ussd_code: str, amount) -> str:
    """The USSD to dial for an OTP; Orange BF's embeds the amount."""
    if not ussd_code:
        return ""
    try:
        shown = str(int(amount))
    except (TypeError, ValueError):
        return ussd_code
    return ussd_code.replace("montant", shown).replace("MONTANT", shown)


def _error_message(body: Any, status_code: int) -> str:
    """Readable message from a SebPay error body (Laravel-style or envelope)."""
    if not isinstance(body, dict):
        return f"SebPay HTTP {status_code}"
    message = body.get("message") or f"SebPay HTTP {status_code}"
    errors = body.get("errors")
    if isinstance(errors, dict):
        details = []
        for field, problems in errors.items():
            if isinstance(problems, list) and problems:
                details.append(f"{field}: {problems[0]}")
            elif problems:
                details.append(f"{field}: {problems}")
        if details:
            message = f"{message} ({'; '.join(details)})"
    return str(message)


class SebPayService:

    @staticmethod
    def _url(base_url: str, path: str) -> str:
        return f"{base_url.rstrip('/')}/{path.lstrip('/')}"

    @staticmethod
    def _credentials(provider: ProviderConfig) -> tuple[str, str, str]:
        config = provider_service.decrypted_config(provider)
        return (
            config.get("public_key") or "",
            config.get("secret_key") or "",
            config.get("base_url") or DEFAULT_BASE_URL,
        )

    @staticmethod
    def _headers(public_key: str, secret_key: str) -> dict:
        return {
            "X-Public-Key": public_key,
            "X-Secret-Key": secret_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    async def get_collection(
        self, provider: ProviderConfig, reference: str,
    ) -> dict | None:
        """Current state of a collection, by our reference or SebPay's id.

        Returns the `data` dict, or None when the answer is unusable —
        callers must then leave the payment untouched rather than guess.
        """
        public_key, secret_key, base_url = self._credentials(provider)
        if not public_key or not secret_key:
            return None
        url = self._url(base_url, f"collections/{reference}")
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(url, headers=self._headers(public_key, secret_key))
        except httpx.HTTPError as exc:
            logger.warning("SebPay status check failed for %s: %s", reference, exc)
            return None
        if response.status_code != 200:
            logger.warning(
                "SebPay status check for %s: HTTP %s %s",
                reference, response.status_code, response.text[:200],
            )
            return None
        try:
            body = response.json()
        except ValueError:
            return None
        data = body.get("data") if isinstance(body, dict) else None
        if not isinstance(data, dict) or not data.get("status"):
            logger.warning("SebPay status check for %s: no status in %s", reference, str(body)[:300])
            return None
        return data

    async def list_operators(self, provider: ProviderConfig) -> list[dict]:
        """SebPay's operator catalogue (all countries). Raises SebPayError."""
        public_key, secret_key, base_url = self._credentials(provider)
        if not public_key or not secret_key:
            raise SebPayError("SebPay public_key/secret_key are not configured")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    self._url(base_url, "operators"),
                    headers=self._headers(public_key, secret_key),
                )
        except httpx.HTTPError as exc:
            raise SebPayError(f"SebPay operators: {exc}") from exc
        try:
            body = response.json()
        except ValueError:
            body = None
        if response.status_code != 200 or not isinstance(body, dict) or not body.get("success"):
            raise SebPayError(
                _error_message(body, response.status_code),
                status_code=response.status_code, raw_response=body if isinstance(body, dict) else None,
            )
        data = body.get("data")
        return data if isinstance(data, list) else []

    async def initiate_payment(
        self,
        db: AsyncSession,
        provider: ProviderConfig,
        payment_reference: str,
        amount: int,
        phone_number: str,
        operator_code: str,
        country_code: str,
        callback_url: str | None = None,
        otp_code: str | None = None,
    ) -> dict:
        """Create a SebPay collection. Raises SebPayError on any refusal.

        The returned dict exposes SebPay's id as `transactionId`, which is
        where extract_transaction_ids looks for it, and Wave's provider_link
        as `redirect_url`.
        """
        public_key, secret_key, base_url = self._credentials(provider)
        if not public_key or not secret_key:
            raise SebPayError("SebPay public_key/secret_key are not configured")

        country = await country_service.get_active_country(db, country_code)
        normalized_phone = country_service.normalize_phone(
            phone_number, country.phone_prefix, country.phone_digits,
        )
        length_error = country_service.phone_length_error(normalized_phone, country)
        if length_error:
            raise InvalidPhoneNumberError(length_error)

        # The SebPay operator code ("mtn", "MTN" for Cameroon, "togocom"...)
        # is stored as service_code on the SEBPAY operator row.
        operators = await country_service.get_active_operators(
            db, country_code, provider_code="SEBPAY",
        )
        op = next((o for o in operators if o.operator_code == operator_code.upper()), None)
        if not op:
            raise SebPayError(
                f"Operator '{operator_code}' not available via SebPay for '{country_code}'"
            )
        sebpay_operator = op.service_code or operator_code.lower()

        otp_code = "".join(c for c in (otp_code or "") if c.isalnum())
        if getattr(op, "otp_required", False) and not otp_code:
            # Refused before calling SebPay: the operator would reject it
            # outright, and nothing being live lets the router fail over.
            ussd = otp_ussd_for_amount(op.ussd_code, amount)
            raise SebPayOtpRequiredError(
                f"Code OTP requis pour {op.operator_name}"
                + (f" : composez {ussd} pour l'obtenir." if ussd else "."),
                ussd_code=ussd,
            )

        # Same pre-flight guards as the other mobile providers.
        if getattr(country, "enforce_phone_prefix_check", True):
            all_operators = await country_service.get_operators(db, country_code)
            mismatch = country_service.operator_mismatch(
                all_operators, normalized_phone, operator_code,
            )
            if mismatch:
                raise OperatorMismatchError(
                    country_service.operator_mismatch_message(all_operators, mismatch),
                    raw_response={
                        "detected_operator": mismatch.operator_code,
                        "detected_operator_available": country_service.operator_is_available(
                            all_operators, mismatch.operator_code,
                        ),
                    },
                )
        check_phone_velocity(normalized_phone)

        payload: dict[str, Any] = {
            "amount": amount,
            "currency": country.currency,
            # International format without '+'.
            "phone": f"{country.phone_prefix}{normalized_phone}",
            "operator": sebpay_operator,
            "country": country_code.upper(),
            "external_reference": payment_reference,
        }
        if callback_url:
            payload["callback_url"] = callback_url
        if otp_code:
            payload["otp_code"] = otp_code

        url = self._url(base_url, "collections")
        logger.info(
            "SebPay: initiating collection ref=%s amount=%s %s operator=%s country=%s phone=%s",
            payment_reference, amount, country.currency, sebpay_operator, country_code,
            normalized_phone,
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url, json=payload, headers=self._headers(public_key, secret_key),
                )
        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            # The request never reached SebPay: nothing can be live there.
            logger.error("SebPay unreachable for ref=%s: %s", payment_reference, exc)
            raise SebPayError(f"SebPay unreachable: {exc}") from exc
        except httpx.HTTPError as exc:
            logger.error("SebPay no answer for ref=%s: %s", payment_reference, exc)
            raise SebPayError(f"Request timed out: {exc}", outcome_unknown=True) from exc

        try:
            body = response.json()
        except ValueError:
            body = None

        status_code = response.status_code
        if status_code == 408 or status_code >= 500:
            # The docs call these non-final and promise no idempotence on
            # collections: the payin may exist. Never fail over on it.
            logger.error(
                "SebPay HTTP %s for ref=%s body=%s",
                status_code, payment_reference, response.text[:500],
            )
            raise SebPayError(
                _error_message(body, status_code), status_code=status_code,
                raw_response=body if isinstance(body, dict) else None,
                outcome_unknown=True,
            )

        if status_code >= 300 or not isinstance(body, dict) or not body.get("success"):
            msg = _error_message(body, status_code)
            level = logging.INFO if is_customer_failure(msg) else logging.WARNING
            logger.log(
                level, "SebPay refused ref=%s: HTTP %s %s",
                payment_reference, status_code, msg,
            )
            raise SebPayError(
                msg, status_code=status_code,
                raw_response=body if isinstance(body, dict) else None,
            )

        data = body.get("data") if isinstance(body.get("data"), dict) else {}
        status = str(data.get("status") or "").lower()
        if status == STATUS_REJECTED:
            msg = data.get("message") or body.get("message") or "SebPay: collection rejected"
            logger.info("SebPay rejected ref=%s at initiation: %s", payment_reference, msg)
            raise SebPayError(str(msg), raw_response=body)


        logger.info(
            "SebPay: collection created ref=%s id=%s status=%s",
            payment_reference, data.get("transaction_id"), status,
        )
        result: dict[str, Any] = {
            "status": status or STATUS_PENDING,
            "message": data.get("message") or body.get("message"),
            "sebpay": data,
        }
        if data.get("transaction_id"):
            result["transactionId"] = str(data["transaction_id"])
        if data.get("provider_link"):
            # Wave: the payment only happens once the payer opens this link.
            result["redirect_url"] = str(data["provider_link"])
        return result


def verify_webhook_signature(raw_body: bytes, signature: str | None, secret: str) -> bool:
    """HMAC-SHA256 of the raw body with the secret key, hex, constant time."""
    if not signature or not secret:
        return False
    candidate = signature.strip()
    if candidate.lower().startswith("sha256="):
        candidate = candidate[len("sha256="):]
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, candidate.lower())


sebpay_service = SebPayService()
