"""FK cascade fixes, UNIQUE/CHECK constraints for audit trail and data integrity

Raw SQL migrations (002-004) already added columns (wallet_balance, country_code,
KYC fields, enum values, etc.). This migration only applies structural changes
that were not in those raw migrations:
- FK cascade changes on transactions for financial audit trail
- UNIQUE constraint on accountpe_user_id
- CHECK constraint on country_code format

Revision ID: 004
Revises: 003
Create Date: 2026-02-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ----------------------------------------------------------------
    # 1. Transactions: fix FK cascades for audit trail
    #    card_id: CASCADE -> SET NULL (preserve txn when card deleted)
    #    user_id: CASCADE -> RESTRICT (prevent user deletion if txns exist)
    # ----------------------------------------------------------------
    op.drop_constraint('transactions_card_id_fkey', 'transactions', type_='foreignkey')
    op.create_foreign_key(
        'transactions_card_id_fkey', 'transactions', 'cards',
        ['card_id'], ['id'], ondelete='SET NULL',
    )

    op.drop_constraint('transactions_user_id_fkey', 'transactions', type_='foreignkey')
    op.create_foreign_key(
        'transactions_user_id_fkey', 'transactions', 'users',
        ['user_id'], ['id'], ondelete='RESTRICT',
    )

    # ----------------------------------------------------------------
    # 2. Users: UNIQUE constraint on accountpe_user_id
    # ----------------------------------------------------------------
    op.create_unique_constraint(
        'uq_users_accountpe_user_id', 'users', ['accountpe_user_id']
    )

    # ----------------------------------------------------------------
    # 3. Users: CHECK constraint on country_code format (ISO 3166-1 alpha-2)
    # ----------------------------------------------------------------
    op.create_check_constraint(
        'ck_users_country_code_format', 'users', "country_code ~ '^[A-Z]{2}$'"
    )


def downgrade() -> None:
    # Remove CHECK constraint on country_code
    op.drop_constraint('ck_users_country_code_format', 'users', type_='check')

    # Remove UNIQUE constraint on accountpe_user_id
    op.drop_constraint('uq_users_accountpe_user_id', 'users', type_='unique')

    # Revert FK cascades back to CASCADE
    op.drop_constraint('transactions_user_id_fkey', 'transactions', type_='foreignkey')
    op.create_foreign_key(
        'transactions_user_id_fkey', 'transactions', 'users',
        ['user_id'], ['id'], ondelete='CASCADE',
    )

    op.drop_constraint('transactions_card_id_fkey', 'transactions', type_='foreignkey')
    op.create_foreign_key(
        'transactions_card_id_fkey', 'transactions', 'cards',
        ['card_id'], ['id'], ondelete='CASCADE',
    )
