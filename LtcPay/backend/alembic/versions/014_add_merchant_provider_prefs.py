"""Add per-merchant provider routing preferences

Revision ID: 014
Revises: 013
Create Date: 2026-08-18
"""
from alembic import op
import sqlalchemy as sa

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("payment_merchants")}
    if "provider_prefs" not in columns:
        op.add_column(
            "payment_merchants",
            sa.Column("provider_prefs", sa.JSON(), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("payment_merchants", "provider_prefs")
