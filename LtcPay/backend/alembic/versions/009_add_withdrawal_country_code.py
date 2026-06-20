"""Add country_code to merchant_withdrawals

Revision ID: 009_withdrawal_country
Revises: 008_multi_country
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "009_withdrawal_country"
down_revision = "008_multi_country"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "merchant_withdrawals",
        sa.Column("country_code", sa.String(2), nullable=True),
    )
    op.create_index(
        "ix_merchant_withdrawals_country_code",
        "merchant_withdrawals",
        ["country_code"],
    )


def downgrade() -> None:
    op.drop_index("ix_merchant_withdrawals_country_code", table_name="merchant_withdrawals")
    op.drop_column("merchant_withdrawals", "country_code")
