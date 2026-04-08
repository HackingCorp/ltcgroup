"""Add payment_mode, operator, operator_transaction_id, direct_api_data columns

Revision ID: 003
Revises: 002
Create Date: 2026-04-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    paymentmode_enum = sa.Enum("SDK", "DIRECT_API", name="paymentmode")
    paymentmode_enum.create(op.get_bind(), checkfirst=True)

    mobilemoneyoperator_enum = sa.Enum("MTN", "ORANGE", name="mobilemoneyoperator")
    mobilemoneyoperator_enum.create(op.get_bind(), checkfirst=True)

    # Add columns to payment_gateway_payments
    op.add_column(
        "payment_gateway_payments",
        sa.Column(
            "payment_mode",
            paymentmode_enum,
            nullable=False,
            server_default="SDK",
        ),
    )
    op.add_column(
        "payment_gateway_payments",
        sa.Column(
            "operator",
            mobilemoneyoperator_enum,
            nullable=True,
        ),
    )
    op.add_column(
        "payment_gateway_payments",
        sa.Column("operator_transaction_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "payment_gateway_payments",
        sa.Column("direct_api_data", JSON, nullable=True),
    )
    op.create_index(
        "ix_pgp_operator_txn_id",
        "payment_gateway_payments",
        ["operator_transaction_id"],
    )

    # Add default_payment_mode to payment_merchants
    op.add_column(
        "payment_merchants",
        sa.Column(
            "default_payment_mode",
            paymentmode_enum,
            nullable=False,
            server_default="SDK",
        ),
    )


def downgrade() -> None:
    # Drop columns from payment_merchants
    op.drop_column("payment_merchants", "default_payment_mode")

    # Drop columns from payment_gateway_payments
    op.drop_index("ix_pgp_operator_txn_id", table_name="payment_gateway_payments")
    op.drop_column("payment_gateway_payments", "direct_api_data")
    op.drop_column("payment_gateway_payments", "operator_transaction_id")
    op.drop_column("payment_gateway_payments", "operator")
    op.drop_column("payment_gateway_payments", "payment_mode")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS mobilemoneyoperator")
    op.execute("DROP TYPE IF EXISTS paymentmode")
