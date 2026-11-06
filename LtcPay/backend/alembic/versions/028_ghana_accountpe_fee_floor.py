"""Ghana AccountPE fee floor: cover its 2.45% cost + 0.5pt margin

Revision ID: 028
Revises: 027
Create Date: 2026-11-06

PAY-BBDC394E435A4B89 (2026-11-05): AccountPE credited 744.30 GHS on a
763.00 GHS collection — 2.45% — while no floor was set for Ghana, so the
merchant was billed the 1.75% default. Lost 5.70 GHS on this single payin
(750 GHS owed to the merchant, 744.30 received).

Sets provider_fee_rate=2.45, min_fee_rate=2.95 on every ACCOUNTPE row in
GH (MTN, Airtel, Vodafone). Only this one data point is confirmed — no
other country's AccountPE cost is known, so none is touched here.
"""
from alembic import op

revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE country_operators
        SET provider_fee_rate = 2.45, min_fee_rate = 2.95, updated_at = now()
        WHERE country_code = 'GH' AND provider_code = 'ACCOUNTPE'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE country_operators
        SET provider_fee_rate = NULL, min_fee_rate = NULL, updated_at = now()
        WHERE country_code = 'GH' AND provider_code = 'ACCOUNTPE'
        """
    )
