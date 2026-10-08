"""Give SebPay rows the operator codes the other providers already use

Revision ID: 023
Revises: 022
Create Date: 2026-10-08

022 turned SebPay's "EZY PESA", "HALO PESA" and "TIGO PESA" into EZYPESA,
HALOPESA and TIGOPESA, while the AccountPE rows for the same Tanzanian
operators are EZY_PESA, HALO_PESA and TIGO_PESA. Different codes are
different operators to LtcPay: the checkout showed each one twice.

A SEBPAY row whose code equals another provider's code once underscores
are dropped takes that code, and that row's display settings, unless a
SEBPAY row already holds it. Idempotent.
"""
from alembic import op

revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE country_operators s
        SET operator_code = o.operator_code,
            operator_name = o.operator_name,
            color = o.color,
            logo_url = CASE WHEN o.logo_url <> '' THEN o.logo_url ELSE s.logo_url END,
            min_amount = o.min_amount,
            max_amount = o.max_amount,
            phone_prefixes = o.phone_prefixes,
            updated_at = now()
        FROM (
            SELECT DISTINCT ON (country_code, operator_code)
                   country_code, operator_code, operator_name, color, logo_url,
                   min_amount, max_amount, phone_prefixes
            FROM country_operators
            WHERE provider_code <> 'SEBPAY'
            ORDER BY country_code, operator_code, is_active DESC
        ) o
        WHERE s.provider_code = 'SEBPAY'
          AND o.country_code = s.country_code
          AND o.operator_code <> s.operator_code
          AND replace(o.operator_code, '_', '') = replace(s.operator_code, '_', '')
          AND NOT EXISTS (
              SELECT 1 FROM country_operators d
              WHERE d.country_code = s.country_code
                AND d.provider_code = 'SEBPAY'
                AND d.operator_code = o.operator_code
          )
        """
    )


def downgrade() -> None:
    pass  # the old codes were the bug
