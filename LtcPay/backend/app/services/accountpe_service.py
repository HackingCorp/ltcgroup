"""
AccountPE (Swychr Connect) Payin Service

Server-to-server mobile money collection via the AccountPE Direct API.

  POST {base_url}/payin/create_payment_request   (Api-Key header auth)

Conventions (mirror the AccountPE card API already integrated in the LTC
Group backend):
  - Business errors come back as HTTP 200 with {"status": 4xx, "message"} —
    always check the JSON status field, never the HTTP status alone.
  - transaction_id must be unique per account; we send our PAY-xxx reference.
  - Status webhooks are account-level ("payment_link_status_updated"),
    signed HMAC-SHA256 over "{timestamp}.{raw_body}" with the webhook
    secret configured in the AccountPE profile (see verify_webhook_signature).

Account-level config lives in payment_providers.config for code ACCOUNTPE:
  api_key         (encrypted)  - from Payment Gateway -> API Key
  webhook_secret  (encrypted)  - the "Webhook Hash" set in Profile Settings
  base_url        (plain)      - default https://api.accountpe.com/api
"""
import hashlib
import hmac
import logging
import time
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.velocity import check_phone_velocity
from app.models.provider import ProviderConfig
from app.services.country_service import country_service
from app.services.provider_service import provider_service
from app.services.touchpay_direct_service import OperatorMismatchError, TouchPayDirectError

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.accountpe.com/api"

# AccountPE webhook status codes -> our terminology
# 0 PENDING, 1 SUCCESSFUL, 2 FAILED, 3 EXPIRED, 4 PROCESSING, 5 DECLINED, 6 REJECTED
STATUS_SUCCESS = {1}
STATUS_FAILED = {2, 5, 6}
STATUS_EXPIRED = {3}
STATUS_PENDING = {0, 4}


class AccountPEError(TouchPayDirectError):
    """AccountPE API error. Subclasses TouchPayDirectError so the existing
    initiation error handling (customer-error classification, friendly
    messages, HTTP mapping) applies unchanged."""


class AccountPEService:

    @staticmethod
    def _url(base_url: str, path: str) -> str:
        return f"{base_url.rstrip('/')}/{path.lstrip('/')}"

    async def initiate_payment(
        self,
        db: AsyncSession,
        provider: ProviderConfig,
        payment_reference: str,
        amount: int,
        phone_number: str,
        operator_code: str,
        country_code: str,
        customer_name: str | None = None,
        customer_email: str | None = None,
        description: str | None = None,
        callback_url: str | None = None,
        failed_callback_url: str | None = None,
    ) -> dict:
        """Create an AccountPE payin request. Returns the parsed response data.

        Raises AccountPEError on HTTP or business-level failure.
        """
        config = provider_service.decrypted_config(provider)
        api_key = config.get("api_key")
        base_url = config.get("base_url") or DEFAULT_BASE_URL
        if not api_key:
            raise AccountPEError("AccountPE api_key is not configured")

        country = await country_service.get_active_country(db, country_code)
        normalized_phone = country_service.normalize_phone(
            phone_number, country.phone_prefix, country.phone_digits,
        )
        length_error = country_service.phone_length_error(normalized_phone, country)
        if length_error:
            raise InvalidPhoneNumberError(length_error)

        # AccountPE's payment_method is case-sensitive ("Moov", "Airtel",
        # "Mpesa", ...) — use the exact value stored as service_code on the
        # ACCOUNTPE operator row, never the normalized operator code.
        operators = await country_service.get_active_operators(
            db, country_code, provider_code="ACCOUNTPE",
        )
        op = next((o for o in operators if o.operator_code == operator_code.upper()), None)
        if not op:
            raise AccountPEError(
                f"Operator '{operator_code}' not available via AccountPE for '{country_code}'"
            )
        payment_method = op.service_code or operator_code.upper()

        # Same pre-flight guards as the TouchPay direct path: reject numbers
        # that provably belong to another operator, and rate-limit attempts.
        if getattr(country, "enforce_phone_prefix_check", True):
            all_operators = await country_service.get_operators(db, country_code)
            mismatch = country_service.operator_mismatch(
                all_operators, normalized_phone, operator_code,
            )
            if mismatch:
                raise OperatorMismatchError(
                    f"Ce numero appartient a {mismatch.operator_name}, pas a l'operateur selectionne. "
                    "Verifiez le numero saisi ou changez d'operateur.",
                    raw_response={"detected_operator": mismatch.operator_code},
                )
        check_phone_velocity(normalized_phone)

        payload: dict[str, Any] = {
            "country_code": country_code.upper(),
            "name": customer_name or "Client",
            "transaction_id": payment_reference,
            "amount": amount,
            "mobile": normalized_phone,
            "payment_method": payment_method,
            "description": description or payment_reference,
            "pass_digital_charge": False,
            "source": "LtcPay",
        }
        if customer_email:
            payload["email"] = customer_email
        if callback_url:
            payload["callback_url"] = callback_url
        if failed_callback_url:
            payload["failed_callback_url"] = failed_callback_url

        url = self._url(base_url, "payin/create_payment_request")
        logger.info(
            "AccountPE: initiating payin ref=%s amount=%s operator=%s country=%s phone=%s",
            payment_reference, amount, operator_code, country_code, normalized_phone,
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Api-Key": api_key, "Content-Type": "application/json"},
                )
        except httpx.TimeoutException as exc:
            logger.error("AccountPE timeout for ref=%s: %s", payment_reference, exc)
            raise AccountPEError(f"Request timed out: {exc}") from exc
        except httpx.HTTPError as exc:
            logger.error("AccountPE HTTP error for ref=%s: %s", payment_reference, exc)
            raise AccountPEError(f"HTTP error: {exc}") from exc

        try:
            data = response.json()
        except ValueError:
            data = None

        if response.status_code >= 300 or data is None:
            logger.error(
                "AccountPE HTTP error: status=%s body=%s ref=%s",
                response.status_code, response.text[:500], payment_reference,
            )
            msg = (data or {}).get("message") or f"HTTP {response.status_code}"
            raise AccountPEError(msg, status_code=response.status_code, raw_response=data)

        # AccountPE convention: HTTP 200 with business status in the body.
        biz_status = data.get("status")
        try:
            biz_status_int = int(biz_status)
        except (TypeError, ValueError):
            biz_status_int = None

        if biz_status_int is None or biz_status_int >= 300:
            msg = data.get("message") or "AccountPE business error"
            level = logging.INFO if _looks_customer_caused(msg) else logging.WARNING
            logger.log(
                level,
                "AccountPE business error: status=%s message=%s ref=%s",
                biz_status, msg, payment_reference,
            )
            raise AccountPEError(msg, status_code=biz_status_int, raw_response=data)

        logger.info(
            "AccountPE: payin created ref=%s data=%s", payment_reference, data.get("data"),
        )
        return data


def _looks_customer_caused(message: str) -> bool:
    from app.services.touchpay_direct_service import _CUSTOMER_ERROR_MARKERS
    raw = (message or "").lower()
    return any(marker in raw for marker in _CUSTOMER_ERROR_MARKERS)


def verify_webhook_signature(
    raw_body: bytes,
    timestamp: str | None,
    signature: str | None,
    secret: str,
    max_age_seconds: int = 300,
) -> bool:
    """Verify an AccountPE webhook: HMAC-SHA256 over '{timestamp}.{raw_body}'.

    Rejects missing headers, stale timestamps (replay guard) and signature
    mismatches. Constant-time comparison.
    """
    if not timestamp or not signature or not secret:
        return False
    try:
        age = abs(time.time() - float(timestamp))
    except ValueError:
        return False
    if age > max_age_seconds:
        return False
    signed = f"{timestamp}.".encode("utf-8") + raw_body
    expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


accountpe_service = AccountPEService()
