"""add notifications and kyc_rejected_reason

Revision ID: 002
Revises: 001
Create Date: 2026-02-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add kyc_rejected_reason to users table
    op.add_column('users', sa.Column('kyc_rejected_reason', sa.String(length=500), nullable=True))

    # Create notification_type enum
    notification_type_enum = postgresql.ENUM(
        'TRANSACTION', 'KYC', 'CARD', 'SYSTEM',
        name='notificationtype',
        create_type=True
    )
    notification_type_enum.create(op.get_bind())

    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.String(length=500), nullable=False),
        sa.Column('type', notification_type_enum, nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )

    # Create indexes
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])


def downgrade() -> None:
    # Drop notifications table and indexes
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_is_read', table_name='notifications')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    op.drop_table('notifications')

    # Drop notification_type enum
    notification_type_enum = postgresql.ENUM(
        'TRANSACTION', 'KYC', 'CARD', 'SYSTEM',
        name='notificationtype'
    )
    notification_type_enum.drop(op.get_bind())

    # Remove kyc_rejected_reason from users table
    op.drop_column('users', 'kyc_rejected_reason')
