"""Drop cvv_encrypted column for PCI DSS compliance

CVV must never be stored, even encrypted. It is now fetched from
AccountPE on demand via the /reveal endpoint.

Revision ID: 005_drop_cvv
Revises: 83f07ce99cd5
Create Date: 2026-03-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_drop_cvv'
down_revision: Union[str, None] = '83f07ce99cd5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('cards', 'cvv_encrypted')


def downgrade() -> None:
    # Re-add the column (data is lost — intentional for PCI compliance)
    op.add_column('cards', sa.Column('cvv_encrypted', sa.String(255), nullable=True))
