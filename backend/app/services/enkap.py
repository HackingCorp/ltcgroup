"""
E-nkap Payment Integration
For multi-channel payments (cards + mobile money)

Flow: POST /token → POST /order → redirect to paymentUrl → webhook
"""

import asyncio
import hashlib
import hmac
import time
from typing import Optional, Dict, Any, Literal
import base64

import httpx

from app.config import settings

class EnkapError(Exception):
    """E-nkap payment error"""

    pass


def format_phone_for_enkap(phone: str) -> str:
    """
    Format phone number for E-nkap (with country code)
    E-nkap expects: 237XXXXXXXXX (12 digits with 237 prefix)
    """
    # Remove all non-digit characters
    cleaned = "".join(c for c in phone if c.isdigit())

    # Add country code if not present
    if cleaned.startswith("6") or cleaned.startswith("2"):
        if not cleaned.startswith("237"):
            cleaned = "237" + cleaned

    # Validate length (should be 12 digits: 237 + 9 digits)
    if len(cleaned) != 12:
        raise ValueError("Invalid phone number format for E-nkap")

    return cleaned


class EnkapClient:
    def __init__(self):
        self.base_url = settings.enkap_api_url
        self.consumer_key = settings.enkap_consumer_key
        self.consumer_secret = settings.enkap_consumer_secret
        self._token_lock = asyncio.Lock()
        self._cached_token: Optional[Dict[str, Any]] = None
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=30.0)

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()

    async def get_access_token(self) -> str:
        """Get OAuth2 access token (with caching)"""
        # Check cache
        if self._cached_token and time.time() < self._cached_token["expires_at"]:
            return self._cached_token["token"]

        async with self._token_lock:
            # Double-check after acquiring lock
            if self._cached_token and time.time() < self._cached_token["expires_at"]:
                return self._cached_token["token"]

            url = "/token"

            # Basic Auth header
            credentials = base64.b64encode(
                f"{self.consumer_key}:{self.consumer_secret}".encode("utf-8")
            ).decode("utf-8")

            headers = {
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            }

            response = await self.client.post(url, headers=headers, data={"grant_type": "client_credentials"})

            if not response.is_success:
                error_text = response.text
                raise EnkapError(f"E-nkap authentication failed: {error_text}")

            data = response.json()

            # Cache token (with 5 minute buffer before expiry)
            self._cached_token = {
                "token": data["access_token"],
                "expires_at": time.time() + data["expires_in"] - 300,
            }

            return data["access_token"]

    async def _invalidate_token(self):
        """Invalidate cached token under lock."""
        async with self._token_lock:
            self._cached_token = None

    async def create_order(
        self,
        amount: float,
        merchant_reference: str,
        description: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        return_url: str,
        notification_url: str,
        currency: str = "XAF",
    ) -> Dict[str, Any]:
        """Create payment order"""
        token = await self.get_access_token()

        url = "/api/order"

        body = {
            "merchant_reference": merchant_reference,
            "amount": int(amount),
            "currency": currency,
            "description": description,
            "customer": {
                "name": customer_name,
                "email": customer_email,
                "phone": format_phone_for_enkap(customer_phone),
            },
            "return_url": return_url,
            "notification_url": notification_url,
            "lang": "fr",
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        response = await self.client.post(url, json=body, headers=headers)

        # If 401, refresh token and retry once
        if response.status_code == 401:
            await self._invalidate_token()
            token = await self.get_access_token()
            headers["Authorization"] = f"Bearer {token}"
            response = await self.client.post(url, json=body, headers=headers)

        if not response.is_success:
            error_text = response.text
            raise EnkapError(f"E-nkap createOrder failed: {error_text}")

        return response.json()

    async def get_order_status(self, order_id: str) -> Dict[str, Any]:
        """Get order status"""
        token = await self.get_access_token()

        url = f"/api/order/{order_id}/status"

        headers = {
            "Authorization": f"Bearer {token}",
        }

        response = await self.client.get(url, headers=headers)

        # If 401, refresh token and retry once
        if response.status_code == 401:
            await self._invalidate_token()
            token = await self.get_access_token()
            headers["Authorization"] = f"Bearer {token}"
            response = await self.client.get(url, headers=headers)

        if not response.is_success:
            error_text = response.text
            raise EnkapError(f"E-nkap getOrderStatus failed: {error_text}")

        return response.json()

    async def initiate_payment(
        self,
        amount: float,
        order_ref: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        description: Optional[str] = None,
        base_url: str = "https://ltcgroup.site",
    ) -> Dict[str, Any]:
        """Complete E-nkap payment flow - initiates payment and returns redirect URL"""
        try:
            order = await self.create_order(
                amount=amount,
                description=description or f"Commande LTC Finance - {order_ref}",
                merchant_reference=order_ref,
                customer_name=customer_name,
                customer_email=customer_email,
                customer_phone=customer_phone,
                return_url=f"{base_url}/services/solutions-financieres/payment/callback",
                notification_url=f"{base_url}/api/v1/payments/webhook/enkap",
            )

            if not order.get("redirect_url"):
                raise EnkapError("No payment URL returned")

            return {
                "success": True,
                "order_id": order.get("order_id"),
                "transaction_id": order.get("order_transaction_id"),
                "payment_url": order.get("redirect_url"),
            }
        except EnkapError:
            raise
        except Exception as e:
            raise EnkapError(f"Payment initiation failed: {str(e)}")


def verify_webhook_signature(payload: str, signature: str) -> bool:
    """
    Verify E-nkap webhook signature
    The signature is typically HMAC-SHA256 of the payload
    """
    expected_signature = hmac.new(
        settings.enkap_consumer_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)


# Singleton instance
enkap_client = EnkapClient()
