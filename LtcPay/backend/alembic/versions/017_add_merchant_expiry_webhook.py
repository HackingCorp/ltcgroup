"""Per-merchant opt-in for the payment-expired webhook

Entering EXPIRED deliberately sends no webhook: it is our own timeout, not
an operator verdict, and a late callback can still flip the payment to
COMPLETED. The documented consequence is that merchants must poll to notice
an abandoned checkout — one integrator accumulated 231 links stuck "pending"
back to December 2025 before catching up.

Emitting the webhook for everyone would push an event existing integrations
do not expect, so it is opt-in: off by default, nothing changes for anyone
who does not ask for it.

Revision ID: 017
Revises: 016
"""
import sqlalchemy as sa
from alembic import op

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None

TABLE = "payment_merchants"
COLUMN = "webhook_on_expiry"


def _has_column() -> bool:
    inspector = sa.inspect(op.get_bind())
    return COLUMN in {c["name"] for c in inspector.get_columns(TABLE)}


def upgrade() -> None:
    if _has_column():
        return
    op.add_column(
        TABLE,
        sa.Column(
            COLUMN, sa.Boolean(), nullable=False, server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    if _has_column():
        op.drop_column(TABLE, COLUMN)
