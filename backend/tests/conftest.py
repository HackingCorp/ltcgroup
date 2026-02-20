"""
Pytest configuration and fixtures for backend tests
"""

import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import get_db, Base
from app.services.accountpe import AccountPEClient
from app.models.user import User, KYCStatus
from app.models.card import Card, CardType, CardStatus
from app.services.auth import hash_password
from decimal import Decimal


# Test database URL (SQLite in-memory for fast tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a test database session using SQLite in-memory.
    This fixture creates a fresh database for each test.
    """
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def test_client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create a test HTTP client with dependency overrides.
    """
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def mock_accountpe(monkeypatch):
    """
    Mock the AccountPE client for testing without hitting real API.
    """
    class MockAccountPEClient:
        def __init__(self):
            self.base_url = "https://api.accountpe.com/v2"
            self.api_key = "test_api_key"

        async def _get_headers(self) -> dict:
            return {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

        async def health_check(self) -> dict:
            return {"status": "healthy", "service": "accountpe-api"}

        async def create_user(self, email: str, name: str, country: str = "CM") -> dict:
            return {"user_id": "accountpe_user_123", "status": "registered"}

        async def purchase_card(self, user_id: str, card_type: str, initial_balance: float) -> dict:
            return {
                "card_id": "accountpe_card_123",
                "card_number": "4111111111111111",
                "expiry_date": "12/29",
                "cvv": "123"
            }

        async def freeze_card(self, provider_card_id: str) -> dict:
            return {"status": "frozen"}

        async def unfreeze_card(self, provider_card_id: str) -> dict:
            return {"status": "active"}

        async def block_card(self, provider_card_id: str) -> dict:
            return {"status": "blocked"}

        async def recharge_card(self, card_id: str, amount: float) -> dict:
            return {"transaction_id": "accountpe_txn_123", "status": "completed"}

        async def withdraw_fund(self, card_id: str, amount: float) -> dict:
            return {"transaction_id": "accountpe_txn_456", "status": "completed"}

    mock_client = MockAccountPEClient()
    monkeypatch.setattr("app.services.accountpe.accountpe_client", mock_client)
    return mock_client


@pytest.fixture
def sample_user_data() -> dict:
    """
    Sample user data for testing registration/authentication.
    """
    return {
        "email": "test@example.com",
        "password": "SecurePassword123!",
        "first_name": "Test",
        "last_name": "User",
        "phone": "237670000000",
    }


@pytest_asyncio.fixture
async def test_user(test_db: AsyncSession) -> User:
    """
    Create a test user in the database.
    """
    user = User(
        email="testuser@example.com",
        phone="+237671234567",
        first_name="Test",
        last_name="User",
        hashed_password=hash_password("TestPassword123!"),
        kyc_status=KYCStatus.APPROVED,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_token(test_client: AsyncClient, test_db: AsyncSession) -> tuple[str, User]:
    """
    Create a test user and return their JWT token along with the user object.
    """
    # Create user with KYC approved
    user = User(
        email="tokenuser@example.com",
        phone="+237671234568",
        first_name="Token",
        last_name="User",
        hashed_password=hash_password("TokenPassword123!"),
        kyc_status=KYCStatus.APPROVED,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    # Login to get token
    response = await test_client.post(
        "/api/v1/auth/login",
        params={"email": user.email, "password": "TokenPassword123!"}
    )
    assert response.status_code == 200
    token_data = response.json()
    return token_data["access_token"], user


@pytest_asyncio.fixture
async def test_card(test_db: AsyncSession, test_user: User) -> Card:
    """
    Create a test card for the test user.
    """
    card = Card(
        user_id=test_user.id,
        card_type=CardType.VISA,
        card_number_masked="****1111",
        card_number_full_encrypted="4111111111111111",
        status=CardStatus.ACTIVE,
        balance=Decimal("100.00"),
        currency="USD",
        provider="AccountPE",
        provider_card_id="accountpe_card_123",
        expiry_date="12/29",
        cvv_encrypted="123",
    )
    test_db.add(card)
    await test_db.commit()
    await test_db.refresh(card)
    return card
