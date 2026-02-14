"""
Security tests for authentication, authorization, and access control.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
import jwt

from app.models.user import User, KYCStatus
from app.models.card import Card, CardType, CardStatus
from app.services.auth import hash_password
from app.config import settings
from decimal import Decimal


@pytest_asyncio.fixture
async def non_kyc_user(test_db: AsyncSession) -> User:
    """Create a user without KYC approval."""
    user = User(
        email="nonkyc@example.com",
        phone="+237671234590",
        first_name="NonKYC",
        last_name="User",
        hashed_password=hash_password("TestPassword123!"),
        kyc_status=KYCStatus.PENDING,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def non_kyc_user_token(test_client: AsyncClient, non_kyc_user: User) -> str:
    """Get token for non-KYC user."""
    response = await test_client.post(
        "/api/v1/auth/login",
        params={"email": non_kyc_user.email, "password": "TestPassword123!"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def second_user(test_db: AsyncSession) -> User:
    """Create a second test user."""
    user = User(
        email="seconduser@example.com",
        phone="+237671234591",
        first_name="Second",
        last_name="User",
        hashed_password=hash_password("TestPassword123!"),
        kyc_status=KYCStatus.APPROVED,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def second_user_token(test_client: AsyncClient, second_user: User) -> tuple[str, User]:
    """Get token for second user."""
    response = await test_client.post(
        "/api/v1/auth/login",
        params={"email": second_user.email, "password": "TestPassword123!"}
    )
    assert response.status_code == 200
    return response.json()["access_token"], second_user


@pytest_asyncio.fixture
async def blocked_card(test_db: AsyncSession, test_user: User) -> Card:
    """Create a blocked card."""
    card = Card(
        user_id=test_user.id,
        card_type=CardType.VISA,
        card_number_masked="****2222",
        card_number_full_encrypted="4111111111112222",
        status=CardStatus.BLOCKED,
        balance=Decimal("50.00"),
        currency="USD",
        provider="AccountPE",
        provider_card_id="accountpe_card_blocked",
        expiry_date="12/29",
        cvv_encrypted="456",
    )
    test_db.add(card)
    await test_db.commit()
    await test_db.refresh(card)
    return card


@pytest.mark.asyncio
class TestAuthenticationBypass:
    """Tests to ensure authentication cannot be bypassed."""

    async def test_request_without_token_returns_401(self, test_client: AsyncClient):
        """Test that requests without authorization token are rejected."""
        response = await test_client.get("/api/v1/cards")
        assert response.status_code == 401
        assert "not authenticated" in response.json()["detail"].lower() or "unauthorized" in response.json()["detail"].lower()

    async def test_expired_token_returns_401(self, test_client: AsyncClient, test_user: User):
        """Test that expired JWT tokens are rejected."""
        # Create an expired token
        expire = datetime.utcnow() - timedelta(hours=1)
        payload = {
            "sub": test_user.email,
            "exp": expire
        }
        expired_token = jwt.encode(payload, settings.secret_key, algorithm="HS256")

        response = await test_client.get(
            "/api/v1/cards",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert response.status_code == 401

    async def test_malformed_token_returns_401(self, test_client: AsyncClient):
        """Test that malformed JWT tokens are rejected."""
        malformed_token = "not.a.valid.jwt.token"

        response = await test_client.get(
            "/api/v1/cards",
            headers={"Authorization": f"Bearer {malformed_token}"}
        )
        assert response.status_code == 401

    async def test_invalid_signature_token_returns_401(self, test_client: AsyncClient, test_user: User):
        """Test that tokens with invalid signatures are rejected."""
        # Create a token with wrong signature
        payload = {
            "sub": test_user.email,
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        invalid_token = jwt.encode(payload, "wrong_secret_key", algorithm="HS256")

        response = await test_client.get(
            "/api/v1/cards",
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestAuthorization:
    """Tests to ensure users can only access their own resources."""

    async def test_user_cannot_access_other_user_cards(
        self,
        test_client: AsyncClient,
        test_user_token: tuple[str, User],
        second_user_token: tuple[str, User],
        test_db: AsyncSession
    ):
        """Test that user A cannot access user B's cards."""
        token_a, user_a = test_user_token
        token_b, user_b = second_user_token

        # Create a card for user B
        card_b = Card(
            user_id=user_b.id,
            card_type=CardType.VISA,
            card_number_masked="****9999",
            card_number_full_encrypted="4111111111119999",
            status=CardStatus.ACTIVE,
            balance=Decimal("200.00"),
            currency="USD",
            provider="AccountPE",
            provider_card_id="accountpe_card_userb",
            expiry_date="12/29",
            cvv_encrypted="789",
        )
        test_db.add(card_b)
        await test_db.commit()
        await test_db.refresh(card_b)

        # User A tries to access user B's card
        response = await test_client.get(
            f"/api/v1/cards/{card_b.id}",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        # Should be 404 (not found) or 403 (forbidden)
        assert response.status_code in [403, 404]

    async def test_user_cannot_access_other_user_transactions(
        self,
        test_client: AsyncClient,
        test_user_token: tuple[str, User],
        second_user: User
    ):
        """Test that user A cannot access user B's transactions."""
        token_a, user_a = test_user_token

        # Try to access transactions endpoint (should only show user A's transactions)
        response = await test_client.get(
            "/api/v1/transactions",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert response.status_code == 200

        # Verify that only user A's transactions are returned
        transactions = response.json()
        if isinstance(transactions, list):
            for txn in transactions:
                assert str(txn["user_id"]) == str(user_a.id)


@pytest.mark.asyncio
class TestKYCEnforcement:
    """Tests to ensure KYC requirements are enforced."""

    async def test_non_kyc_user_cannot_purchase_cards(
        self,
        test_client: AsyncClient,
        non_kyc_user_token: str,
        mock_accountpe
    ):
        """Test that non-KYC approved users cannot purchase cards."""
        response = await test_client.post(
            "/api/v1/cards",
            headers={"Authorization": f"Bearer {non_kyc_user_token}"},
            json={
                "card_type": "VISA",
                "initial_balance": 50.0,
                "currency": "USD"
            }
        )
        # Should be 403 Forbidden due to KYC not approved
        assert response.status_code == 403
        assert "kyc" in response.json()["detail"].lower() or "not approved" in response.json()["detail"].lower()


@pytest.mark.asyncio
class TestBlockedCardRestrictions:
    """Tests to ensure blocked cards cannot be operated on."""

    async def test_cannot_freeze_blocked_card(
        self,
        test_client: AsyncClient,
        test_user_token: tuple[str, User],
        blocked_card: Card
    ):
        """Test that blocked cards cannot be frozen."""
        token, _ = test_user_token

        response = await test_client.post(
            f"/api/v1/cards/{blocked_card.id}/freeze",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should fail because card is already blocked
        assert response.status_code in [400, 403, 409]

    async def test_cannot_unfreeze_blocked_card(
        self,
        test_client: AsyncClient,
        test_user_token: tuple[str, User],
        blocked_card: Card
    ):
        """Test that blocked cards cannot be unfrozen."""
        token, _ = test_user_token

        response = await test_client.post(
            f"/api/v1/cards/{blocked_card.id}/unfreeze",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should fail because card is blocked
        assert response.status_code in [400, 403, 409]

    async def test_cannot_topup_blocked_card(
        self,
        test_client: AsyncClient,
        test_user_token: tuple[str, User],
        blocked_card: Card,
        mock_accountpe
    ):
        """Test that blocked cards cannot be topped up."""
        token, _ = test_user_token

        response = await test_client.post(
            f"/api/v1/cards/{blocked_card.id}/topup",
            headers={"Authorization": f"Bearer {token}"},
            json={"amount": 20.0, "currency": "USD"}
        )
        # Should fail because card is blocked
        assert response.status_code in [400, 403, 409]

    async def test_cannot_withdraw_from_blocked_card(
        self,
        test_client: AsyncClient,
        test_user_token: tuple[str, User],
        blocked_card: Card,
        mock_accountpe
    ):
        """Test that blocked cards cannot have withdrawals."""
        token, _ = test_user_token

        response = await test_client.post(
            f"/api/v1/cards/{blocked_card.id}/withdraw",
            headers={"Authorization": f"Bearer {token}"},
            json={"amount": 10.0, "currency": "USD"}
        )
        # Should fail because card is blocked
        assert response.status_code in [400, 403, 409]


@pytest.mark.asyncio
class TestWebhookIdempotency:
    """Tests to ensure webhook processing is idempotent."""

    async def test_processing_same_webhook_twice_does_not_double_credit(
        self,
        test_client: AsyncClient,
        test_user: User,
        test_db: AsyncSession
    ):
        """Test that processing the same webhook twice doesn't double-credit the user."""
        # NOTE: This test assumes webhook endpoint exists at /api/v1/webhooks/s3p or similar
        # and uses a transaction_reference or external_id for idempotency

        # TODO: Implement when webhook endpoint is finalized
        # webhook_payload = {
        #     "transaction_reference": "unique_txn_ref_123",
        #     "amount": 100.0,
        #     "status": "SUCCESS",
        #     "user_id": str(test_user.id)
        # }
        #
        # # First webhook call
        # response1 = await test_client.post(
        #     "/api/v1/webhooks/s3p",
        #     json=webhook_payload
        # )
        # assert response1.status_code == 200
        #
        # # Get initial balance
        # from sqlalchemy import select
        # stmt = select(User).where(User.id == test_user.id)
        # result = await test_db.execute(stmt)
        # user = result.scalar_one()
        # balance_after_first = user.wallet_balance
        #
        # # Second webhook call with same reference
        # response2 = await test_client.post(
        #     "/api/v1/webhooks/s3p",
        #     json=webhook_payload
        # )
        # assert response2.status_code == 200
        #
        # # Verify balance hasn't changed
        # await test_db.refresh(user)
        # balance_after_second = user.wallet_balance
        # assert balance_after_second == balance_after_first
        pass
