"""Add SebPay mobile money provider: enum value, registry seed, operator OTP flag

Revision ID: 021
Revises: 020
Create Date: 2026-10-08

Idempotent: the enum addition uses IF NOT EXISTS, the seed ON CONFLICT.
SebPay is seeded inactive and linked to no country: its keys must be set and
its operators synced (POST /admin/providers/sebpay/sync-operators) first.
"""
from alembic import op

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE paymentprovider ADD VALUE IF NOT EXISTS 'SEBPAY'")
    op.execute(
        "ALTER TABLE country_operators "
        "ADD COLUMN IF NOT EXISTS otp_required BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        """
        INSERT INTO payment_providers (code, name, provider_group, is_active, config)
        VALUES ('SEBPAY', 'SebPay', 'MOBILE', false, '{}')
        ON CONFLICT (code) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM country_operators WHERE provider_code = 'SEBPAY'")
    op.execute("DELETE FROM country_providers WHERE provider_code = 'SEBPAY'")
    op.execute("DELETE FROM payment_providers WHERE code = 'SEBPAY'")
    op.execute("ALTER TABLE country_operators DROP COLUMN IF EXISTS otp_required")
    # Postgres cannot remove enum values; SEBPAY stays in the type.
