"""
AccountPE vCard V2 API Client (Swychr)

Base URL: https://api.accountpe.com/api/card/sandbox
Auth: POST /admin/login with email/password → JWT Bearer token

All endpoints use POST with JSON body.
"""

import asyncio
import httpx
import time
from datetime import datetime as dt
from app.config import settings
from app.utils.logging_config import get_logger
from app.utils.cache import (
    get_cached_card_details,
    set_cached_card_details,
    get_cached_card_transactions,
    set_cached_card_transactions,
    invalidate_card_cache,
)

logger = get_logger(__name__)

_MAX_RETRIES = 2
_RETRY_BACKOFF_BASE = 0.5  # seconds; retries at 0.5s, 1.0s


class AccountPEError(Exception):
    """Business-logic error returned by AccountPE (HTTP 200 with non-200 status field)."""

    def __init__(self, message: str, status_code: int = 400, raw_response: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.raw_response = raw_response or {}


class AccountPEClient:
    def __init__(self):
        self.base_url = settings.accountpe_api_url
        self.email = settings.swychr_email
        self.password = settings.swychr_password
        self._token: str | None = None
        self._token_expires_at: float = 0
        self._token_lock = asyncio.Lock()
        self.client = httpx.AsyncClient(
            timeout=30.0,
        )
        self._validate_credentials()

    async def _ensure_token(self) -> str:
        """Authenticate with /admin/login and cache the JWT token."""
        # Reuse cached token if still valid (refresh 5 min before expiry)
        if self._token and time.time() < self._token_expires_at - 300:
            return self._token

        async with self._token_lock:
            # Double-check after acquiring lock
            if self._token and time.time() < self._token_expires_at - 300:
                return self._token

            response = await self.client.post(
                self._url("/admin/login"),
                json={"email": self.email, "password": self.password},
            )
            response.raise_for_status()
            data = response.json()

            self._token = data.get("token", "")
            if not self._token:
                raise AccountPEError(f"AccountPE login failed: {data}")

            # Parse expiry from message field (format: "MM-DD-YYYY HH:MM")
            try:
                expiry_str = data.get("message", "")
                expiry_dt = dt.strptime(expiry_str, "%m-%d-%Y %H:%M")
                self._token_expires_at = expiry_dt.timestamp()
            except (ValueError, TypeError):
                # Fallback: 1 hour from now
                self._token_expires_at = time.time() + 3600

            logger.info("AccountPE JWT token refreshed")
            return self._token

    async def _get_headers(self) -> dict:
        token = await self._ensure_token()
        return {
            "Authorization": f"Bearer {token}",
        }

    def _url(self, path: str) -> str:
        """Build full URL. httpx base_url with leading / replaces the path,
        so we build the URL manually."""
        base = self.base_url.rstrip("/")
        return f"{base}/{path.lstrip('/')}"

    def _validate_credentials(self):
        """Verify AccountPE credentials are configured at startup."""
        if not self.email or not self.password:
            logger.warning(
                "AccountPE credentials not configured (swychr_email / swychr_password). "
                "Card operations will fail until credentials are set."
            )

    async def _post(
        self, path: str, payload: dict, *, raise_on_business_error: bool = True
    ) -> dict:
        """POST helper with auto-auth, retry on 401, transient-error retry, and business error checking.

        Args:
            path: API endpoint path.
            payload: JSON body.
            raise_on_business_error: If True (default), raise AccountPEError when
                the response JSON contains a non-200 ``status`` field.  Set to False
                when the caller needs to inspect the raw response (e.g. to handle
                "Email id already exist").
        """
        url = self._url(path)
        last_exc: Exception | None = None

        for attempt in range(_MAX_RETRIES + 1):
            try:
                headers = await self._get_headers()
                response = await self.client.post(url, json=payload, headers=headers)

                # If 401, invalidate token under lock and retry once
                if response.status_code == 401:
                    async with self._token_lock:
                        self._token = None
                        self._token_expires_at = 0
                    headers = await self._get_headers()
                    response = await self.client.post(url, json=payload, headers=headers)

                response.raise_for_status()
                data = response.json()

                # Check for AccountPE business errors (HTTP 200 but status != 200)
                ape_status = data.get("status", 200)
                if isinstance(ape_status, str):
                    try:
                        ape_status = int(ape_status)
                    except (ValueError, TypeError):
                        ape_status = 200
                if ape_status != 200 and raise_on_business_error:
                    msg = data.get("message", "AccountPE business error")
                    logger.warning(f"AccountPE business error on {path}: {msg} (status={ape_status})")
                    raise AccountPEError(msg, status_code=ape_status, raw_response=data)

                return data

            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout) as exc:
                last_exc = exc
                if attempt < _MAX_RETRIES:
                    wait = _RETRY_BACKOFF_BASE * (2 ** attempt)
                    logger.warning(
                        f"AccountPE transient error on {path} (attempt {attempt + 1}/{_MAX_RETRIES + 1}), "
                        f"retrying in {wait:.1f}s: {exc}"
                    )
                    await asyncio.sleep(wait)
                else:
                    raise

        # Should not reach here, but satisfy the type checker
        raise last_exc  # type: ignore[misc]

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()

    # ── Users ──

    async def create_user(self, email: str, name: str, country: str = "CM") -> dict:
        """Create a user on AccountPE platform.

        Note: Uses raise_on_business_error=False because callers need to inspect
        the response to handle "Email id already exist" gracefully.
        """
        return await self._post("/create_user", {
            "email": email,
            "name": name,
            "country": country,
        }, raise_on_business_error=False)

    async def update_user(
        self,
        user_id: str,
        dob: str,
        mobile: str,
        mobile_code: str,
        gender: str,
        address: str,
        street: str,
        city: str,
        postal_code: str,
        country: str,
        country_iso_code: str,
        id_proof_type: str,
        id_proof_no: str,
        id_proof_expiry_date: str,
        id_proof_url_list: list[str],
        livelyness_img: str,
    ) -> dict:
        """Update user with KYC documents."""
        return await self._post("/update_user", {
            "user_id": user_id,
            "dob": dob,
            "mobile": mobile,
            "mobile_code": mobile_code,
            "gender": gender,
            "address": address,
            "street": street,
            "city": city,
            "postal_code": postal_code,
            "country": country,
            "country_iso_code": country_iso_code,
            "id_proof_type": id_proof_type,
            "id_proof_no": id_proof_no,
            "id_proof_expiry_date": id_proof_expiry_date,
            "id_proof_url_list": id_proof_url_list,
            "livelyness_img": livelyness_img,
        })

    async def create_full_user(self, user_data: dict) -> dict:
        """Create user with full KYC in one call."""
        return await self._post("/create_full_user", user_data)

    async def get_user(self, user_id: str) -> dict:
        """Get user details from AccountPE."""
        return await self._post("/get_user", {"user_id": user_id})

    async def check_user_validity(self, user_id: str) -> dict:
        """Check if a user is valid for card operations."""
        return await self._post("/check_user_validity", {"user_id": user_id})

    async def list_users(self, page: int = 1, page_size: int = 20) -> dict:
        """List all users."""
        return await self._post("/users", {"page": page, "page_size": page_size})

    async def find_user_by_email(self, email: str) -> str | None:
        """Find AccountPE user_id by email. Paginates through users (max 20 pages)."""
        page = 1
        while True:
            if page > 20:
                return None
            resp = await self.list_users(page=page, page_size=50)
            users = resp.get("data", [])
            if not users:
                return None
            for user in users:
                if user.get("email", "").lower() == email.lower():
                    return user.get("id")
            page += 1

    # ── Cards ──

    async def purchase_card(
        self, user_id: str, card_type: str, amount: float
    ) -> dict:
        """
        Purchase a virtual card.
        POST /vcard_purchase_card {user_id, card_type, amount}
        Returns: {card_id, status, message}
        """
        return await self._post("/vcard_purchase_card", {
            "user_id": user_id,
            "card_type": card_type,
            "amount": amount,
        })

    async def purchase_credit_card(
        self, user_id: str, card_type: str, amount: float
    ) -> dict:
        """
        Purchase a premium virtual credit card.
        POST /vcard_purchase_credit_card {user_id, card_type, amount}
        """
        return await self._post("/vcard_purchase_credit_card", {
            "user_id": user_id,
            "card_type": card_type,
            "amount": amount,
        })

    async def purchase_contactless_card(
        self,
        user_id: str,
        card_type: str,
        amount: float,
        daily_limit: float | None = None,
        transaction_limit: float | None = None,
    ) -> dict:
        """
        Purchase a contactless virtual card with optional spending limits.

        Args:
            user_id: User ID
            card_type: Card type (VISA, MASTERCARD)
            amount: Initial balance
            daily_limit: Total maximum amount for all transactions per day (USD)
            transaction_limit: Maximum amount per single transaction (USD)
        """
        payload: dict = {
            "user_id": user_id,
            "card_type": card_type,
            "amount": amount,
        }
        if daily_limit is not None:
            payload["daily_limit"] = daily_limit
        if transaction_limit is not None:
            payload["transaction_limit"] = transaction_limit
        return await self._post("/contactless_purchase_card", payload)

    async def get_all_cards(self, user_id: str) -> dict:
        """
        Get all virtual cards for a user.
        POST /get_all_virtual_card {user_id}
        Returns: {card_list: [VCard...]}
        """
        return await self._post("/get_all_virtual_card", {"user_id": user_id})

    async def get_card_details(self, card_id: str) -> dict:
        """
        Get virtual card details (cached in Redis for 30s).
        POST /get_virtual_card_details {card_id}
        """
        cached = await get_cached_card_details(card_id)
        if cached is not None:
            return cached
        data = await self._post("/get_virtual_card_details", {"card_id": card_id})
        await set_cached_card_details(card_id, data)
        return data

    async def recharge_card(self, card_id: str, amount: float) -> dict:
        """
        Recharge/topup a virtual card.
        POST /recharge_vcard {card_id, amount}
        Returns: {vcard: VCard, status, message}
        """
        data = await self._post("/recharge_vcard", {
            "card_id": card_id,
            "amount": amount,
        })
        await invalidate_card_cache(card_id)
        return data

    async def withdraw_fund(self, card_id: str, amount: float) -> dict:
        """
        Withdraw funds from a virtual card.
        POST /withdraw_fund {card_id, amount}
        Returns: {vcard: VCard, status, message}
        """
        data = await self._post("/withdraw_fund", {
            "card_id": card_id,
            "amount": amount,
        })
        await invalidate_card_cache(card_id)
        return data

    async def freeze_card(self, card_id: str) -> dict:
        """
        Freeze a virtual card.
        POST /freeze_card {card_id}
        Returns: {vcard: VCard, status, message}
        """
        data = await self._post("/freeze_card", {"card_id": card_id})
        await invalidate_card_cache(card_id)
        return data

    async def unfreeze_card(self, card_id: str) -> dict:
        """POST /unfreeze_card {card_id}"""
        data = await self._post("/unfreeze_card", {"card_id": card_id})
        await invalidate_card_cache(card_id)
        return data

    async def block_card(self, card_id: str) -> dict:
        """POST /block_card {card_id}"""
        data = await self._post("/block_card", {"card_id": card_id})
        await invalidate_card_cache(card_id)
        return data

    async def replace_card(self, card_id: str) -> dict:
        """POST /replace_card {card_id}"""
        data = await self._post("/replace_card", {"card_id": card_id})
        await invalidate_card_cache(card_id)
        return data

    async def replace_terminated_card(self, card_id: str) -> dict:
        """POST /terminated_card_replacement {card_id}"""
        data = await self._post("/terminated_card_replacement", {"card_id": card_id})
        await invalidate_card_cache(card_id)
        return data

    async def get_card_transactions(self, card_id: str) -> dict:
        """
        Get card transaction history (cached in Redis for 30s).
        POST /get_card_transactions {card_id}
        Returns: {transactions: [Transaction...]}
        """
        cached = await get_cached_card_transactions(card_id)
        if cached is not None:
            return cached
        data = await self._post("/get_card_transactions", {"card_id": card_id})
        await set_cached_card_transactions(card_id, data)
        return data

    async def update_card_limits(
        self, card_id: str, daily_limit: float, transaction_limit: float
    ) -> dict:
        """
        Update card spending limits.
        POST /card_limit_update {card_id, daily_limit, transaction_limit}

        Args:
            card_id: Card ID
            daily_limit: Total maximum amount for all transactions per day (USD)
            transaction_limit: Maximum amount per single transaction (USD)

        Returns: {vcard: VCard, status, message}
        """
        data = await self._post("/card_limit_update", {
            "card_id": card_id,
            "daily_limit": daily_limit,
            "transaction_limit": transaction_limit,
        })
        await invalidate_card_cache(card_id)
        return data


accountpe_client = AccountPEClient()
