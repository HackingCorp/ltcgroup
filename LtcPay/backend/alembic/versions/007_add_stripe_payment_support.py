"""Add Stripe payment support: provider enum, STRIPE payment mode, Stripe columns

Revision ID: 007
Revises: 006
Create Date: 2026-06-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create PaymentProvider enum type
    paymentprovider_enum = sa.Enum("TOUCHPAY", "STRIPE", name="paymentprovider")
    paymentprovider_enum.create(op.get_bind(), checkfirst=True)

    # 2. Add STRIPE value to existing paymentmode enum
    op.execute("ALTER TYPE paymentmode ADD VALUE IF NOT EXISTS 'STRIPE'")

    # 3. Add provider column
    op.add_column(
        "payment_gateway_payments",
        sa.Column(
            "provider",
            paymentprovider_enum,
            nullable=False,
            server_default="TOUCHPAY",
        ),
    )

    # 4. Add Stripe-specific columns
    op.add_column(
        "payment_gateway_payments",
        sa.Column("stripe_payment_intent_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "payment_gateway_payments",
        sa.Column("stripe_client_secret", sa.String(500), nullable=True),
    )
    op.add_column(
        "payment_gateway_payments",
        sa.Column("stripe_data", JSON, nullable=True),
    )

    # 5. Create index on stripe_payment_intent_id
    op.create_index(
        "ix_pgp_stripe_pi_id",
        "payment_gateway_payments",
        ["stripe_payment_intent_id"],
    )


def downgrade() -> None:
    # Drop index and columns
    op.drop_index("ix_pgp_stripe_pi_id", table_name="payment_gateway_payments")
    op.drop_column("payment_gateway_payments", "stripe_data")
    op.drop_column("payment_gateway_payments", "stripe_client_secret")
    op.drop_column("payment_gateway_payments", "stripe_payment_intent_id")
    op.drop_column("payment_gateway_payments", "provider")

    # Drop provider enum
    op.execute("DROP TYPE IF EXISTS paymentprovider")

    # Note: Cannot remove 'STRIPE' from paymentmode enum in PostgreSQL
    # without recreating the type. Left as-is for safety.
