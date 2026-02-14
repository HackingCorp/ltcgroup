"""
Tests for admin endpoints.
NOTE: Some tests are for future implementation when backend/app/api/v1/admin.py is created.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, KYCStatus
from app.services.auth import hash_password


@pytest_asyncio.fixture
async def test_admin_user(test_db: AsyncSession) -> User:
    """
    Create a test user with admin privileges.
    """
    admin_user = User(
        email="admin@example.com",
        phone="+237671234570",
        first_name="Admin",
        last_name="User",
        hashed_password=hash_password("AdminPassword123!"),
        kyc_status=KYCStatus.APPROVED,
        is_admin=True,
    )
    test_db.add(admin_user)
    await test_db.commit()
    await test_db.refresh(admin_user)
    return admin_user


@pytest_asyncio.fixture
async def test_admin_token(test_client: AsyncClient, test_admin_user: User) -> str:
    """
    Create an admin user and return their JWT token.
    """
    response = await test_client.post(
        "/api/v1/auth/login",
        params={"email": test_admin_user.email, "password": "AdminPassword123!"}
    )
    assert response.status_code == 200
    token_data = response.json()
    return token_data["access_token"]


@pytest.mark.asyncio
class TestAdminEndpoints:
    """
    Tests for admin-only endpoints.
    NOTE: These tests expect /api/v1/admin endpoints to be implemented.
    """

    async def test_get_users_requires_admin(
        self, test_client: AsyncClient, test_user_token: tuple[str, User]
    ):
        """Test that non-admin users cannot access GET /api/v1/admin/users."""
        token, _ = test_user_token

        response = await test_client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()

    async def test_get_users_as_admin(
        self, test_client: AsyncClient, test_admin_token: str, test_db: AsyncSession
    ):
        """Test that admin can access GET /api/v1/admin/users and get paginated results."""
        response = await test_client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {test_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data

    async def test_approve_kyc_requires_admin(
        self, test_client: AsyncClient, test_user_token: tuple[str, User]
    ):
        """Test that non-admin users cannot approve KYC."""
        token, user = test_user_token

        response = await test_client.post(
            f"/api/v1/admin/users/{user.id}/kyc/approve",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403

    async def test_approve_kyc_as_admin(
        self, test_client: AsyncClient, test_admin_token: str, test_db: AsyncSession
    ):
        """Test that admin can approve user KYC status."""
        # Create a pending KYC user
        pending_user = User(
            email="pending@example.com",
            phone="+237671234580",
            first_name="Pending",
            last_name="User",
            hashed_password=hash_password("PendingPassword123!"),
            kyc_status=KYCStatus.PENDING,
        )
        test_db.add(pending_user)
        await test_db.commit()
        await test_db.refresh(pending_user)

        response = await test_client.post(
            f"/api/v1/admin/users/{pending_user.id}/kyc/approve",
            headers={"Authorization": f"Bearer {test_admin_token}"}
        )
        assert response.status_code == 200

        # Verify status changed
        await test_db.refresh(pending_user)
        assert pending_user.kyc_status == KYCStatus.APPROVED

    async def test_reject_kyc_as_admin(
        self, test_client: AsyncClient, test_admin_token: str, test_db: AsyncSession
    ):
        """Test that admin can reject user KYC status with a reason."""
        # Create a pending KYC user
        pending_user = User(
            email="pending2@example.com",
            phone="+237671234581",
            first_name="Pending",
            last_name="User2",
            hashed_password=hash_password("PendingPassword123!"),
            kyc_status=KYCStatus.PENDING,
        )
        test_db.add(pending_user)
        await test_db.commit()
        await test_db.refresh(pending_user)

        response = await test_client.post(
            f"/api/v1/admin/users/{pending_user.id}/kyc/reject",
            headers={"Authorization": f"Bearer {test_admin_token}"},
            json={"reason": "Document not clear"}
        )
        assert response.status_code == 200

        # Verify status changed
        await test_db.refresh(pending_user)
        assert pending_user.kyc_status == KYCStatus.REJECTED

    async def test_get_transactions_requires_admin(
        self, test_client: AsyncClient, test_user_token: tuple[str, User]
    ):
        """Test that non-admin users cannot access all transactions."""
        token, _ = test_user_token

        response = await test_client.get(
            "/api/v1/admin/transactions",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403

    async def test_get_transactions_as_admin(
        self, test_client: AsyncClient, test_admin_token: str
    ):
        """Test that admin can access all transactions."""
        response = await test_client.get(
            "/api/v1/admin/transactions",
            headers={"Authorization": f"Bearer {test_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data

    async def test_get_stats_requires_admin(
        self, test_client: AsyncClient, test_user_token: tuple[str, User]
    ):
        """Test that non-admin users cannot access dashboard stats."""
        token, _ = test_user_token

        response = await test_client.get(
            "/api/v1/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403

    async def test_get_stats_as_admin(
        self, test_client: AsyncClient, test_admin_token: str
    ):
        """Test that admin can access dashboard statistics."""
        response = await test_client.get(
            "/api/v1/admin/stats",
            headers={"Authorization": f"Bearer {test_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_cards" in data
        assert "total_transactions" in data
        assert "total_volume" in data
        assert "total_revenue" in data
        assert "pending_kyc" in data
