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

# Switch rate limiter to in-memory storage before importing app
# (avoids Redis connection errors when Redis is not running)
from app.core import rate_limit as _rl
from slowapi import Limiter
from slowapi.util import get_remote_address
_rl.limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")

from app.main import app

# Patch the limiter on the app state as well
app.state.limiter = _rl.limiter
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
    await _seed_country()
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _seed_country():
    """One active country, as production always has.

    Payment creation resolves a country before anything else and answers
    400 "Aucun pays actif disponible pour ce marchand" when none exists.
    The tables were created empty, so sixteen tests across test_api,
    test_payments and test_payments_direct_api asserted 201 and got 400 —
    they had been failing on the fixture, not on the code under test.
    """
    from app.models.country import CountryOperator, SupportedCountry
    from app.models.provider import CountryProvider, ProviderConfig, ProviderGroup

    async with TestSessionLocal() as session:
        # The router resolves a provider before an operator, so a country
        # without a TOUCHPAY row answers "Aucun fournisseur de paiement
        # disponible pour l'operateur ... dans le pays ...".
        session.add(ProviderConfig(
            code="TOUCHPAY", name="TouchPay", provider_group=ProviderGroup.MOBILE,
            is_active=True, config={},
        ))
        session.add(SupportedCountry(
            code="CM", name="Cameroun", currency="XAF",
            phone_prefix="237", phone_digits=9, phone_pattern="6XX XX XX XX",
            flag_emoji="", default_city="Douala",
            min_amount=100, max_amount=500_000,
            tp_agency_code="TESTAGENCY", tp_login="login", tp_password="",
            tp_secret="", tp_merchant_id="TESTMERCHANT", tp_secure_code="",
            tp_merchant_website="", is_active=True,
        ))
        session.add_all([
            CountryOperator(
                country_code="CM", operator_code="MTN", operator_name="MTN MoMo",
                service_code="PAIEMENTMARCHAND_MTN_CM", provider_code="TOUCHPAY",
                phone_prefixes=["67", "650", "651", "652", "653", "654"],
                is_active=True,
            ),
            CountryOperator(
                country_code="CM", operator_code="ORANGE", operator_name="Orange Money",
                service_code="CM_PAIEMENTMARCHAND_OM_TP", provider_code="TOUCHPAY",
                phone_prefixes=["69", "655", "656", "657", "658", "659"],
                is_active=True,
            ),
        ])
        session.add(CountryProvider(
            country_code="CM", provider_code="TOUCHPAY", priority=1, is_active=True,
        ))
        await session.commit()


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
        # A merchant allowed to collect: creating a payment now requires
        # verification. Tests for the unverified case build their own.
        is_verified=True,
        is_test_mode=False,
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
