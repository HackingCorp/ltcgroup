"""Add Smobilpay (Maviance S3P) mobile money provider: enum value, registry seed

Revision ID: 026
Revises: 025
Create Date: 2026-11-02

Idempotent: the enum addition uses IF NOT EXISTS, the seed ON CONFLICT.
Smobilpay is seeded inactive and linked to no country: its keys must be set
and its catalogue synced (POST /admin/providers/smobilpay/sync-operators),
which creates the operator rows from what the account can actually collect.
"""
from alembic import op

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE paymentprovider ADD VALUE IF NOT EXISTS 'SMOBILPAY'")
    op.execute(
        """
        INSERT INTO payment_providers
            (code, name, provider_group, is_active, config, created_at, updated_at)
        VALUES ('SMOBILPAY', 'Smobilpay (Maviance)', 'MOBILE', false, '{}', now(), now())
        ON CONFLICT (code) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM country_operators WHERE provider_code = 'SMOBILPAY'")
    op.execute("DELETE FROM country_providers WHERE provider_code = 'SMOBILPAY'")
    op.execute("DELETE FROM payment_providers WHERE code = 'SMOBILPAY'")
    # Postgres cannot remove enum values; SMOBILPAY stays in the type.
