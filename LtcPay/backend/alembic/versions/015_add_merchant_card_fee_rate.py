"""Add per-merchant card fee rate

Revision ID: 015
Revises: 014
Create Date: 2026-08-19

fee_rate stays the Mobile Money rate; fee_rate_card (nullable) is the
card-specific rate. Effective card rate = max(fee_rate_card or fee_rate,
platform card minimum 5%).
"""
from alembic import op
import sqlalchemy as sa

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("payment_merchants")}
    if "fee_rate_card" not in columns:
        op.add_column(
            "payment_merchants",
            sa.Column("fee_rate_card", sa.Numeric(5, 2), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("payment_merchants", "fee_rate_card")
