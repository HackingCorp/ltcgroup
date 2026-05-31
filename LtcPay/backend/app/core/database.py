from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session


async def init_models():
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add columns that create_all won't add to existing tables
        alter_statements = [
            # Existing column
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)",
            # Extended business info
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255)",
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS trade_register VARCHAR(100)",
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100)",
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS address TEXT",
            # Payout configuration
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS payout_schedule VARCHAR(20) DEFAULT 'daily' NOT NULL",
            # Security
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT false NOT NULL",
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS ip_whitelist TEXT",
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS sms_alerts_enabled BOOLEAN DEFAULT false NOT NULL",
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS email_confirm_withdrawals BOOLEAN DEFAULT true NOT NULL",
            # Branding
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS checkout_primary_color VARCHAR(7)",
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS checkout_subdomain VARCHAR(63)",
            # Plan
            "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'STARTER' NOT NULL",
            # AdminUser new columns
            "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS team VARCHAR(50)",
            "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false NOT NULL",
            "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ",
            "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' NOT NULL",
        ]
        for stmt in alter_statements:
            await conn.execute(text(stmt))
