"""change_transaction_limit_to_decimal

Revision ID: 83f07ce99cd5
Revises: 98028f452b8d
Create Date: 2026-03-07 13:52:54.877637

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '83f07ce99cd5'
down_revision: Union[str, None] = '98028f452b8d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change transaction_limit from INTEGER to NUMERIC(10,2)
    # This represents the maximum amount per single transaction in USD
    op.alter_column('cards', 'transaction_limit',
                    type_=sa.Numeric(precision=10, scale=2),
                    existing_type=sa.Integer(),
                    nullable=False,
                    server_default='500.00')


def downgrade() -> None:
    # Revert back to INTEGER (truncates decimal values)
    op.alter_column('cards', 'transaction_limit',
                    type_=sa.Integer(),
                    existing_type=sa.Numeric(precision=10, scale=2),
                    nullable=False,
                    server_default='100')
