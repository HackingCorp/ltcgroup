"""
Payin API Client (AccountPE/Swychr)
Payment links for Mobile Money across 18 African countries.

Auth: POST /admin/auth → JWT token (reuses swychr credentials)
Create: POST /create_payment_links → {data: {id, payment_link, transaction_id}}
Status: POST /payment_link_status → {data: {data: {attributes: {status, ...}}}}

Redirect behavior (hosted UI):
  - Success + callback_url set → redirects to callback_url
  - Success + no callback_url  → redirects to https://app.swychrconnect.com/payment_success
  - Failure                    → redirects to https://app.swychrconnect.com/payment_failed
"""

import asyncio
import time
import uuid
from datetime import datetime as dt
from decimal import Decimal
from typing import Any, Optional

import httpx

from app.config import settings
from app.utils.logging_config import get_logger

logger = get_logger(__name__)

# 18 supported countries — provider_fee is what Payin/Swychr charges per country
PAYIN_COUNTRIES: dict[str, dict[str, Any]] = {
    "CM": {"name": "Cameroon", "provider_fee": 2.50, "currency": "XAF", "phone_code": "237"},
    "KE": {"name": "Kenya", "provider_fee": 1.50, "currency": "KES", "phone_code": "254"},
    "GA": {"name": "Gabon", "provider_fee": 3.00, "currency": "XAF", "phone_code": "241"},
    "CD": {"name": "Congo DRC", "provider_fee": 3.50, "currency": "CDF", "phone_code": "243"},
    "SN": {"name": "Senegal", "provider_fee": 2.50, "currency": "XOF", "phone_code": "221"},
    "CI": {"name": "Cote D'Ivoire", "provider_fee": 3.00, "currency": "XOF", "phone_code": "225"},
    "BF": {"name": "Burkina Faso", "provider_fee": 3.00, "currency": "XOF", "phone_code": "226"},
    "ML": {"name": "Mali", "provider_fee": 3.00, "currency": "XOF", "phone_code": "223"},
    "BJ": {"name": "Benin", "provider_fee": 3.00, "currency": "XOF", "phone_code": "229"},
    "TG": {"name": "Togo", "provider_fee": 3.00, "currency": "XOF", "phone_code": "228"},
    "TZ": {"name": "Tanzania", "provider_fee": 3.00, "currency": "TZS", "phone_code": "255"},
    "UG": {"name": "Uganda", "provider_fee": 3.00, "currency": "UGX", "phone_code": "256"},
    "NG": {"name": "Nigeria", "provider_fee": 2.00, "currency": "NGN", "phone_code": "234"},
    "NE": {"name": "Niger", "provider_fee": 3.50, "currency": "XOF", "phone_code": "227"},
    "RW": {"name": "Rwanda", "provider_fee": 3.75, "currency": "RWF", "phone_code": "250"},
    "CG": {"name": "Congo Brazzaville", "provider_fee": 4.50, "currency": "XAF", "phone_code": "242"},
    "GN": {"name": "Guinea Conakry", "provider_fee": 3.75, "currency": "GNF", "phone_code": "224"},
    "GH": {"name": "Ghana", "provider_fee": 2.50, "currency": "GHS", "phone_code": "233"},
}

# LTC platform margin added on top of provider fees
LTC_MARGIN = Decimal("0.005")  # 0.5%


def get_country_fee_rate(country_code: str) -> Decimal:
    """Get the total fee rate for a country = provider_fee + 0.5% LTC margin.

    Example: Cameroon = 2.50% provider + 0.50% LTC = 3.00% → returns Decimal('0.030')
    """
    country = PAYIN_COUNTRIES.get(country_code.upper())
    if not country:
        raise ValueError(f"Unsupported country: {country_code}")
    provider_rate = Decimal(str(country["provider_fee"])) / 100
    return provider_rate + LTC_MARGIN


def get_country_currency(country_code: str) -> str:
    """Get the local currency for a country code."""
    country = PAYIN_COUNTRIES.get(country_code.upper())
    if not country:
        raise ValueError(f"Unsupported country: {country_code}")
    return country["currency"]


def format_phone_e164(phone: str, country_code: str) -> str:
    """Format phone to E.164 (e.g. 670112233 → 237670112233 for CM)."""
    cleaned = "".join(c for c in phone if c.isdigit())
    country = PAYIN_COUNTRIES.get(country_code.upper())
    if not country:
        return cleaned
    prefix = country["phone_code"]
    # Already has country prefix → return as-is
    if cleaned.startswith(prefix):
        return cleaned
    # Remove leading 0 if present (e.g. 0670... → 670...)
    if cleaned.startswith("0"):
        cleaned = cleaned[1:]
    return f"{prefix}{cleaned}"


class PayinError(Exception):
    """Payin API error with user-friendly message"""

    def __init__(self, message: str, code: Optional[int] = None):
        self.message = message
        self.code = code
        super().__init__(message)


_MAX_RETRIES = 2
_RETRY_BACKOFF_BASE = 0.5  # seconds; retries at 0.5s, 1.0s
_RETRYABLE_STATUS_CODES = {502, 503, 504}


class PayinClient:
    BASE_URL = "https://api.accountpe.com/api/payin"

    def __init__(self):
        self.email = settings.swychr_email
        self.password = settings.swychr_password
        self._token: str | None = None
        self._token_expires_at: float = 0
        self._token_lock = asyncio.Lock()
        self.client = httpx.AsyncClient(timeout=30.0)

    def _url(self, path: str) -> str:
        """Build full URL manually (avoid httpx base_url issues)."""
        base = self.BASE_URL.rstrip("/")
        path = path if path.startswith("/") else f"/{path}"
        return f"{base}{path}"

    async def _ensure_token(self) -> str:
        """Authenticate with /admin/auth and cache the JWT token."""
        if self._token and time.time() < self._token_expires_at - 300:
            return self._token

        async with self._token_lock:
            if self._token and time.time() < self._token_expires_at - 300:
                return self._token

            response = await self.client.post(
                self._url("/admin/auth"),
                json={"email": self.email, "password": self.password},
            )
            response.raise_for_status()
            data = response.json()

            self._token = data.get("token", "")
            if not self._token:
                raise PayinError(f"Payin login failed: {data}")

            # Parse expiry from message field (same format as AccountPE)
            try:
                expiry_str = data.get("message", "")
                expiry_dt = dt.strptime(expiry_str, "%m-%d-%Y %H:%M")
                self._token_expires_at = expiry_dt.timestamp()
            except (ValueError, TypeError):
                self._token_expires_at = time.time() + 3600

            logger.info("Payin JWT token refreshed")
            return self._token

    async def _get_headers(self) -> dict[str, str]:
        token = await self._ensure_token()
        return {"Authorization": f"Bearer {token}"}

    async def _post_with_retry(
        self, url: str, *, json: dict, headers: dict
    ) -> httpx.Response:
        """POST with retry on transient errors (timeout, 502, 503, 504)."""
        last_exc: Exception | None = None
        for attempt in range(_MAX_RETRIES + 1):
            try:
                response = await self.client.post(url, json=json, headers=headers)
                if response.status_code in _RETRYABLE_STATUS_CODES and attempt < _MAX_RETRIES:
                    wait = _RETRY_BACKOFF_BASE * (2 ** attempt)
                    logger.warning(
                        f"Payin retryable HTTP {response.status_code} on {url} "
                        f"(attempt {attempt + 1}/{_MAX_RETRIES + 1}), retrying in {wait:.1f}s"
                    )
                    await asyncio.sleep(wait)
                    continue
                return response
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout) as exc:
                last_exc = exc
                if attempt < _MAX_RETRIES:
                    wait = _RETRY_BACKOFF_BASE * (2 ** attempt)
                    logger.warning(
                        f"Payin transient error on {url} "
                        f"(attempt {attempt + 1}/{_MAX_RETRIES + 1}), retrying in {wait:.1f}s: {exc}"
                    )
                    await asyncio.sleep(wait)
                else:
                    raise
        raise last_exc  # type: ignore[misc]

    async def create_payment_link(
        self,
        amount: float,
        country_code: str,
        order_ref: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        description: str = "",
    ) -> dict[str, Any]:
        """Create a Payin payment link.

        Amount should already include all fees (provider + LTC margin).
        pass_digital_charge=false because we calculate fees ourselves.

        Returns: {success, payment_link_id, payment_link, transaction_id, amount}
        """
        country = PAYIN_COUNTRIES.get(country_code.upper())
        if not country:
            raise PayinError(f"Pays non supporté: {country_code}")

        if not customer_phone:
            raise PayinError("Le numéro de téléphone est requis")

        total_amount = int(round(amount))

        headers = await self._get_headers()
        # Idempotency-Key to prevent duplicate link creation on retries (spec §create_payment_links)
        headers["Idempotency-Key"] = f"{order_ref}-{uuid.uuid4().hex[:8]}"

        payload: dict[str, Any] = {
            "amount": total_amount,
            "country_code": country_code.upper(),
            "currency": country["currency"],
            "transaction_id": order_ref,
            "name": customer_name,
            "email": customer_email,
            "mobile": format_phone_e164(customer_phone, country_code),
            "description": description or f"Paiement LTC - {order_ref}",
            "pass_digital_charge": False,
        }

        # Only include callback_url if actually configured.
        # When omitted, hosted UI redirects to app.swychrconnect.com/payment_success|payment_failed
        # When set, hosted UI redirects to this URL instead (also receives webhook POSTs).
        callback_url = settings.payin_webhook_url
        if callback_url:
            payload["callback_url"] = callback_url

        response = await self._post_with_retry(
            self._url("/create_payment_links"),
            json=payload,
            headers=headers,
        )

        data = response.json()

        # AccountPE returns HTTP 200 with status field for business errors
        if isinstance(data, dict) and data.get("status") in (400, 401, 403, 404, 500):
            msg = data.get("message", "Erreur lors de la création du lien de paiement")
            raise PayinError(msg, data.get("status"))

        if not response.is_success:
            raise PayinError(f"Erreur Payin: HTTP {response.status_code}")

        link_data = data.get("data", {})
        payment_link = link_data.get("payment_link", "")
        if not payment_link:
            raise PayinError("Le lien de paiement n'a pas été généré")

        return {
            "success": True,
            "payment_link_id": link_data.get("id"),
            "payment_link": payment_link,
            "transaction_id": link_data.get("transaction_id"),
            "amount": total_amount,
        }

    async def get_payment_status(self, transaction_id: str) -> dict[str, Any]:
        """Check payment link status.

        Status codes: 0=PENDING, 1=COMPLETED, 2=FAILED, 3=REFUNDED
        """
        headers = await self._get_headers()

        response = await self._post_with_retry(
            self._url("/payment_link_status"),
            json={"transaction_id": transaction_id},
            headers=headers,
        )

        data = response.json()

        if isinstance(data, dict) and data.get("status") in (400, 401, 403, 404, 500):
            msg = data.get("message", "Erreur de vérification du statut")
            raise PayinError(msg, data.get("status"))

        if not response.is_success:
            raise PayinError(f"Erreur Payin: HTTP {response.status_code}")

        # Navigate nested response: data.data.attributes
        outer_data = data.get("data", {})
        inner_data = outer_data.get("data", {})
        attributes = inner_data.get("attributes", {})

        status_code = attributes.get("status")
        status_map = {
            0: "PENDING",
            1: "COMPLETED",
            2: "FAILED",
            3: "REFUNDED",
        }

        return {
            "status": status_map.get(status_code, "UNKNOWN"),
            "status_code": status_code,
            "amount": attributes.get("amount"),
            "currency": attributes.get("currency"),
            "transaction_id": transaction_id,
        }

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()


# Singleton instance
payin_client = PayinClient()
