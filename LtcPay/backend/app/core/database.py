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
            # Multi-country: add country column to payments
            "ALTER TABLE payment_gateway_payments ADD COLUMN IF NOT EXISTS country VARCHAR(2)",
            # Multi-country: convert operator from enum to varchar(20)
            # (safe: ALTER TYPE ... USING works even if already varchar)
            """DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'mobilemoneyoperator'
                ) THEN
                    ALTER TABLE payment_gateway_payments
                        ALTER COLUMN operator TYPE VARCHAR(20) USING operator::text;
                    DROP TYPE IF EXISTS mobilemoneyoperator;
                END IF;
            END $$""",
        ]
        for stmt in alter_statements:
            await conn.execute(text(stmt))

        # Seed Cameroon if not present
        import os
        import uuid as _uuid

        def _safe_encrypt(val: str) -> str:
            if not val:
                return ""
            try:
                from app.core.encryption import encrypt_value
                return encrypt_value(val)
            except (ValueError, Exception):
                return val

        row = await conn.execute(text("SELECT 1 FROM supported_countries WHERE code = 'CM'"))
        if row.first() is None:
            agency = os.environ.get("TOUCHPAY_DIRECT_AGENCY_CODE", "")
            login = os.environ.get("TOUCHPAY_DIRECT_LOGIN", "")
            password = _safe_encrypt(os.environ.get("TOUCHPAY_DIRECT_PASSWORD", ""))
            secret = _safe_encrypt(os.environ.get("TOUCHPAY_SECRET", ""))
            merchant_id = os.environ.get("TOUCHPAY_MERCHANT_ID", "LTCGR11789")
            secure_code = _safe_encrypt(os.environ.get("TOUCHPAY_SECURE_CODE", ""))
            website = os.environ.get("TOUCHPAY_MERCHANT_WEBSITE", "ltcgroup.site")
            sdk_url = os.environ.get("TOUCHPAY_SDK_URL", "https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.1.js")
            api_url = os.environ.get("TOUCHPAY_DIRECT_API_URL", "https://apidist.gutouch.net/apidist/sec/touchpayapi")

            await conn.execute(text(
                "INSERT INTO supported_countries "
                "(code,name,currency,phone_prefix,phone_digits,phone_pattern,flag_emoji,"
                "default_city,min_amount,max_amount,tp_agency_code,tp_login,tp_password,"
                "tp_secret,tp_merchant_id,tp_secure_code,tp_merchant_website,tp_sdk_url,"
                "tp_direct_api_url,is_active,created_at,updated_at) "
                "VALUES ('CM','Cameroun','XAF','237',9,'6XX XX XX XX','\U0001F1E8\U0001F1F2',"
                "'Douala',100,500000,:agency,:login,:password,"
                ":secret,:merchant_id,:secure_code,:website,:sdk_url,"
                ":api_url,true,now(),now())"
            ), {"agency": agency, "login": login, "password": password,
                "secret": secret, "merchant_id": merchant_id, "secure_code": secure_code,
                "website": website, "sdk_url": sdk_url, "api_url": api_url})

        # Seed CM operators if missing (separate check so they get added
        # even if supported_countries was already seeded on a previous startup)
        svc_mtn = os.environ.get("TOUCHPAY_SERVICE_CODE_MTN", "PAIEMENTMARCHAND_MTN_CM")
        svc_om = os.environ.get("TOUCHPAY_SERVICE_CODE_ORANGE", "CM_PAIEMENTMARCHAND_OM_TP")

        op_row = await conn.execute(text(
            "SELECT 1 FROM country_operators WHERE country_code = 'CM' LIMIT 1"
        ))
        if op_row.first() is None:
            await conn.execute(text(
                "INSERT INTO country_operators (id,country_code,operator_code,operator_name,"
                "service_code,color,ussd_code,is_active,created_at,updated_at) VALUES "
                "(:id1,'CM','MTN','MTN MoMo',:svc_mtn,'#FFCC00','*126#',true,now(),now()),"
                "(:id2,'CM','ORANGE','Orange Money',:svc_om,'#FF6B00','#150*4#',true,now(),now())"
            ), {"id1": str(_uuid.uuid4()), "id2": str(_uuid.uuid4()),
                "svc_mtn": svc_mtn, "svc_om": svc_om})
