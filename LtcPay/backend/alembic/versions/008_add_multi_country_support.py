"""Add multi-country support

Create supported_countries, country_operators, merchant_countries tables.
Add country column to payment_gateway_payments.
Convert operator column from enum to varchar(20).
Seed Cameroon (CM) with existing TouchPay credentials from env vars.

Revision ID: 008_multi_country
Revises: 007_add_stripe_payment_support
Create Date: 2026-06-19
"""
import os
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers
revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def _encrypt_value(plaintext: str) -> str:
    """Encrypt a value using Fernet. Falls back to plaintext if key not available."""
    if not plaintext:
        return ""
    try:
        from cryptography.fernet import Fernet
        key = os.environ.get("CREDENTIAL_ENCRYPTION_KEY", "")
        if key:
            f = Fernet(key.encode())
            return f.encrypt(plaintext.encode("utf-8")).decode("utf-8")
        # In dev without key, store plaintext (will be re-encrypted when key is set)
        return plaintext
    except Exception:
        return plaintext


def upgrade() -> None:
    # 1. Create supported_countries table
    op.create_table(
        "supported_countries",
        sa.Column("code", sa.String(2), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("phone_prefix", sa.String(5), nullable=False, unique=True),
        sa.Column("phone_digits", sa.Integer(), nullable=False, server_default="9"),
        sa.Column("phone_pattern", sa.String(30), nullable=False, server_default="6XX XX XX XX"),
        sa.Column("flag_emoji", sa.String(10), nullable=False, server_default=""),
        sa.Column("default_city", sa.String(100), nullable=False, server_default=""),
        sa.Column("min_amount", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("max_amount", sa.Integer(), nullable=False, server_default="500000"),
        # TouchPay credentials
        sa.Column("tp_agency_code", sa.Text(), nullable=False, server_default=""),
        sa.Column("tp_login", sa.Text(), nullable=False, server_default=""),
        sa.Column("tp_password", sa.Text(), nullable=False, server_default=""),
        sa.Column("tp_secret", sa.Text(), nullable=False, server_default=""),
        sa.Column("tp_merchant_id", sa.String(100), nullable=False, server_default=""),
        sa.Column("tp_secure_code", sa.Text(), nullable=False, server_default=""),
        sa.Column("tp_merchant_website", sa.String(255), nullable=False, server_default=""),
        sa.Column(
            "tp_sdk_url", sa.String(500), nullable=False,
            server_default="https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.1.js",
        ),
        sa.Column(
            "tp_direct_api_url", sa.String(500), nullable=False,
            server_default="https://apidist.gutouch.net/apidist/sec/touchpayapi",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Create country_operators table
    op.create_table(
        "country_operators",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "country_code", sa.String(2),
            sa.ForeignKey("supported_countries.code", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("operator_code", sa.String(20), nullable=False),
        sa.Column("operator_name", sa.String(100), nullable=False),
        sa.Column("service_code", sa.String(100), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#000000"),
        sa.Column("ussd_code", sa.String(20), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("country_code", "operator_code", name="uq_country_operator"),
    )

    # 3. Create merchant_countries table
    op.create_table(
        "merchant_countries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "merchant_id", UUID(as_uuid=True),
            sa.ForeignKey("payment_merchants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "country_code", sa.String(2),
            sa.ForeignKey("supported_countries.code", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("merchant_id", "country_code", name="uq_merchant_country"),
    )

    # 4. Add country column to payments table
    op.add_column(
        "payment_gateway_payments",
        sa.Column("country", sa.String(2), nullable=True),
    )
    op.create_index("ix_pgp_country", "payment_gateway_payments", ["country"])

    # 5. Convert operator column from enum to varchar(20)
    # First, alter the column type using raw SQL to handle the enum conversion
    op.execute(
        "ALTER TABLE payment_gateway_payments "
        "ALTER COLUMN operator TYPE VARCHAR(20) USING operator::text"
    )

    # 6. Backfill country = 'CM' for all existing payments
    op.execute(
        "UPDATE payment_gateway_payments SET country = 'CM' WHERE country IS NULL"
    )

    # 7. Seed Cameroon with credentials from environment variables
    now = datetime.now(timezone.utc).isoformat()

    agency_code = os.environ.get("TOUCHPAY_DIRECT_AGENCY_CODE", "")
    login = os.environ.get("TOUCHPAY_DIRECT_LOGIN", "")
    password = _encrypt_value(os.environ.get("TOUCHPAY_DIRECT_PASSWORD", ""))
    secret = _encrypt_value(os.environ.get("TOUCHPAY_SECRET", ""))
    merchant_id = os.environ.get("TOUCHPAY_MERCHANT_ID", "LTCGR11789")
    secure_code = _encrypt_value(os.environ.get("TOUCHPAY_SECURE_CODE", ""))
    merchant_website = os.environ.get("TOUCHPAY_MERCHANT_WEBSITE", "ltcgroup.site")
    sdk_url = os.environ.get(
        "TOUCHPAY_SDK_URL",
        "https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.1.js",
    )
    direct_api_url = os.environ.get(
        "TOUCHPAY_DIRECT_API_URL",
        "https://apidist.gutouch.net/apidist/sec/touchpayapi",
    )

    service_code_mtn = os.environ.get("TOUCHPAY_SERVICE_CODE_MTN", "PAIEMENTMARCHAND_MTN_CM")
    service_code_orange = os.environ.get("TOUCHPAY_SERVICE_CODE_ORANGE", "CM_PAIEMENTMARCHAND_OM_TP")

    # Insert Cameroon
    op.execute(
        sa.text(
            "INSERT INTO supported_countries "
            "(code, name, currency, phone_prefix, phone_digits, phone_pattern, "
            "flag_emoji, default_city, min_amount, max_amount, "
            "tp_agency_code, tp_login, tp_password, tp_secret, "
            "tp_merchant_id, tp_secure_code, tp_merchant_website, "
            "tp_sdk_url, tp_direct_api_url, is_active, created_at, updated_at) "
            "VALUES (:code, :name, :currency, :prefix, :digits, :pattern, "
            ":flag, :city, :min_amt, :max_amt, "
            ":agency, :login, :password, :secret, "
            ":merchant_id, :secure_code, :website, "
            ":sdk_url, :api_url, true, :now, :now) "
            "ON CONFLICT (code) DO NOTHING"
        ).bindparams(
            code="CM", name="Cameroun", currency="XAF", prefix="237",
            digits=9, pattern="6XX XX XX XX",
            flag="\U0001F1E8\U0001F1F2", city="Douala",
            min_amt=100, max_amt=500000,
            agency=agency_code, login=login, password=password,
            secret=secret, merchant_id=merchant_id,
            secure_code=secure_code, website=merchant_website,
            sdk_url=sdk_url, api_url=direct_api_url, now=now,
        )
    )

    # Insert MTN operator
    op.execute(
        sa.text(
            "INSERT INTO country_operators "
            "(id, country_code, operator_code, operator_name, service_code, "
            "color, ussd_code, is_active, created_at, updated_at) "
            "VALUES (:id, :cc, :op_code, :op_name, :svc, :color, :ussd, true, :now, :now) "
            "ON CONFLICT ON CONSTRAINT uq_country_operator DO NOTHING"
        ).bindparams(
            id=str(uuid.uuid4()), cc="CM", op_code="MTN",
            op_name="MTN MoMo", svc=service_code_mtn,
            color="#FFCC00", ussd="*126#", now=now,
        )
    )

    # Insert ORANGE operator
    op.execute(
        sa.text(
            "INSERT INTO country_operators "
            "(id, country_code, operator_code, operator_name, service_code, "
            "color, ussd_code, is_active, created_at, updated_at) "
            "VALUES (:id, :cc, :op_code, :op_name, :svc, :color, :ussd, true, :now, :now) "
            "ON CONFLICT ON CONSTRAINT uq_country_operator DO NOTHING"
        ).bindparams(
            id=str(uuid.uuid4()), cc="CM", op_code="ORANGE",
            op_name="Orange Money", svc=service_code_orange,
            color="#FF6B00", ussd="#150*4#", now=now,
        )
    )

    # 8. Drop the old enum type if it exists (cleanup)
    op.execute("DROP TYPE IF EXISTS mobilemoneyoperator")


def downgrade() -> None:
    # Re-create the enum type
    op.execute("CREATE TYPE mobilemoneyoperator AS ENUM ('MTN', 'ORANGE')")

    # Convert operator back to enum
    op.execute(
        "ALTER TABLE payment_gateway_payments "
        "ALTER COLUMN operator TYPE mobilemoneyoperator "
        "USING operator::mobilemoneyoperator"
    )

    # Drop country column
    op.drop_index("ix_pgp_country", table_name="payment_gateway_payments")
    op.drop_column("payment_gateway_payments", "country")

    # Drop tables in reverse order
    op.drop_table("merchant_countries")
    op.drop_table("country_operators")
    op.drop_table("supported_countries")
