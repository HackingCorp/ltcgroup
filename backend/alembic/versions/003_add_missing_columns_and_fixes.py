"""Add missing columns: accountpe_user_id, reset_token, updated_at on notifications; fix provider_transaction_id nullable and rename metadata to extra_data

Revision ID: 003
Revises: 002
Create Date: 2026-02-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing columns to users table
    op.add_column('users', sa.Column('accountpe_user_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('reset_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('reset_token_expires_at', sa.DateTime(timezone=True), nullable=True))

    # Add updated_at to notifications table
    op.add_column('notifications', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('now()')))

    # Fix provider_transaction_id: make nullable (was NOT NULL in migration 001)
    op.alter_column('transactions', 'provider_transaction_id', existing_type=sa.String(length=255), nullable=True)

    # Rename metadata column to extra_data in transactions
    op.alter_column('transactions', 'metadata', new_column_name='extra_data')

    # Add check constraints
    op.create_check_constraint('ck_cards_balance_positive', 'cards', 'balance >= 0')
    op.create_check_constraint('ck_transactions_amount_positive', 'transactions', 'amount > 0')


def downgrade() -> None:
    # Remove check constraints
    op.drop_constraint('ck_transactions_amount_positive', 'transactions', type_='check')
    op.drop_constraint('ck_cards_balance_positive', 'cards', type_='check')

    # Rename extra_data back to metadata
    op.alter_column('transactions', 'extra_data', new_column_name='metadata')

    # Revert provider_transaction_id to NOT NULL
    op.alter_column('transactions', 'provider_transaction_id', existing_type=sa.String(length=255), nullable=False)

    # Remove updated_at from notifications
    op.drop_column('notifications', 'updated_at')

    # Remove columns from users
    op.drop_column('users', 'reset_token_expires_at')
    op.drop_column('users', 'reset_token')
    op.drop_column('users', 'accountpe_user_id')
