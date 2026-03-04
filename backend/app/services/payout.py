"""
Payout API Client (AccountPE/Swychr)
Disburse funds to Mobile Money across African countries.

Auth: POST /admin/auth → JWT token (reuses swychr credentials)
Methods: POST /payout_methods → available payout methods per country
Rate: POST /pusd_to_fiat_rate → exchange rate for payout
Create: POST /create_transaction → initiate payout
Status: POST /transaction_status → check payout status
"""

import asyncio
import time
from datetime import datetime as dt
from typing import Any, Optional

import httpx

from app.config import settings
from app.utils.logging_config import get_logger

logger = get_logger(__name__)


_MAX_RETRIES = 2
_RETRY_BACKOFF_BASE = 0.5  # seconds; retries at 0.5s, 1.0s
_RETRYABLE_STATUS_CODES = {502, 503, 504}


class PayoutError(Exception):
    """Payout API error with user-friendly message"""

    def __init__(self, message: str, code: Optional[int] = None):
        self.message = message
        self.code = code
        super().__init__(message)


class PayoutClient:
    BASE_URL = "https://api.accountpe.com/api/payout"

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
                raise PayoutError(f"Payout login failed: {data}")

            # Parse expiry from message field (same format as AccountPE)
            try:
                expiry_str = data.get("message", "")
                expiry_dt = dt.strptime(expiry_str, "%m-%d-%Y %H:%M")
                self._token_expires_at = expiry_dt.timestamp()
            except (ValueError, TypeError):
                self._token_expires_at = time.time() + 3600

            logger.info("Payout JWT token refreshed")
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
                        f"Payout retryable HTTP {response.status_code} on {url} "
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
                        f"Payout transient error on {url} "
                        f"(attempt {attempt + 1}/{_MAX_RETRIES + 1}), retrying in {wait:.1f}s: {exc}"
                    )
                    await asyncio.sleep(wait)
                else:
                    raise
        raise last_exc  # type: ignore[misc]

    def _check_response(self, data: Any, default_error: str) -> None:
        """Raise PayoutError if AccountPE returned a business error."""
        if isinstance(data, dict) and data.get("status") in (400, 401, 403, 404, 500):
            msg = data.get("message", default_error)
            raise PayoutError(msg, data.get("status"))

    async def get_payout_methods(self, country_code: str) -> dict[str, Any]:
        """Get available payout methods for a country."""
        headers = await self._get_headers()

        response = await self._post_with_retry(
            self._url("/payout_methods"),
            json={"country_code": country_code.upper()},
            headers=headers,
        )

        data = response.json()
        self._check_response(data, "Erreur lors de la récupération des méthodes de paiement")

        if not response.is_success:
            raise PayoutError(f"Erreur Payout: HTTP {response.status_code}")

        return data

    async def get_exchange_rate(self, country_code: str, amount: float) -> dict[str, Any]:
        """Get pUSD to fiat exchange rate for payout."""
        headers = await self._get_headers()

        response = await self._post_with_retry(
            self._url("/pusd_to_fiat_rate"),
            json={"country_code": country_code.upper(), "amount": amount},
            headers=headers,
        )

        data = response.json()
        self._check_response(data, "Erreur lors de la récupération du taux de change")

        if not response.is_success:
            raise PayoutError(f"Erreur Payout: HTTP {response.status_code}")

        return data

    async def create_transaction(
        self,
        country_code: str,
        beneficiary_name: str,
        mobile_no: str,
        amount: float,
        transaction_id: str,
        payment_method: str = "mobile_money",
        remarks: str | None = None,
    ) -> dict[str, Any]:
        """Create a payout transaction to disburse funds.

        Args:
            country_code: ISO country code (e.g. "CM")
            beneficiary_name: Recipient's full name
            mobile_no: Recipient's phone in E.164 format (e.g. "237670112233")
            amount: Amount in local currency
            transaction_id: Unique transaction reference
            payment_method: Payment method (default "mobile_money")
            remarks: Optional description

        Returns: Provider response with transaction details
        """
        headers = await self._get_headers()

        payload: dict[str, Any] = {
            "country_code": country_code.upper(),
            "beneficiary_name": beneficiary_name,
            "mobile_no": mobile_no,
            "amount": amount,
            "transaction_id": transaction_id,
            "payment_method": payment_method,
        }
        if remarks:
            payload["remarks"] = remarks

        response = await self._post_with_retry(
            self._url("/create_transaction"),
            json=payload,
            headers=headers,
        )

        data = response.json()
        self._check_response(data, "Erreur lors de la création du paiement")

        if not response.is_success:
            raise PayoutError(f"Erreur Payout: HTTP {response.status_code}")

        logger.info(
            f"Payout transaction created: tx={transaction_id}, "
            f"country={country_code}, amount={amount}, phone={mobile_no}"
        )

        return data

    async def get_transaction_status(self, transaction_id: str) -> dict[str, Any]:
        """Check payout transaction status.

        Returns provider response with status field.
        """
        headers = await self._get_headers()

        response = await self._post_with_retry(
            self._url("/transaction_status"),
            json={"transaction_id": transaction_id},
            headers=headers,
        )

        data = response.json()
        self._check_response(data, "Erreur de vérification du statut de paiement")

        if not response.is_success:
            raise PayoutError(f"Erreur Payout: HTTP {response.status_code}")

        return data

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()


# Singleton instance
payout_client = PayoutClient()
