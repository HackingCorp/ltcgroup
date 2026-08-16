"""Add multi-provider support: provider registry, per-country routing, provider-scoped operators

Revision ID: 012
Revises: 011
Create Date: 2026-08-16

- payment_providers: PSP registry with MOBILE/CARD group, global kill-switch,
  account-level config. Seeded with TOUCHPAY, STRIPE, ACCOUNTPE.
- country_providers: (country, provider) routing rows with priority
  (1=default, 2=secondary) and per-country toggle. Backfilled with TOUCHPAY
  priority 1 for every existing country -> behavior unchanged.
- country_operators: new provider_code column (backfilled to TOUCHPAY);
  unique constraint widened to (country, provider, operator).
- paymentprovider enum: add ACCOUNTPE value.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Extend the paymentprovider enum used by payment_gateway_payments
    op.execute("ALTER TYPE paymentprovider ADD VALUE IF NOT EXISTS 'ACCOUNTPE'")

    # 2. Provider registry
    providergroup = sa.Enum("MOBILE", "CARD", name="providergroup")
    providergroup.create(bind, checkfirst=True)

    op.create_table(
        "payment_providers",
        sa.Column("code", sa.String(20), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("provider_group", providergroup, nullable=False, server_default="MOBILE"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.execute(
        """
        INSERT INTO payment_providers (code, name, provider_group, is_active, config)
        VALUES
          ('TOUCHPAY',  'TouchPay (InTouch)',      'MOBILE', true,  '{}'),
          ('STRIPE',    'Stripe',                  'CARD',   true,  '{}'),
          ('ACCOUNTPE', 'AccountPE (Swychr)',      'MOBILE', false, '{}')
        """
    )

    # 3. Per-country provider routing
    op.create_table(
        "country_providers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("country_code", sa.String(2), sa.ForeignKey("supported_countries.code", ondelete="CASCADE"), nullable=False),
        sa.Column("provider_code", sa.String(20), sa.ForeignKey("payment_providers.code", ondelete="CASCADE"), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("credentials", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("country_code", "provider_code", name="uq_country_provider"),
    )
    # Every existing country keeps TouchPay as its default provider.
    op.execute(
        """
        INSERT INTO country_providers (country_code, provider_code, priority, is_active)
        SELECT code, 'TOUCHPAY', 1, true FROM supported_countries
        """
    )

    # 4. Scope operators to a provider
    op.add_column(
        "country_operators",
        sa.Column("provider_code", sa.String(20), nullable=False, server_default="TOUCHPAY"),
    )
    op.drop_constraint("uq_country_operator", "country_operators", type_="unique")
    op.create_unique_constraint(
        "uq_country_provider_operator",
        "country_operators",
        ["country_code", "provider_code", "operator_code"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_country_provider_operator", "country_operators", type_="unique")
    op.create_unique_constraint(
        "uq_country_operator", "country_operators", ["country_code", "operator_code"],
    )
    op.drop_column("country_operators", "provider_code")
    op.drop_table("country_providers")
    op.drop_table("payment_providers")
    op.execute("DROP TYPE IF EXISTS providergroup")
    # Postgres cannot remove a value from an enum; ACCOUNTPE stays.
