"""Add fee_rate and fee_bearer to payment_merchants

Revision ID: 006
Revises: 005
Create Date: 2026-04-29
"""
from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE feebearer AS ENUM ('MERCHANT', 'CLIENT');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute(
        "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS fee_rate NUMERIC(5,2) NOT NULL DEFAULT 1.75"
    )
    op.execute(
        "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS fee_bearer feebearer NOT NULL DEFAULT 'MERCHANT'"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE payment_merchants DROP COLUMN IF EXISTS fee_bearer")
    op.execute("ALTER TABLE payment_merchants DROP COLUMN IF EXISTS fee_rate")
    op.execute("DROP TYPE IF EXISTS feebearer")
