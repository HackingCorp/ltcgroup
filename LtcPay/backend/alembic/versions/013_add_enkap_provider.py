"""Add E-nkap card provider: enum values and registry seed

Revision ID: 013
Revises: 012
Create Date: 2026-08-18

Idempotent: enum additions use IF NOT EXISTS, the seed uses ON CONFLICT.
E-nkap is seeded inactive until its consumer key/secret are configured.
"""
from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE paymentprovider ADD VALUE IF NOT EXISTS 'ENKAP'")
    op.execute("ALTER TYPE paymentmode ADD VALUE IF NOT EXISTS 'REDIRECT'")
    op.execute(
        """
        INSERT INTO payment_providers (code, name, provider_group, is_active, config)
        VALUES ('ENKAP', 'E-nkap (Maviance)', 'CARD', false, '{}')
        ON CONFLICT (code) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM country_providers WHERE provider_code = 'ENKAP'")
    op.execute("DELETE FROM payment_providers WHERE code = 'ENKAP'")
    # Postgres cannot remove enum values; ENKAP/REDIRECT stay in the types.
