"""
LtcPay - TouchPay Integration Service

TouchPay SDK reference (prod_touchpay-0.0.1.js):
  sendPaymentInfos(
      payment_token,       // unique token identifying this payment
      merchant_id,         // e.g. 'LTCGR11789'
      secure_code,         // merchant secure code from TouchPay dashboard
      merchant_website,    // e.g. 'ltcpay.com'
      success_url,         // redirect URL on payment success
      failed_url,          // redirect URL on payment failure
      amount,              // integer amount in local currency
      city,                // customer city (e.g. 'Douala')
      email,               // customer email
      first_name,          // customer first name
      last_name,           // customer last name
      phone                // customer phone number
  )

Callback (GET from TouchPay to our server):
  ?payment_mode=...&paid_sum=...&paid_amount=...&payment_token=...
   &payment_status=200&command_number=...&payment_validation_date=...
  payment_status=200 means success.
"""
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class TouchPayService:
    """Service for interacting with the TouchPay payment gateway."""

    def __init__(self):
        self.merchant_id = settings.TOUCHPAY_MERCHANT_ID
        self.secure_code = settings.TOUCHPAY_SECURE_CODE
        self.merchant_website = settings.TOUCHPAY_MERCHANT_WEBSITE
        self.api_url = settings.touchpay_api_url

    def get_sdk_config(
        self,
        payment_token: str,
        amount: float,
        customer_email: str = "",
        customer_first_name: str = "",
        customer_last_name: str = "",
        customer_phone: str = "",
        customer_city: str = "Douala",
        success_url: Optional[str] = None,
        failed_url: Optional[str] = None,
    ) -> dict:
        """
        Build the config dict passed to the checkout.html template.

        The template JS calls:
          sendPaymentInfos(payment_token, merchant_id, secure_code,
              merchant_website, success_url, failed_url, amount, city,
              email, first_name, last_name, phone)
        """
        base = settings.webhook_base_url.rstrip("/")

        # Default success/failed URLs point to our callback endpoint
        # TouchPay redirects the browser here AND sends callback params as query
        callback_base = f"{base}/webhooks/touchpay/callback"

        return {
            "payment_token": payment_token,
            "merchant_id": self.merchant_id,
            "secure_code": self.secure_code,
            "merchant_website": self.merchant_website,
            "success_url": success_url or callback_base,
            "failed_url": failed_url or callback_base,
            "amount": int(amount),
            "city": customer_city,
            "email": customer_email,
            "first_name": customer_first_name,
            "last_name": customer_last_name,
            "phone": customer_phone,
            "sdk_script_url": settings.TOUCHPAY_SDK_URL,
        }

    async def verify_transaction(self, reference: str) -> Optional[dict]:
        """Verify a transaction status with TouchPay API."""
        if not self.api_url:
            logger.warning("TouchPay API URL not configured")
            return None

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.api_url}/verify",
                    json={
                        "merchantId": self.merchant_id,
                        "transactionRef": reference,
                    },
                    headers={"Content-Type": "application/json"},
                )
                if response.status_code == 200:
                    return response.json()
                logger.error(
                    "TouchPay verify failed: %s %s",
                    response.status_code,
                    response.text,
                )
                return None
        except httpx.HTTPError as e:
            logger.error("TouchPay verify error: %s", str(e))
            return None


touchpay_service = TouchPayService()
