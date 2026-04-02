"""Create initial tables: payment_merchants, payment_gateway_payments, transactions

Revision ID: 001
Revises:
Create Date: 2026-04-02 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- payment_merchants ----
    op.create_table(
        "payment_merchants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("api_key_live", sa.String(255), unique=True, nullable=False),
        sa.Column("api_key_test", sa.String(255), unique=True, nullable=False),
        sa.Column("api_secret_hash", sa.String(255), nullable=False),
        sa.Column("callback_url", sa.String(500), nullable=True),
        sa.Column("webhook_secret", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_test_mode", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("business_type", sa.String(100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_payment_merchants_api_key_live", "payment_merchants", ["api_key_live"], unique=True)
    op.create_index("ix_payment_merchants_api_key_test", "payment_merchants", ["api_key_test"], unique=True)
    op.create_index("ix_payment_merchants_email", "payment_merchants", ["email"], unique=True)

    # ---- payment_gateway_payments ----
    op.create_table(
        "payment_gateway_payments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "merchant_id",
            UUID(as_uuid=True),
            sa.ForeignKey("payment_merchants.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("payment_token", sa.String(255), unique=True, nullable=False),
        sa.Column("reference", sa.String(255), unique=True, nullable=False),
        sa.Column("merchant_reference", sa.String(255), nullable=True),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("fee", sa.Numeric(precision=10, scale=2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="XAF"),
        sa.Column(
            "method",
            sa.Enum("MOBILE_MONEY", "BANK_CARD", name="paymentmethod"),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING", "PROCESSING", "COMPLETED", "FAILED",
                "EXPIRED", "REFUNDED", "CANCELLED",
                name="paymentstatus",
            ),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("customer_info", JSON, nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("callback_url", sa.String(500), nullable=True),
        sa.Column("return_url", sa.String(500), nullable=True),
        sa.Column("touchpay_data", JSON, nullable=True),
        sa.Column("provider_transaction_id", sa.String(255), nullable=True),
        sa.Column("webhook_reference", sa.String(255), nullable=True),
        sa.Column("metadata", JSON, nullable=True),
        sa.Column("payment_url", sa.String(1000), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("amount > 0", name="ck_pgp_amount_positive"),
    )
    op.create_index("ix_pgp_merchant_created", "payment_gateway_payments", ["merchant_id", "created_at"])
    op.create_index("ix_pgp_status", "payment_gateway_payments", ["status"])
    op.create_index("ix_pgp_reference", "payment_gateway_payments", ["reference"])
    op.create_index("ix_pgp_payment_token", "payment_gateway_payments", ["payment_token"])
    op.create_index(
        "ix_pgp_merchant_reference",
        "payment_gateway_payments",
        ["merchant_reference"],
    )
    op.create_index(
        "ix_pgp_provider_transaction_id",
        "payment_gateway_payments",
        ["provider_transaction_id"],
    )
    op.create_index(
        "ix_pgp_webhook_reference",
        "payment_gateway_payments",
        ["webhook_reference"],
        unique=True,
    )

    # ---- transactions (legacy direct payments) ----
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("reference", sa.String(64), unique=True, nullable=False),
        sa.Column("external_ref", sa.String(128), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(3), server_default="XAF"),
        sa.Column("fee", sa.Float(), server_default="0"),
        sa.Column("net_amount", sa.Float(), nullable=True),
        sa.Column("payer_phone", sa.String(20), nullable=True),
        sa.Column("payer_email", sa.String(255), nullable=True),
        sa.Column("payer_name", sa.String(255), nullable=True),
        sa.Column(
            "payment_method",
            sa.Enum("mobile_money", "orange_money", "mtn_money", "bank_card", name="txn_paymentmethod"),
            nullable=True,
        ),
        sa.Column("operator", sa.String(50), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "processing", "completed", "failed", "cancelled", "refunded", name="transactionstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("status_message", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("callback_url", sa.String(512), nullable=True),
        sa.Column("return_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_transactions_reference", "transactions", ["reference"], unique=True)
    op.create_index("ix_transactions_external_ref", "transactions", ["external_ref"])
    op.create_index("ix_transactions_status", "transactions", ["status"])


def downgrade() -> None:
    op.drop_table("payment_gateway_payments")
    op.drop_table("payment_merchants")
    op.drop_table("transactions")
    op.execute("DROP TYPE IF EXISTS paymentstatus")
    op.execute("DROP TYPE IF EXISTS paymentmethod")
    op.execute("DROP TYPE IF EXISTS transactionstatus")
    op.execute("DROP TYPE IF EXISTS txn_paymentmethod")
