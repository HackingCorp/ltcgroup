"""Negotiated Mobile Money rates per merchant, country and operator

A merchant carries one Mobile Money rate, but what an operator costs is not
uniform — 1.5% on Cameroon MTN against 4% on Congo Airtel. Platform floors
(country_operators.min_fee_rate) keep nobody selling below cost, but they
apply to everyone: there was no way to agree a rate with one merchant for
one country, or for a single operator inside it.

A row with operator_code NULL covers the whole country; a row naming an
operator wins over it. No row = the merchant's own rate, floored as before.

Revision ID: 020
Revises: 019
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "merchant_operator_rates" in sa.inspect(bind).get_table_names():
        return

    op.create_table(
        "merchant_operator_rates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "merchant_id", UUID(as_uuid=True),
            sa.ForeignKey("payment_merchants.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("country_code", sa.String(2), nullable=False),
        # NULL = every operator of the country; a named operator overrides it.
        sa.Column("operator_code", sa.String(20), nullable=True),
        sa.Column("fee_rate", sa.Numeric(5, 2), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
    )
    # NULLS NOT DISTINCT so a second country-wide row cannot be inserted:
    # without it Postgres treats every NULL operator_code as unique.
    op.create_index(
        "uq_merchant_country_operator_rate",
        "merchant_operator_rates",
        ["merchant_id", "country_code", "operator_code"],
        unique=True,
        postgresql_nulls_not_distinct=True,
    )
    op.create_index(
        "ix_merchant_operator_rates_merchant",
        "merchant_operator_rates",
        ["merchant_id"],
    )


def downgrade() -> None:
    op.drop_table("merchant_operator_rates")
