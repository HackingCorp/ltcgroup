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

logger = get_logger(__name__)


class AccountPEError(Exception):
    """Dedicated error for AccountPE API failures."""
    pass


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

    async def _post(self, path: str, payload: dict) -> dict:
        """POST helper with auto-auth and retry on 401."""
        url = self._url(path)
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
        return response.json()

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()

    # ── Users ──

    async def create_user(self, email: str, name: str, country: str = "CM") -> dict:
        """Create a user on AccountPE platform."""
        return await self._post("/create_user", {
            "email": email,
            "name": name,
            "country": country,
        })

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

    async def purchase_contactless_card(
        self, user_id: str, card_type: str, amount: float
    ) -> dict:
        """Purchase a contactless virtual card."""
        return await self._post("/contactless_purchase_card", {
            "user_id": user_id,
            "card_type": card_type,
            "amount": amount,
        })

    async def get_all_cards(self, user_id: str) -> dict:
        """
        Get all virtual cards for a user.
        POST /get_all_virtual_card {user_id}
        Returns: {card_list: [VCard...]}
        """
        return await self._post("/get_all_virtual_card", {"user_id": user_id})

    async def get_card_details(self, card_id: str) -> dict:
        """
        Get virtual card details.
        POST /get_virtual_card_details {card_id}
        """
        return await self._post("/get_virtual_card_details", {"card_id": card_id})

    async def recharge_card(self, card_id: str, amount: float) -> dict:
        """
        Recharge/topup a virtual card.
        POST /recharge_vcard {card_id, amount}
        Returns: {vcard: VCard, status, message}
        """
        return await self._post("/recharge_vcard", {
            "card_id": card_id,
            "amount": amount,
        })

    async def withdraw_fund(self, card_id: str, amount: float) -> dict:
        """
        Withdraw funds from a virtual card.
        POST /withdraw_fund {card_id, amount}
        Returns: {vcard: VCard, status, message}
        """
        return await self._post("/withdraw_fund", {
            "card_id": card_id,
            "amount": amount,
        })

    async def freeze_card(self, card_id: str) -> dict:
        """
        Freeze a virtual card.
        POST /freeze_card {card_id}
        Returns: {vcard: VCard, status, message}
        """
        return await self._post("/freeze_card", {"card_id": card_id})

    async def unfreeze_card(self, card_id: str) -> dict:
        """POST /unfreeze_card {card_id}"""
        return await self._post("/unfreeze_card", {"card_id": card_id})

    async def block_card(self, card_id: str) -> dict:
        """POST /block_card {card_id}"""
        return await self._post("/block_card", {"card_id": card_id})

    async def replace_card(self, card_id: str) -> dict:
        """POST /replace_card {card_id}"""
        return await self._post("/replace_card", {"card_id": card_id})

    async def replace_terminated_card(self, card_id: str) -> dict:
        """POST /terminated_card_replacement {card_id}"""
        return await self._post("/terminated_card_replacement", {"card_id": card_id})

    async def get_card_transactions(self, card_id: str) -> dict:
        """
        Get card transaction history.
        POST /get_card_transactions {card_id}
        Returns: {transactions: [Transaction...]}
        """
        return await self._post("/get_card_transactions", {"card_id": card_id})


accountpe_client = AccountPEClient()
