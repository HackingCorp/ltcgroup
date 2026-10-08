"""Seed SebPay's operators for every country it serves

Revision ID: 022
Revises: 021
Create Date: 2026-10-08

Snapshot of SebPay's catalogue (GET /p/operators, 2026-10-08): 57 operators
in 20 countries. Each becomes a SEBPAY row in country_operators, so nothing
has to be entered by hand; POST /admin/providers/sebpay/sync-operators
refreshes them later from the live catalogue.

- A SebPay country LtcPay does not have yet is created INACTIVE, with its
  numbering plan (phone_digits = national number after the country code).
  Countries that exist are never modified.
- Display settings (name, colour, logo, limits, prefixes) are copied from
  another provider's row for the same operator when there is one, so the
  checkout shows one consistent button.
- No country is linked to SEBPAY: routing stays an explicit choice.

Idempotent: rows that already exist are left alone.
"""
from alembic import op
import sqlalchemy as sa

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


# code, name, currency, phone_prefix, phone_digits, phone_pattern, default_city
COUNTRIES = [
    ("BF", "Burkina Faso", "XOF", "226", 8, "XX XX XX XX", "Ouagadougou"),
    ("BJ", "Benin", "XOF", "229", 10, "01 XX XX XX XX", "Cotonou"),
    ("CD", "RD Congo", "CDF", "243", 9, "XX XXX XXXX", "Kinshasa"),
    ("CG", "Congo", "XAF", "242", 9, "0X XXX XXXX", "Brazzaville"),
    ("CI", "Cote d'Ivoire", "XOF", "225", 10, "XX XX XX XX XX", "Abidjan"),
    ("CM", "Cameroun", "XAF", "237", 9, "6XX XX XX XX", "Douala"),
    ("GA", "Gabon", "XAF", "241", 9, "0XX XX XX XX", "Libreville"),
    ("GH", "Ghana", "GHS", "233", 9, "XX XXX XXXX", "Accra"),
    ("GM", "Gambie", "GMD", "220", 7, "XXX XXXX", "Banjul"),
    ("GN", "Guinee", "GNF", "224", 9, "6XX XX XX XX", "Conakry"),
    ("GW", "Guinee-Bissau", "XOF", "245", 9, "9XX XXX XXX", "Bissau"),
    ("KE", "Kenya", "KES", "254", 9, "7XX XXX XXX", "Nairobi"),
    ("ML", "Mali", "XOF", "223", 8, "XX XX XX XX", "Bamako"),
    ("NE", "Niger", "XOF", "227", 8, "XX XX XX XX", "Niamey"),
    ("NG", "Nigeria", "NGN", "234", 10, "XXX XXX XXXX", "Lagos"),
    ("SN", "Senegal", "XOF", "221", 9, "7X XXX XX XX", "Dakar"),
    ("TD", "Tchad", "XAF", "235", 8, "XX XX XX XX", "N'Djamena"),
    ("TG", "Togo", "XOF", "228", 8, "XX XX XX XX", "Lome"),
    ("TZ", "Tanzanie", "TZS", "255", 9, "7XX XXX XXX", "Dar es Salaam"),
    ("UG", "Ouganda", "UGX", "256", 9, "7XX XXX XXX", "Kampala"),
]

# country, our operator_code, SebPay operator code (service_code), name,
# otp_required, USSD giving the OTP, collectable, logo
OPERATORS = [
    ('BF', 'MOOV', 'moov', 'Moov Money', False, '', True, ''),
    ('BF', 'ORANGE', 'orange', 'Orange Money', True, '*144*4*6*montant#', True, ''),
    ('BF', 'LIGDICASH', 'wligdicash', 'Wallet LigdiCash', False, '', True, ''),
    ('BJ', 'CELTIIS', 'celtiis', 'Celtiis Money', False, '', True, ''),
    ('BJ', 'CORIS', 'coris', 'Coris Money', False, '', True, ''),
    ('BJ', 'MOOV', 'moov', 'Moov Money', False, '', True, 'https://moovmoney.ga/wp-content/uploads/2018/02/logo-moov-money-2x.png'),
    ('BJ', 'MTN', 'mtn', 'MTN Money', False, '', True, 'https://momo.mtn.com/wp-content/uploads/sites/15/2022/07/Group-360.png?w=360'),
    ('CD', 'AFRIMONEY', 'AFRIMONEY', 'Afri Money', False, '', True, ''),
    ('CD', 'AIRTEL', 'airtel', 'Airtel Money', False, '', True, ''),
    ('CD', 'MPESA', 'mpesa', 'Mpesa Money', False, '', True, ''),
    ('CD', 'ORANGE', 'orange', 'Orange Money', False, '', True, ''),
    ('CD', 'VODACOM', 'vodacom', 'Vodacom', False, '', True, ''),
    ('CG', 'AIRTEL', 'airtel', 'Airtel Money', False, '', True, ''),
    ('CG', 'MTN', 'mtn', 'MTN Money', False, '', True, ''),
    ('CI', 'MOOV', 'moov', 'Moov Money', False, '', True, ''),
    ('CI', 'MTN', 'mtn', 'MTN Money', False, '', True, ''),
    ('CI', 'ORANGE', 'orange', 'Orange Money', True, '#144*82#', True, ''),
    ('CI', 'WAVE', 'wave', 'Wave Money', False, '', True, ''),
    ('CM', 'MTN', 'MTN', 'MTN Money', False, '', True, ''),
    ('CM', 'ORANGE', 'ORANGE', 'Orange Money', False, '', True, ''),
    ('GA', 'AIRTEL', 'airtel', 'Airtel Money', False, '', True, ''),
    ('GA', 'MOOV', 'moov', 'Moov Money', False, '', True, ''),
    ('GH', 'AIRTEL', 'airtel', 'AIRTEL', False, '', True, ''),
    ('GH', 'MTN', 'mtn', 'MTN Money', False, '', True, ''),
    ('GH', 'TELECEL', 'telecel', 'TELECEL CASH', False, '', True, ''),
    ('GM', 'AFRIMONEY', 'afrimoney', 'Afri Money', False, '', True, ''),
    ('GN', 'MTN', 'mtn', 'MTN Money', False, '', True, ''),
    ('GN', 'ORANGE', 'orange', 'Orange Money', False, '', True, ''),
    ('GW', 'ORANGE', 'orange', 'Orange Money', False, '', True, ''),
    ('KE', 'AIRTEL', 'airtel', 'Airtel', False, '', True, ''),
    ('KE', 'MPESA', 'mpesa', 'Mpesa', False, '', True, ''),
    ('ML', 'MOBICASH', 'mobicash', 'Mobicash', False, '', True, ''),
    ('ML', 'MOOV', 'moov', 'Moov Money', False, '', True, ''),
    ('ML', 'ORANGE', 'orange', 'Orange Money', False, '', True, ''),
    ('NE', 'AIRTEL', 'airtel', 'Airtel Money', False, '', True, ''),
    ('NE', 'AMANATA', 'amanata', 'Amanata', False, '', True, ''),
    ('NE', 'MOOV', 'moov', 'Moov Money', False, '', True, ''),
    ('NE', 'NITA', 'nita', 'Nita', False, '', True, ''),
    ('NE', 'LIGDICASH', 'wligdicash', 'Wallet LigdiCash', False, '', True, ''),
    ('NE', 'ZAMANI', 'zamani', 'Zamani', False, '', True, ''),
    ('NG', 'AIRTEL', 'airtel', 'AIRTEL', False, '', True, ''),
    ('NG', 'MTN', 'mtn', 'MTN Money', False, '', True, ''),
    ('SN', 'EMONEY', 'emoney', 'E-money', False, '', False, ''),
    ('SN', 'FREE', 'free', 'Free Money', False, '', True, ''),
    ('SN', 'ORANGE', 'orange', 'Orange Money', False, '', True, ''),
    ('SN', 'WAVE', 'wave', 'Wave Money', False, '', True, ''),
    ('TD', 'AIRTEL', 'airtel', 'Airtel', False, '', False, ''),
    ('TD', 'MOOV', 'moov', 'Moov', False, '', True, ''),
    ('TG', 'MOOV', 'moov', 'Moov Money', False, '', True, ''),
    ('TG', 'TMONEY', 'togocom', 'TogoCom', False, '', True, ''),
    ('TZ', 'AIRTEL', 'AIRTEL', 'Airtel', False, '', True, ''),
    ('TZ', 'EZYPESA', 'EZY PESA', 'Ezy pesa', False, '', True, ''),
    ('TZ', 'HALOPESA', 'HALO PESA', 'Halo Pesa', False, '', True, 'https://halopesa.co.tz/images/applications-system.png'),
    ('TZ', 'MPESA', 'MPESA', 'Mpesa', False, '', True, ''),
    ('TZ', 'TIGOPESA', 'TIGO PESA', 'Tigo pesa', False, '', True, ''),
    ('UG', 'AIRTEL', 'airtel', 'Airtel', False, '', True, ''),
    ('UG', 'MTN', 'mtn', 'Mtn', False, '', True, ''),
]


# Brand colour when no other provider's row lends one.
COLORS = {
    "MTN": "#FFCC00", "ORANGE": "#FF6B00", "MOOV": "#0066B3", "WAVE": "#1DC8F1",
    "AIRTEL": "#E40000", "MPESA": "#4CB050", "VODACOM": "#E60000",
    "AFRIMONEY": "#003399", "TMONEY": "#00A651", "FREE": "#CD0000",
    "CELTIIS": "#F39200", "TELECEL": "#E30613",
}


def _flag(code: str) -> str:
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in code)


def upgrade() -> None:
    conn = op.get_bind()

    # Every parameter is cast: asyncpg refuses one whose type it deduces
    # differently in two places of the same statement.
    for code, name, currency, prefix, digits, pattern, city in COUNTRIES:
        conn.execute(
            sa.text(
                "INSERT INTO supported_countries "
                "(code, name, currency, phone_prefix, phone_digits, phone_pattern, "
                " flag_emoji, default_city, min_amount, max_amount, "
                " enforce_phone_prefix_check, tp_agency_code, tp_login, tp_password, "
                " tp_secret, tp_merchant_id, tp_secure_code, tp_merchant_website, "
                " tp_sdk_url, tp_partner_id, tp_login_api, tp_password_api, "
                " tp_direct_api_url, is_active, created_at, updated_at) "
                "SELECT CAST(:code AS VARCHAR), CAST(:name AS VARCHAR), "
                "       CAST(:currency AS VARCHAR), CAST(:prefix AS VARCHAR), "
                "       CAST(:digits AS INTEGER), CAST(:pattern AS VARCHAR), "
                "       CAST(:flag AS VARCHAR), CAST(:city AS VARCHAR), 100, 500000, "
                "       true, '', '', '', '', '', '', '', "
                "       'https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.1.js', "
                "       '', '', '', "
                "       'https://apidist.gutouch.net/apidist/sec/touchpayapi', "
                "       false, now(), now() "
                "WHERE NOT EXISTS (SELECT 1 FROM supported_countries "
                "                  WHERE code = CAST(:code AS VARCHAR) "
                "                     OR phone_prefix = CAST(:prefix AS VARCHAR))"
            ),
            {"code": code, "name": name, "currency": currency, "prefix": prefix,
             "digits": digits, "pattern": pattern, "flag": _flag(code), "city": city},
        )

    for cc, op_code, service_code, name, otp, ussd, active, logo in OPERATORS:
        conn.execute(
            sa.text(
                "INSERT INTO country_operators "
                "(id, country_code, operator_code, provider_code, operator_name, service_code, "
                " color, logo_url, min_amount, max_amount, ussd_code, phone_prefixes, "
                " otp_required, is_active, created_at, updated_at) "
                "SELECT gen_random_uuid(), c.code, CAST(:op_code AS VARCHAR), 'SEBPAY', "
                "       COALESCE(s.operator_name, CAST(:name AS VARCHAR)), "
                "       CAST(:service_code AS VARCHAR), "
                "       COALESCE(s.color, CAST(:color AS VARCHAR)), "
                "       COALESCE(NULLIF(s.logo_url, ''), CAST(:logo AS VARCHAR)), "
                "       COALESCE(s.min_amount, c.min_amount), "
                "       COALESCE(s.max_amount, c.max_amount), "
                "       CASE WHEN CAST(:otp AS BOOLEAN) THEN CAST(:ussd AS VARCHAR) "
                "            ELSE COALESCE(s.ussd_code, '') END, "
                "       COALESCE(s.phone_prefixes, CAST('[]' AS JSON)), "
                "       CAST(:otp AS BOOLEAN), CAST(:active AS BOOLEAN), now(), now() "
                "FROM supported_countries c "
                "LEFT JOIN LATERAL ("
                "    SELECT * FROM country_operators x "
                "    WHERE x.country_code = c.code "
                "      AND x.operator_code = CAST(:op_code AS VARCHAR) "
                "      AND x.provider_code <> 'SEBPAY' "
                "    ORDER BY x.is_active DESC LIMIT 1"
                ") s ON true "
                "WHERE c.code = CAST(:cc AS VARCHAR) "
                "  AND NOT EXISTS (SELECT 1 FROM country_operators y "
                "                  WHERE y.country_code = CAST(:cc AS VARCHAR) "
                "                    AND y.provider_code = 'SEBPAY' "
                "                    AND y.operator_code = CAST(:op_code AS VARCHAR))"
            ),
            {"cc": cc, "op_code": op_code, "service_code": service_code, "name": name,
             "otp": otp, "ussd": ussd, "active": active, "logo": logo,
             "color": COLORS.get(op_code, "#555555")},
        )


def downgrade() -> None:
    # Operator rows only: countries this created may since have been
    # configured and used, and are not ours to drop.
    op.execute("DELETE FROM country_operators WHERE provider_code = 'SEBPAY'")
