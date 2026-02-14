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
from app.database import get_db
from app.services.accountpe import AccountPEClient


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

    # Create tables (when models are defined)
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)

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
        "full_name": "Test User",
        "phone": "237670000000",
    }


@pytest.fixture
def sample_card_data() -> dict:
    """
    Sample vCard data for testing card operations.
    """
    return {
        "card_type": "VISA",
        "amount": 50000,  # 50,000 FCFA
        "currency": "XAF",
        "holder_name": "Test User",
    }


@pytest.fixture
def sample_transaction_data() -> dict:
    """
    Sample transaction data for testing.
    """
    return {
        "card_id": "card_123",
        "amount": 10000,
        "type": "TOPUP",
        "status": "PENDING",
        "reference": "TXN_123456",
    }
