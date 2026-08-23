"""Add indicative display amount/currency on payments

Revision ID: 016
Revises: 015
Create Date: 2026-08-23

Purely cosmetic pair shown on the checkout page next to the total, for
merchants who price in a foreign currency. `amount`/`currency` remain the
only values ever charged or settled — LtcPay performs no conversion.
"""
from alembic import op
import sqlalchemy as sa

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("payment_gateway_payments")}
    if "display_amount" not in columns:
        op.add_column(
            "payment_gateway_payments",
            sa.Column("display_amount", sa.Numeric(14, 2), nullable=True),
        )
    if "display_currency" not in columns:
        op.add_column(
            "payment_gateway_payments",
            sa.Column("display_currency", sa.String(3), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("payment_gateway_payments", "display_currency")
    op.drop_column("payment_gateway_payments", "display_amount")
