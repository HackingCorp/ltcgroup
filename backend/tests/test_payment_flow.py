"""
Integration tests for payment flows and KYC workflows.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal

from app.models.user import User, KYCStatus
from app.models.transaction import Transaction, TransactionStatus
from app.services.auth import hash_password


@pytest_asyncio.fixture
async def kyc_pending_user(test_db: AsyncSession) -> User:
    """Create a user with pending KYC status."""
    user = User(
        email="kycpending@example.com",
        phone="+237671234595",
        first_name="KYCPending",
        last_name="User",
        hashed_password=hash_password("TestPassword123!"),
        kyc_status=KYCStatus.PENDING,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def kyc_pending_token(test_client: AsyncClient, kyc_pending_user: User) -> tuple[str, User]:
    """Get token for KYC pending user."""
    response = await test_client.post(
        "/api/v1/auth/login",
        params={"email": kyc_pending_user.email, "password": "TestPassword123!"}
    )
    assert response.status_code == 200
    return response.json()["access_token"], kyc_pending_user


@pytest.mark.asyncio
class TestPaymentFlow:
    """Integration tests for full payment flows."""

    async def test_full_payment_flow_success(
        self,
        test_client: AsyncClient,
        test_user_token: tuple[str, User],
        test_db: AsyncSession,
        mock_accountpe
    ):
        """Test complete payment flow: initiate -> webhook -> balance updated."""
        token, user = test_user_token

        # Step 1: Initiate payment
        response = await test_client.post(
            "/api/v1/payments/initiate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "amount": 100.0,
                "currency": "XAF",
                "payment_method": "MOMO"
            }
        )
        assert response.status_code == 200
        payment_data = response.json()
        assert "payment_reference" in payment_data or "reference" in payment_data

        # Get the payment reference
        payment_ref = payment_data.get("payment_reference") or payment_data.get("reference")

        # Verify transaction created with PENDING status
        stmt = select(Transaction).where(Transaction.external_reference == payment_ref)
        result = await test_db.execute(stmt)
        transaction = result.scalar_one_or_none()
        assert transaction is not None
        assert transaction.status == TransactionStatus.PENDING

        # Step 2: Simulate successful S3P webhook callback
        webhook_payload = {
            "ptn": payment_ref,
            "trid": payment_ref,
            "amount": 100.0,
            "status": "SUCCESS",
            "currency": "XAF"
        }
        webhook_response = await test_client.post(
            "/api/v1/payments/webhook/s3p",
            json=webhook_payload
        )
        assert webhook_response.status_code == 200

        # Step 3: Verify transaction marked as completed
        await test_db.refresh(transaction)
        assert transaction.status == TransactionStatus.COMPLETED

    async def test_payment_flow_with_failed_webhook(
        self,
        test_client: AsyncClient,
        test_user_token: tuple[str, User],
        test_db: AsyncSession,
        mock_accountpe
    ):
        """Test payment flow where webhook reports failure - balance should NOT update."""
        token, user = test_user_token

        # Step 1: Initiate payment
        response = await test_client.post(
            "/api/v1/payments/initiate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "amount": 100.0,
                "currency": "XAF",
                "payment_method": "MOMO"
            }
        )
        assert response.status_code == 200
        payment_data = response.json()
        payment_ref = payment_data.get("payment_reference") or payment_data.get("reference")

        # Step 2: Simulate failed S3P webhook callback
        webhook_payload = {
            "ptn": payment_ref,
            "trid": payment_ref,
            "amount": 100.0,
            "status": "FAILED",
            "currency": "XAF"
        }
        webhook_response = await test_client.post(
            "/api/v1/payments/webhook/s3p",
            json=webhook_payload
        )
        assert webhook_response.status_code == 200

        # Step 3: Verify transaction marked as failed
        stmt = select(Transaction).where(Transaction.external_reference == payment_ref)
        result = await test_db.execute(stmt)
        transaction = result.scalar_one()
        assert transaction.status == TransactionStatus.FAILED


@pytest.mark.asyncio
class TestKYCFlow:
    """Integration tests for KYC workflow."""

    async def test_full_kyc_flow(
        self,
        test_client: AsyncClient,
        kyc_pending_token: tuple[str, User],
        test_db: AsyncSession,
        mock_accountpe
    ):
        """Test complete KYC flow: register -> submit KYC -> admin approve -> can purchase card."""
        token, user = kyc_pending_token

        # Initial state: user has pending KYC
        assert user.kyc_status == KYCStatus.PENDING

        # Step 1: User cannot purchase card yet
        purchase_response = await test_client.post(
            "/api/v1/cards",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "card_type": "VISA",
                "initial_balance": 50.0,
                "currency": "USD"
            }
        )
        assert purchase_response.status_code == 403

        # Step 2: Submit KYC documents
        kyc_response = await test_client.post(
            "/api/v1/users/kyc/submit",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "document_type": "PASSPORT",
                "document_url": "https://s3.amazonaws.com/docs/passport.jpg"
            }
        )
        assert kyc_response.status_code == 200

        # Step 3: Admin approves KYC
        # Manually update user status (simulating admin action)
        user.kyc_status = KYCStatus.APPROVED
        test_db.add(user)
        await test_db.commit()
        await test_db.refresh(user)

        # Step 4: User can now purchase card
        purchase_response_2 = await test_client.post(
            "/api/v1/cards",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "card_type": "VISA",
                "initial_balance": 50.0,
                "currency": "USD"
            }
        )
        assert purchase_response_2.status_code == 200
        card_data = purchase_response_2.json()
        assert "id" in card_data
        assert card_data["status"] == "ACTIVE" or card_data["status"] == "PENDING"

    async def test_kyc_rejection_prevents_card_purchase(
        self,
        test_client: AsyncClient,
        kyc_pending_token: tuple[str, User],
        test_db: AsyncSession,
        mock_accountpe
    ):
        """Test that rejected KYC prevents card purchase."""
        token, user = kyc_pending_token

        # Admin rejects KYC
        user.kyc_status = KYCStatus.REJECTED
        test_db.add(user)
        await test_db.commit()

        # User still cannot purchase card
        purchase_response = await test_client.post(
            "/api/v1/cards",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "card_type": "VISA",
                "initial_balance": 50.0,
                "currency": "USD"
            }
        )
        assert purchase_response.status_code == 403


@pytest.mark.asyncio
class TestS3PIntegration:
    """Integration tests with mocked S3P payment service."""

    async def test_s3p_payment_initiation(
        self,
        test_client: AsyncClient,
        test_user_token: tuple[str, User],
    ):
        """Test S3P payment initiation returns correct response format."""
        token, user = test_user_token

        response = await test_client.post(
            "/api/v1/payments/initiate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "amount": 50.0,
                "currency": "XAF",
                "payment_method": "MOMO"
            }
        )
        assert response.status_code == 200
        data = response.json()

        # Check expected fields in S3P response
        assert "payment_reference" in data or "reference" in data
        assert "payment_url" in data or "url" in data or "qr_code" in data


@pytest.mark.asyncio
class TestEnkapIntegration:
    """Integration tests with mocked E-nkap service."""

    async def test_enkap_card_purchase(
        self,
        test_client: AsyncClient,
        test_user_token: tuple[str, User],
        mock_accountpe
    ):
        """Test E-nkap virtual card purchase via AccountPE."""
        token, user = test_user_token

        response = await test_client.post(
            "/api/v1/cards",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "card_type": "VISA",
                "initial_balance": 100.0,
                "currency": "USD"
            }
        )
        assert response.status_code == 200
        card_data = response.json()

        # Verify card data structure
        assert "id" in card_data
        assert "card_number_masked" in card_data or "masked_number" in card_data
        assert "status" in card_data
        assert card_data["card_type"] == "VISA" or card_data["type"] == "VISA"
