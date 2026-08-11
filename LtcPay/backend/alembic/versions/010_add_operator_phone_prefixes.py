"""Add phone_prefixes to country_operators

Revision ID: 010
Revises: 009
Create Date: 2026-08-11
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "country_operators",
        sa.Column("phone_prefixes", sa.JSON(), nullable=True),
    )

    # Backfill Cameroon with the ART ranges that are unambiguous.
    # The 68x split is intentionally left out until confirmed with the
    # operators: an unknown prefix is never blocked (mismatch-only check).
    op.execute(
        """
        UPDATE country_operators
        SET phone_prefixes = '["67", "650", "651", "652", "653", "654"]'
        WHERE country_code = 'CM' AND operator_code = 'MTN'
        """
    )
    op.execute(
        """
        UPDATE country_operators
        SET phone_prefixes = '["69", "655", "656", "657", "658", "659"]'
        WHERE country_code = 'CM' AND operator_code = 'ORANGE'
        """
    )


def downgrade() -> None:
    op.drop_column("country_operators", "phone_prefixes")
