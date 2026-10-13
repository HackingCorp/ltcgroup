"""E-nkap as the fourth Mobile Money provider: operator rows in XAF countries

Revision ID: 024
Revises: 023
Create Date: 2026-10-13

E-nkap's hosted page collects Mobile Money too. It now sits on the Mobile
Money rail behind every push provider (provider_service.HOSTED_MOBILE_
PROVIDERS): the router reaches it only when they all failed or none serves
the operator — Chad since SebPay was withdrawn on 2026-10-12.

Its orders are XAF-only, so rows are created for the XAF countries E-nkap
covers and LtcPay has: Cameroon, Gabon, Chad. One ENKAP row per operator
code another provider already has there, with that row's display settings.
No country link is created and no floor is set (E-nkap's Mobile Money cost
is not known). Idempotent.
"""
from alembic import op

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None

COUNTRIES = ("CM", "GA", "TD")


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
    op.execute("DELETE FROM country_operators WHERE provider_code = 'ENKAP'")
