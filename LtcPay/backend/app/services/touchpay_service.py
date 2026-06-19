"""
LtcPay - TouchPay SDK Integration Service

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

Credentials are loaded per-country from the DB via country_service.
"""
import logging
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.country_service import country_service

logger = logging.getLogger(__name__)


class TouchPayService:
    """Service for interacting with the TouchPay payment gateway.

    Credentials are loaded per-country from the database.
    """

    async def get_sdk_config(
        self,
        db: AsyncSession,
        country_code: str,
        payment_token: str,
        amount: float,
        customer_email: str = "",
        customer_first_name: str = "",
        customer_last_name: str = "",
        customer_phone: str = "",
        success_url: Optional[str] = None,
        failed_url: Optional[str] = None,
    ) -> dict:
        """Build the config dict passed to the checkout.html template.

        Loads merchant_id, secure_code, sdk_url, and default_city from the
        country's DB record.
        """
        creds = await country_service.get_decrypted_credentials(db, country_code)
        country = await country_service.get_active_country(db, country_code)

        base = settings.webhook_base_url.rstrip("/")
        callback_base = f"{base}/webhooks/touchpay/callback"

        return {
            "payment_token": payment_token,
            "merchant_id": creds["merchant_id"],
            "secure_code": creds["secure_code"],
            "merchant_website": creds["merchant_website"],
            "success_url": success_url or callback_base,
            "failed_url": failed_url or callback_base,
            "amount": int(amount),
            "city": country.default_city or "Douala",
            "email": customer_email,
            "first_name": customer_first_name,
            "last_name": customer_last_name,
            "phone": customer_phone,
            "sdk_script_url": creds["sdk_url"],
        }

    async def verify_transaction(
        self, db: AsyncSession, country_code: str, reference: str,
    ) -> Optional[dict]:
        """Verify a transaction status with TouchPay API."""
        try:
            creds = await country_service.get_decrypted_credentials(db, country_code)
        except ValueError:
            logger.warning("Cannot verify transaction: country '%s' not available", country_code)
            return None

        api_url = settings.touchpay_api_url
        if not api_url:
            logger.warning("TouchPay API URL not configured")
            return None

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{api_url}/verify",
                    json={
                        "merchantId": creds["merchant_id"],
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
