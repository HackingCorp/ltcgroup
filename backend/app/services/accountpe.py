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

    # Future endpoints:
    # POST /auth/register
    # POST /auth/login
    # POST /users/kyc
    # POST /cards/purchase
    # GET  /cards/{card_id}
    # POST /cards/{card_id}/freeze
    # POST /cards/{card_id}/block
    # POST /cards/{card_id}/topup
    # POST /cards/{card_id}/withdraw
    # GET  /cards/{card_id}/transactions


accountpe_client = AccountPEClient()
