"""
E-nkap (Maviance) Card/Aggregator Payment Service

Hosted-page payment flow: create an order server-side, redirect the
customer to E-nkap's checkout page, then confirm server-side.

  POST {token_url}          OAuth2 client_credentials (Basic auth)
  POST {base_url}/api/order Bearer token -> orderTransactionId + redirectUrl
  GET  {base_url}/api/order?txid=...   status polling (the ONLY truth)

Hard-won rules (from the GCL Express production integration):
  - Only paymentStatus decides anything. order.amountPaid mirrors the order
    total even when unpaid — never read it.
  - E-nkap webhooks are UNSIGNED. Treat them as wake-up signals only and
    re-verify via check_order_status before any state change.
  - WSO2 error code "900901" (or HTTP 401) = stale token: drop the cache,
    regenerate, replay once.
  - Some deployments need the /purchase/v1.2 prefix on /api/order, some
    don't: on 404, retry with the alternate form.
  - The hosted checkout session lasts 10 minutes regardless of expiryDate.

Provider config (payment_providers.config for code ENKAP):
  consumer_key    (encrypted)
  consumer_secret (encrypted)
  base_url        (plain, default https://api-v2.enkap.cm/purchase/v1.2)
  token_url       (plain, default https://api-v2.enkap.cm/token)
"""
import base64
import logging
import time
import uuid as uuid_mod
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.models.provider import ProviderConfig
from app.services.provider_service import provider_service
from app.services.touchpay_direct_service import TouchPayDirectError

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api-v2.enkap.cm/purchase/v1.2"
DEFAULT_TOKEN_URL = "https://api-v2.enkap.cm/token"

PAID_STATUSES = {"CONFIRMED", "PAID"}
FAILED_STATUSES = {"FAILED"}
CANCELLED_STATUSES = {"CANCELED", "CANCELLED"}
EXPIRED_STATUSES = {"EXPIRED"}
PENDING_STATUSES = {"CREATED", "PENDING", "PROCESSING"}


class EnkapError(TouchPayDirectError):
    """E-nkap API error. Subclasses TouchPayDirectError so the shared card
    initiation error handling applies unchanged."""


# In-process OAuth token cache: {cache_key: (token, expires_at_epoch)}
_token_cache: dict[str, tuple[str, float]] = {}


class EnkapService:

    async def _get_access_token(self, config: dict, force_refresh: bool = False) -> str:
        consumer_key = config.get("consumer_key") or ""
        consumer_secret = config.get("consumer_secret") or ""
        token_url = config.get("token_url") or DEFAULT_TOKEN_URL
        if not consumer_key or not consumer_secret:
            raise EnkapError("E-nkap consumer_key/consumer_secret not configured")

        cache_key = consumer_key[:12]
        if not force_refresh:
            cached = _token_cache.get(cache_key)
            if cached and cached[1] > time.time():
                return cached[0]

        basic = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    token_url,
                    data={"grant_type": "client_credentials"},
                    headers={"Authorization": f"Basic {basic}", "Accept": "application/json"},
                )
        except httpx.HTTPError as exc:
            raise EnkapError(f"E-nkap token request failed: {exc}") from exc

        if response.status_code != 200:
            logger.error(
                "E-nkap token failed: status=%s body=%s",
                response.status_code, response.text[:300],
            )
            raise EnkapError(f"E-nkap token failed (HTTP {response.status_code})")

        data = response.json()
        token = data.get("access_token")
        if not token:
            raise EnkapError("E-nkap token response missing access_token")
        # Cache with a 5-minute safety margin, as recommended.
        _token_cache[cache_key] = (token, time.time() + int(data.get("expires_in") or 3600) - 300)
        return token

    @staticmethod
    def _is_stale_token(response: httpx.Response) -> bool:
        if response.status_code == 401:
            return True
        try:
            return str(response.json().get("code")) == "900901"
        except Exception:
            return False

    async def _request_with_fallbacks(
        self,
        method: str,
        config: dict,
        path: str,
        *,
        json_payload: dict | None = None,
        params: dict | None = None,
    ) -> httpx.Response:
        """Send a request handling both base-URL forms and stale tokens."""
        base_url = (config.get("base_url") or DEFAULT_BASE_URL).rstrip("/")
        token = await self._get_access_token(config)

        async def send(url: str, tok: str) -> httpx.Response:
            async with httpx.AsyncClient(timeout=30.0) as client:
                return await client.request(
                    method, url,
                    json=json_payload, params=params,
                    headers={"Authorization": f"Bearer {tok}", "Accept": "application/json"},
                )

        try:
            response = await send(f"{base_url}{path}", token)
            if response.status_code == 404 and "/purchase/" not in base_url:
                response = await send(f"{base_url}/purchase/v1.2{path}", token)
            if self._is_stale_token(response):
                token = await self._get_access_token(config, force_refresh=True)
                response = await send(f"{base_url}{path}", token)
            return response
        except httpx.TimeoutException as exc:
            raise EnkapError(f"E-nkap request timed out: {exc}") from exc
        except httpx.HTTPError as exc:
            raise EnkapError(f"E-nkap HTTP error: {exc}") from exc

    @staticmethod
    def _format_phone(phone: str | None, country_prefix: str = "237") -> str:
        digits = "".join(c for c in (phone or "") if c.isdigit())
        if not digits:
            return ""
        if digits.startswith(country_prefix):
            return digits
        return f"{country_prefix}{digits}"

    async def create_order(
        self,
        provider: ProviderConfig,
        *,
        payment_reference: str,
        amount: int,
        currency: str,
        customer_name: str | None,
        customer_email: str | None,
        customer_phone: str | None,
        description: str | None,
        return_url: str,
        notification_url: str,
        country_phone_prefix: str = "237",
    ) -> dict:
        """Create an E-nkap payment order. Returns {txid, redirect_url, raw}."""
        config = provider_service.decrypted_config(provider)
        now = datetime.now(timezone.utc)

        payload: dict[str, Any] = {
            "currency": currency or "XAF",
            "customerName": customer_name or "Client",
            "description": description or f"Paiement {payment_reference}",
            "email": customer_email or "pay@ltcgroup.site",
            "expiryDate": (now + timedelta(hours=24)).isoformat(),
            "id": {"uuid": uuid_mod.uuid4().hex[:19] + str(int(now.timestamp())), "version": "V1.2"},
            "items": [{
                "itemId": payment_reference,
                "particulars": (description or "Paiement")[:100],
                "quantity": 1,
                "unitCost": amount,
                "subTotal": amount,
            }],
            "langKey": "fr",
            # Our PAY-xxx reference is unique per payment — reconciliation key.
            "merchantReference": payment_reference,
            "orderDate": now.isoformat(),
            "phoneNumber": self._format_phone(customer_phone, country_phone_prefix),
            "totalAmount": amount,
            "returnUrl": return_url,
            "notificationUrl": notification_url,
        }

        logger.info(
            "E-nkap: creating order ref=%s amount=%s %s",
            payment_reference, amount, currency,
        )
        response = await self._request_with_fallbacks(
            "POST", config, "/api/order", json_payload=payload,
        )
        try:
            data = response.json()
        except ValueError:
            data = None

        if response.status_code >= 300 or not isinstance(data, dict):
            logger.error(
                "E-nkap order failed: status=%s body=%s ref=%s",
                response.status_code, response.text[:400], payment_reference,
            )
            msg = (data or {}).get("message") or f"HTTP {response.status_code}"
            raise EnkapError(msg, status_code=response.status_code, raw_response=data)

        # Field names vary across API versions — read with fallbacks.
        txid = (
            data.get("txid") or data.get("orderTransactionId")
            or data.get("transactionId") or data.get("id")
        )
        redirect_url = data.get("paymentUrl") or data.get("redirectUrl")
        if not txid or not redirect_url:
            raise EnkapError(
                "E-nkap response missing txid/redirectUrl", raw_response=data,
            )
        if isinstance(txid, dict):  # some versions nest {"uuid": ...}
            txid = txid.get("uuid") or str(txid)

        logger.info("E-nkap: order created ref=%s txid=%s", payment_reference, txid)
        return {"txid": str(txid), "redirect_url": redirect_url, "raw": data}

    async def check_order_status(
        self,
        provider: ProviderConfig,
        *,
        txid: str | None = None,
        merchant_reference: str | None = None,
    ) -> dict:
        """Server-side status check — the only source of truth.

        Returns {payment_status, is_paid, is_failed, is_cancelled, is_expired,
        provider_name, raw}. Raises EnkapError on transport errors; returns
        payment_status=None when the order is unknown (404).
        """
        config = provider_service.decrypted_config(provider)
        params = {"txid": txid} if txid else {"orderMerchantId": merchant_reference}
        response = await self._request_with_fallbacks(
            "GET", config, "/api/order", params=params,
        )
        if response.status_code == 404:
            return {"payment_status": None, "is_paid": False, "raw": None}
        try:
            data = response.json()
        except ValueError:
            data = None
        if response.status_code >= 300 or not isinstance(data, dict):
            raise EnkapError(
                f"E-nkap status check failed (HTTP {response.status_code})",
                status_code=response.status_code, raw_response=data,
            )

        # NOTE: order.amountPaid mirrors the total even when unpaid.
        # paymentStatus is the only field allowed to drive decisions.
        payment_status = (data.get("paymentStatus") or "").upper() or None
        return {
            "payment_status": payment_status,
            "is_paid": payment_status in PAID_STATUSES,
            "is_failed": payment_status in FAILED_STATUSES,
            "is_cancelled": payment_status in CANCELLED_STATUSES,
            "is_expired": payment_status in EXPIRED_STATUSES,
            "provider_name": data.get("paymentProviderName"),
            "raw": data,
        }


enkap_service = EnkapService()
