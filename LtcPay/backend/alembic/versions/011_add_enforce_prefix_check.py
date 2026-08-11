"""Add enforce_phone_prefix_check to supported_countries

Revision ID: 011
Revises: 010
Create Date: 2026-08-11
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "supported_countries",
        sa.Column(
            "enforce_phone_prefix_check",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("supported_countries", "enforce_phone_prefix_check")
