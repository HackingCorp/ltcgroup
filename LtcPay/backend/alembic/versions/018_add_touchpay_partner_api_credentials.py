"""Per-country credentials for TouchPay's partner API

check_status, get_balance and cashin authenticate with partner_id +
login_api + password_api, a different triple from the payin API's
agency + loginAgent + passwordAgent. Same agency, different keys.

Stored per country like the existing tp_* columns, with a global env
fallback, because each agency has its own set.

Revision ID: 018
Revises: 017
"""
import sqlalchemy as sa
from alembic import op

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None

TABLE = "supported_countries"
COLUMNS = ("tp_partner_id", "tp_login_api", "tp_password_api")


def _existing() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {c["name"] for c in inspector.get_columns(TABLE)}


def upgrade() -> None:
    present = _existing()
    for name in COLUMNS:
        if name not in present:
            op.add_column(
                TABLE,
                sa.Column(name, sa.Text(), nullable=False, server_default=""),
            )


def downgrade() -> None:
    present = _existing()
    for name in COLUMNS:
        if name in present:
            op.drop_column(TABLE, name)
