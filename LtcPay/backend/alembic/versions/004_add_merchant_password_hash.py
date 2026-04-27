"""Add merchant password_hash for portal login

Revision ID: 004
Revises: 003
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE payment_merchants ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)"
    )


def downgrade() -> None:
    op.drop_column("payment_merchants", "password_hash")
