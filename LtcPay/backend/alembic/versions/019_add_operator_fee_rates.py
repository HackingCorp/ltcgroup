"""Per-operator provider cost and billing floor

TouchPay's commission is not one rate: it is 1.5% in Cameroon, 2.5% in
Gabon and Mali, 3.5% on Congo MTN and 4% on Congo Airtel — while every
merchant is billed a single rate of their own. Measured over 30 days,
that lost 10 070 XAF in Congo and 1 069 XAF in Gabon, covered by
Cameroon's margin.

provider_fee_rate records what the provider takes for this operator, and
min_fee_rate the floor we bill for it. Both nullable: no value means the
merchant's own rate applies, exactly as before.

Revision ID: 019
Revises: 018
"""
import sqlalchemy as sa
from alembic import op

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("country_operators")}
    if "provider_fee_rate" not in columns:
        op.add_column(
            "country_operators",
            sa.Column("provider_fee_rate", sa.Numeric(5, 2), nullable=True),
        )
    if "min_fee_rate" not in columns:
        op.add_column(
            "country_operators",
            sa.Column("min_fee_rate", sa.Numeric(5, 2), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("country_operators", "min_fee_rate")
    op.drop_column("country_operators", "provider_fee_rate")
