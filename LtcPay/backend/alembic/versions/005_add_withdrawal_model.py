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
    # Create enums
    withdrawalstatus = sa.Enum(
        "PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "FAILED",
        name="withdrawalstatus",
    )
    withdrawalmethod = sa.Enum("MOBILE_MONEY", "BANK_TRANSFER", name="withdrawalmethod")
    withdrawalstatus.create(op.get_bind(), checkfirst=True)
    withdrawalmethod.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "merchant_withdrawals",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "merchant_id",
            UUID(as_uuid=True),
            sa.ForeignKey("payment_merchants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("reference", sa.String(50), unique=True, nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("fee", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="XAF"),
        sa.Column("method", withdrawalmethod, nullable=False),
        sa.Column("status", withdrawalstatus, nullable=False, server_default="PENDING"),
        # Mobile Money
        sa.Column("mobile_money_number", sa.String(20), nullable=True),
        sa.Column("mobile_money_operator", sa.String(20), nullable=True),
        # Bank Transfer
        sa.Column("bank_name", sa.String(255), nullable=True),
        sa.Column("bank_account_number", sa.String(50), nullable=True),
        sa.Column("bank_account_name", sa.String(255), nullable=True),
        # Admin
        sa.Column("admin_note", sa.Text, nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_index("ix_merchant_withdrawals_merchant_id", "merchant_withdrawals", ["merchant_id"])
    op.create_index("ix_merchant_withdrawals_reference", "merchant_withdrawals", ["reference"], unique=True)
    op.create_index("ix_merchant_withdrawals_status", "merchant_withdrawals", ["status"])


def downgrade() -> None:
    op.drop_table("merchant_withdrawals")
    op.execute("DROP TYPE IF EXISTS withdrawalstatus")
    op.execute("DROP TYPE IF EXISTS withdrawalmethod")
