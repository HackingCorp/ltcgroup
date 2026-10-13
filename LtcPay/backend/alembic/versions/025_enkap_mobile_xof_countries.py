"""E-nkap Mobile Money rows in the XOF countries it covers

Revision ID: 025
Revises: 024
Create Date: 2026-10-13

024 stopped at the XAF countries on the belief that E-nkap's XAF-only
orders ruled XOF out. They do not: XOF is at a fixed 1:1 parity with XAF,
and E-nkap charges the customer in their own currency on its page. So the
XOF countries E-nkap covers and LtcPay has get their rows too: Benin,
Burkina Faso, Côte d'Ivoire, Mali, Senegal, Togo. Same rules as 024: rows
copied from the other providers' operators, no link, no floor. Idempotent.
"""
from alembic import op

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None

COUNTRIES = ("BJ", "BF", "CI", "ML", "SN", "TG")


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO country_operators
            (id, country_code, operator_code, provider_code, operator_name, service_code,
             color, logo_url, min_amount, max_amount, ussd_code, phone_prefixes,
             otp_required, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), o.country_code, o.operator_code, 'ENKAP', o.operator_name,
               'ENKAP', o.color, o.logo_url, o.min_amount, o.max_amount, '',
               o.phone_prefixes, false, true, now(), now()
        FROM (
            SELECT DISTINCT ON (country_code, operator_code)
                   country_code, operator_code, operator_name, color, logo_url,
                   min_amount, max_amount, phone_prefixes
            FROM country_operators
            WHERE provider_code <> 'ENKAP'
              AND country_code IN {COUNTRIES}
            ORDER BY country_code, operator_code, is_active DESC
        ) o
        WHERE NOT EXISTS (
            SELECT 1 FROM country_operators e
            WHERE e.country_code = o.country_code
              AND e.operator_code = o.operator_code
              AND e.provider_code = 'ENKAP'
        )
        """
    )


def downgrade() -> None:
    op.execute(f"DELETE FROM country_operators WHERE provider_code = 'ENKAP' AND country_code IN {COUNTRIES}")
