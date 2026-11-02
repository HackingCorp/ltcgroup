"""Add the Central African Republic (CF), collected through Smobilpay Orange

Revision ID: 027
Revises: 026
Create Date: 2026-11-02

Smobilpay's catalogue collects Orange Money RCA (service 600009, merchant
RCAOM); no other provider of ours covers the country. Created:
  - the country, INACTIVE: XAF, +236, 8 digits after the code;
  - a SMOBILPAY Orange row. Its payItemId is staging's: the catalogue sync
    replaces it with the live one. Prefixes 72/74 come from Smobilpay's own
    validation mask for the service;
  - a SMOBILPAY country link, priority 1.
Nothing is routed until an admin activates the country and the Smobilpay
provider. Idempotent.
"""
from alembic import op

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO supported_countries
            (code, name, currency, phone_prefix, phone_digits, phone_pattern,
             flag_emoji, default_city, min_amount, max_amount,
             enforce_phone_prefix_check, tp_agency_code, tp_login, tp_password,
             tp_secret, tp_merchant_id, tp_secure_code, tp_merchant_website,
             tp_sdk_url, tp_partner_id, tp_login_api, tp_password_api,
             tp_direct_api_url, is_active, created_at, updated_at)
        SELECT 'CF', 'République Centrafricaine', 'XAF', '236', 8, 'XX XX XX XX',
               '🇨🇫', 'Bangui', 100, 500000,
               true, '', '', '', '', '', '', '',
               'https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.1.js',
               '', '', '',
               'https://apidist.gutouch.net/apidist/sec/touchpayapi',
               false, now(), now()
        WHERE NOT EXISTS (
            SELECT 1 FROM supported_countries WHERE code = 'CF' OR phone_prefix = '236'
        )
        """
    )
    op.execute(
        """
        INSERT INTO country_operators
            (id, country_code, operator_code, provider_code, operator_name, service_code,
             color, logo_url, min_amount, max_amount, ussd_code, phone_prefixes,
             otp_required, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), 'CF', 'ORANGE', 'SMOBILPAY', 'Orange Money',
               'S-112-949-RCAOM-600009-900521-1', '#FF6B00',
               COALESCE((SELECT logo_url FROM country_operators
                         WHERE operator_code = 'ORANGE' AND logo_url <> ''
                         ORDER BY country_code = 'CM' DESC LIMIT 1), ''),
               100, 500000, '#144#', '["72", "74"]'::json,
               false, true, now(), now()
        WHERE EXISTS (SELECT 1 FROM supported_countries WHERE code = 'CF')
          AND NOT EXISTS (
            SELECT 1 FROM country_operators
            WHERE country_code = 'CF' AND operator_code = 'ORANGE' AND provider_code = 'SMOBILPAY'
        )
        """
    )
    op.execute(
        """
        INSERT INTO country_providers
            (id, country_code, provider_code, priority, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), 'CF', 'SMOBILPAY', 1, true, now(), now()
        WHERE EXISTS (SELECT 1 FROM supported_countries WHERE code = 'CF')
          AND EXISTS (SELECT 1 FROM payment_providers WHERE code = 'SMOBILPAY')
          AND NOT EXISTS (
            SELECT 1 FROM country_providers
            WHERE country_code = 'CF' AND provider_code = 'SMOBILPAY'
        )
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM country_providers WHERE country_code = 'CF'")
    op.execute("DELETE FROM country_operators WHERE country_code = 'CF'")
    op.execute("DELETE FROM supported_countries WHERE code = 'CF'")
