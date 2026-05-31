"""
Alembic async environment configuration for LtcPay.
"""
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from app.core.config import settings
from app.core.database import Base

# Import all models so Base.metadata knows about them
from app.models.merchant import Merchant  # noqa: F401
from app.models.payment import Payment  # noqa: F401
from app.models.transaction import Transaction  # noqa: F401
from app.models.admin_user import AdminUser  # noqa: F401
from app.models.withdrawal import Withdrawal  # noqa: F401
from app.models.payment_link import PaymentLink  # noqa: F401
from app.models.refund import Refund  # noqa: F401
from app.models.invoice import Invoice  # noqa: F401
from app.models.notification import Notification, NotificationPreference  # noqa: F401
from app.models.report import Report  # noqa: F401
from app.models.team_member import MerchantTeamMember  # noqa: F401
from app.models.kyc import KycSubmission, KycDocument  # noqa: F401
from app.models.fee_rule import FeeRule, FeeOverride  # noqa: F401
from app.models.dispute import Dispute  # noqa: F401
from app.models.webhook_log import WebhookLog  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    return settings.database_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
