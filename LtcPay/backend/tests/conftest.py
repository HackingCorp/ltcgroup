"""
LtcPay - Test configuration and fixtures.

Uses an in-memory SQLite database for fast, isolated tests.
"""
import uuid
from decimal import Decimal
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_api_secret, generate_api_secret, generate_payment_token
from app.main import app
from app.models.merchant import Merchant, generate_api_key_live, generate_api_key_test
from app.models.payment import Payment, PaymentStatus


# Use SQLite for testing (async via aiosqlite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test, drop after."""
    from app.models.merchant import Merchant  # noqa: F401
    from app.models.payment import Payment  # noqa: F401
    from app.models.transaction import Transaction  # noqa: F401

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session for tests."""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provide an HTTP test client with the test database."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def merchant_credentials(db_session: AsyncSession) -> dict:
    """
    Create a merchant and return dict with merchant object, raw api_secret, and api_key.
    This is needed because the raw secret is only available at creation time.
    """
    api_key_live = generate_api_key_live()
    api_key_test = generate_api_key_test()
    raw_secret = generate_api_secret()
    hashed_secret = hash_api_secret(raw_secret)

    merchant = Merchant(
        name="Test Merchant",
        email=f"test-{uuid.uuid4().hex[:8]}@example.com",
        website="https://test.example.com",
        callback_url="https://test.example.com/webhook",
        api_key_live=api_key_live,
        api_key_test=api_key_test,
        api_secret_hash=hashed_secret,
        is_active=True,
        is_verified=False,
    )
    db_session.add(merchant)
    await db_session.commit()
    await db_session.refresh(merchant)

    return {
        "merchant": merchant,
        "api_key": api_key_test,
        "api_secret": raw_secret,
    }


@pytest_asyncio.fixture
async def demo_merchant(merchant_credentials) -> Merchant:
    """Return just the merchant object from merchant_credentials."""
    return merchant_credentials["merchant"]


@pytest_asyncio.fixture
async def auth_headers(merchant_credentials) -> dict:
    """Return authentication headers for the test merchant."""
    return {
        "X-API-Key": merchant_credentials["api_key"],
        "X-API-Secret": merchant_credentials["api_secret"],
    }


@pytest_asyncio.fixture
async def demo_payment(db_session: AsyncSession, demo_merchant: Merchant) -> Payment:
    """Create a demo payment for tests."""
    reference = f"PAY-{uuid.uuid4().hex[:16].upper()}"
    payment_token = generate_payment_token(reference, 5000.0)
    payment = Payment(
        merchant_id=demo_merchant.id,
        reference=reference,
        payment_token=payment_token,
        amount=Decimal("5000.00"),
        currency="XAF",
        status=PaymentStatus.PENDING,
        customer_info={"name": "Test User", "phone": "237670000000"},
        description="Test payment",
        payment_url="http://test/pay/PAY-TEST",
    )
    db_session.add(payment)
    await db_session.commit()
    await db_session.refresh(payment)
    return payment
