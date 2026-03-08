"""GDPR compliance: add consent_given_at, encrypt id_proof_no, widen column

Revision ID: 005_gdpr_compliance
Revises: 83f07ce99cd5
Create Date: 2026-03-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '005_gdpr_compliance'
down_revision: Union[str, None] = '83f07ce99cd5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # COMPLIANCE-3: Add consent_given_at column
    op.add_column('users', sa.Column('consent_given_at', sa.DateTime(timezone=True), nullable=True))

    # Backfill consent_given_at for existing users: use their created_at as implied consent
    op.execute("UPDATE users SET consent_given_at = created_at WHERE consent_given_at IS NULL")

    # COMPLIANCE-4: Widen id_proof_no column to accommodate Fernet-encrypted values
    op.alter_column('users', 'id_proof_no',
                    type_=sa.String(500),
                    existing_type=sa.String(100),
                    existing_nullable=True)

    # NOTE: Encryption of existing id_proof_no values must be done via a data migration
    # script since it requires the application encryption key. See scripts/encrypt_existing_id_proof.py


def downgrade() -> None:
    op.drop_column('users', 'consent_given_at')
    op.alter_column('users', 'id_proof_no',
                    type_=sa.String(100),
                    existing_type=sa.String(500),
                    existing_nullable=True)
