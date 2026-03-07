"""add_card_daily_and_transaction_limits

Revision ID: 98028f452b8d
Revises: 004
Create Date: 2026-03-07 11:28:11.867194

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98028f452b8d'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add daily_limit column (max spend per day in USD)
    op.add_column('cards', sa.Column('daily_limit', sa.Numeric(precision=10, scale=2), nullable=False, server_default='500.00'))

    # Add transaction_limit column (max number of transactions per day)
    op.add_column('cards', sa.Column('transaction_limit', sa.Integer(), nullable=False, server_default='100'))


def downgrade() -> None:
    op.drop_column('cards', 'transaction_limit')
    op.drop_column('cards', 'daily_limit')
