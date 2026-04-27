"""Add merchant_withdrawals table

Revision ID: 005
Revises: 004
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums if they don't exist (use raw SQL for true IF NOT EXISTS)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE withdrawalstatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE withdrawalmethod AS ENUM ('MOBILE_MONEY', 'BANK_TRANSFER');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # Use raw SQL to create the table — avoids SQLAlchemy's Enum auto-create
    op.execute("""
        CREATE TABLE IF NOT EXISTS merchant_withdrawals (
            id UUID PRIMARY KEY,
            merchant_id UUID NOT NULL REFERENCES payment_merchants(id) ON DELETE CASCADE,
            reference VARCHAR(50) NOT NULL UNIQUE,
            amount NUMERIC(12, 2) NOT NULL,
            fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            currency VARCHAR(3) NOT NULL DEFAULT 'XAF',
            method withdrawalmethod NOT NULL,
            status withdrawalstatus NOT NULL DEFAULT 'PENDING',
            mobile_money_number VARCHAR(20),
            mobile_money_operator VARCHAR(20),
            bank_name VARCHAR(255),
            bank_account_number VARCHAR(50),
            bank_account_name VARCHAR(255),
            admin_note TEXT,
            processed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );
    """)
    op.create_index("ix_merchant_withdrawals_merchant_id", "merchant_withdrawals", ["merchant_id"])
    op.create_index("ix_merchant_withdrawals_reference", "merchant_withdrawals", ["reference"], unique=True)
    op.create_index("ix_merchant_withdrawals_status", "merchant_withdrawals", ["status"])


def downgrade() -> None:
    op.drop_table("merchant_withdrawals")
    op.execute("DROP TYPE IF EXISTS withdrawalstatus")
    op.execute("DROP TYPE IF EXISTS withdrawalmethod")
