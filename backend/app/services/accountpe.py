"""
AccountPE vCard V2 API Client

Handles JWT authentication and proxies requests to the AccountPE
virtual card platform for:
- User registration & KYC
- Card purchase (Visa/Mastercard)
- Card management (details, freeze, block)
- Top-up & withdrawal
- Transaction history
"""

import httpx
from app.config import settings


class AccountPEClient:
    def __init__(self):
        self.base_url = settings.accountpe_api_url
        self.api_key = settings.accountpe_api_key
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0,
        )

    async def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def health_check(self) -> dict:
        headers = await self._get_headers()
        response = await self.client.get("/health", headers=headers)
        response.raise_for_status()
        return response.json()

    async def register_user(
        self, email: str, phone: str, first_name: str, last_name: str, password: str
    ) -> dict:
        headers = await self._get_headers()
        payload = {
            "email": email,
            "phone": phone,
            "first_name": first_name,
            "last_name": last_name,
            "password": password,
        }
        response = await self.client.post("/auth/register", json=payload, headers=headers)
        response.raise_for_status()
        return response.json()

    async def login_user(self, email: str, password: str) -> dict:
        headers = await self._get_headers()
        payload = {"email": email, "password": password}
        response = await self.client.post("/auth/login", json=payload, headers=headers)
        response.raise_for_status()
        return response.json()

    async def submit_kyc(self, user_id: str, document_url: str, document_type: str) -> dict:
        headers = await self._get_headers()
        payload = {
            "user_id": user_id,
            "document_url": document_url,
            "document_type": document_type,
        }
        response = await self.client.post("/users/kyc", json=payload, headers=headers)
        response.raise_for_status()
        return response.json()

    async def purchase_card(self, user_id: str, card_type: str, initial_balance: float) -> dict:
        headers = await self._get_headers()
        payload = {
            "user_id": user_id,
            "card_type": card_type,
            "initial_balance": initial_balance,
        }
        response = await self.client.post("/cards/purchase", json=payload, headers=headers)
        response.raise_for_status()
        return response.json()

    async def get_card_details(self, card_id: str) -> dict:
        headers = await self._get_headers()
        response = await self.client.get(f"/cards/{card_id}", headers=headers)
        response.raise_for_status()
        return response.json()

    async def freeze_card(self, card_id: str) -> dict:
        headers = await self._get_headers()
        response = await self.client.post(f"/cards/{card_id}/freeze", headers=headers)
        response.raise_for_status()
        return response.json()

    async def unfreeze_card(self, card_id: str) -> dict:
        headers = await self._get_headers()
        response = await self.client.post(f"/cards/{card_id}/unfreeze", headers=headers)
        response.raise_for_status()
        return response.json()

    async def block_card(self, card_id: str) -> dict:
        headers = await self._get_headers()
        response = await self.client.post(f"/cards/{card_id}/block", headers=headers)
        response.raise_for_status()
        return response.json()

    async def topup_card(self, card_id: str, amount: float, currency: str = "USD") -> dict:
        headers = await self._get_headers()
        payload = {"amount": amount, "currency": currency}
        response = await self.client.post(f"/cards/{card_id}/topup", json=payload, headers=headers)
        response.raise_for_status()
        return response.json()

    async def withdraw_from_card(self, card_id: str, amount: float, currency: str = "USD") -> dict:
        headers = await self._get_headers()
        payload = {"amount": amount, "currency": currency}
        response = await self.client.post(
            f"/cards/{card_id}/withdraw", json=payload, headers=headers
        )
        response.raise_for_status()
        return response.json()

    async def get_card_transactions(
        self, card_id: str, limit: int = 50, offset: int = 0
    ) -> dict:
        headers = await self._get_headers()
        params = {"limit": limit, "offset": offset}
        response = await self.client.get(
            f"/cards/{card_id}/transactions", params=params, headers=headers
        )
        response.raise_for_status()
        return response.json()


accountpe_client = AccountPEClient()
