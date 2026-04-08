"""
TouchPay Direct API Service (apidist.gutouch.net)

Server-to-server payment initiation via the TouchPay Direct API.
Uses HTTP Digest Authentication and PUT method.

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

from app.core.config import settings
from app.models.payment import MobileMoneyOperator

logger = logging.getLogger(__name__)

# Map operator enum to TouchPay service code
_OPERATOR_SERVICE_CODES: dict[MobileMoneyOperator, str] = {
    MobileMoneyOperator.MTN: settings.TOUCHPAY_SERVICE_CODE_MTN,
    MobileMoneyOperator.ORANGE: settings.TOUCHPAY_SERVICE_CODE_ORANGE,
}


class TouchPayDirectError(Exception):
    """Error from TouchPay Direct API (HTTP or business-level)."""

    def __init__(self, message: str, status_code: int | None = None, raw_response: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.raw_response = raw_response or {}


class TouchPayDirectService:
    """Client for the TouchPay Direct API (server-to-server)."""

    def __init__(self):
        self.api_url = settings.TOUCHPAY_DIRECT_API_URL.rstrip("/")
        self.agency_code = settings.TOUCHPAY_DIRECT_AGENCY_CODE
        self.login = settings.TOUCHPAY_DIRECT_LOGIN
        self.password = settings.TOUCHPAY_DIRECT_PASSWORD

    def _build_url(self) -> str:
        """Build the full transaction endpoint URL with query params.

        PUT {api_url}/{agency_code}/transaction?loginAgent={login}&passwordAgent={password}
        """
        return (
            f"{self.api_url}/{self.agency_code}/transaction"
            f"?loginAgent={self.login}&passwordAgent={self.password}"
        )

    def get_service_code(self, operator: MobileMoneyOperator) -> str:
        """Map a MobileMoneyOperator enum to the TouchPay service code."""
        code = _OPERATOR_SERVICE_CODES.get(operator)
        if not code:
            raise TouchPayDirectError(f"Unsupported operator: {operator}")
        return code

    async def initiate_payment(
        self,
        payment_reference: str,
        amount: int,
        phone_number: str,
        operator: MobileMoneyOperator,
        callback_url: str,
        additional_info: dict[str, Any] | None = None,
    ) -> dict:
        """Initiate a mobile money payment via TouchPay Direct API.

        Args:
            payment_reference: Our internal payment reference (idFromClient).
            amount: Payment amount in XAF (integer).
            phone_number: Customer phone number (e.g. 237670000000).
            operator: Mobile money operator (MTN or ORANGE).
            callback_url: URL for TouchPay to POST payment status updates.
            additional_info: Optional metadata dict.

        Returns:
            Parsed JSON response from TouchPay.

        Raises:
            TouchPayDirectError: On HTTP or business-level errors.
        """
        service_code = self.get_service_code(operator)
        url = self._build_url()

        payload = {
            "idFromClient": payment_reference,
            "amount": str(amount),
            "recipientNumber": phone_number,
            "serviceCode": service_code,
            "callback": callback_url,
        }
        if additional_info:
            payload["additionnalInfos"] = additional_info

        logger.info(
            "TouchPay Direct: initiating payment ref=%s amount=%s operator=%s phone=%s",
            payment_reference, amount, operator.value, phone_number,
        )

        try:
            auth = httpx.DigestAuth(self.login, self.password)
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

            if response.status_code >= 400:
                error_text = response.text
                logger.error(
                    "TouchPay Direct HTTP error: status=%s body=%s ref=%s",
                    response.status_code, error_text, payment_reference,
                )
                raise TouchPayDirectError(
                    f"HTTP {response.status_code}: {error_text}",
                    status_code=response.status_code,
                )

            data = response.json()

            # Check business-level status in response body
            tp_status = data.get("status")
            if tp_status is not None:
                try:
                    tp_status_int = int(tp_status)
                except (ValueError, TypeError):
                    tp_status_int = None

                if tp_status_int is not None and tp_status_int >= 400:
                    msg = data.get("message", "TouchPay Direct business error")
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
