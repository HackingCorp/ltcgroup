"""
LtcPay - Payment Provider Models

Tables:
  - payment_providers: PSP registry (TouchPay, Stripe, AccountPE, ...) with
    a global kill-switch and account-level config (encrypted values).
  - country_providers: which providers serve which country, with a priority
    (1 = default, 2 = secondary/fallback) and a per-country toggle.

Provider groups split the registry in two rails:
  - MOBILE: mobile money / digital cash (TouchPay, AccountPE)
  - CARD:   bank cards (Stripe)

Routing rule for mobile payments: among the country's providers that are
active globally AND in that country AND have the requested operator active,
try them in priority order. Failover to the next one only on provider-side
errors, never on customer-caused rejections.
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, Enum as SQLEnum, ForeignKey, Integer, JSON, String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProviderGroup(str, enum.Enum):
    MOBILE = "MOBILE"
    CARD = "CARD"


class ProviderConfig(Base):
    """A payment service provider available on the platform."""

    __tablename__ = "payment_providers"

    code: Mapped[str] = mapped_column(String(20), primary_key=True)  # "TOUCHPAY", "ACCOUNTPE"
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_group: Mapped[ProviderGroup] = mapped_column(
        SQLEnum(ProviderGroup, name="providergroup"), nullable=False,
        default=ProviderGroup.MOBILE,
    )
    # Global kill-switch: False disables the provider in ALL countries.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Account-level configuration (api_key, base_url, webhook_secret, ...).
    # Sensitive values are Fernet-encrypted before being stored.
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    country_links: Mapped[list["CountryProvider"]] = relationship(
        back_populates="provider", cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<ProviderConfig {self.code} [{self.provider_group}] active={self.is_active}>"


class CountryProvider(Base):
    """A provider enabled for a given country, with routing priority."""

    __tablename__ = "country_providers"
    __table_args__ = (
        UniqueConstraint("country_code", "provider_code", name="uq_country_provider"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    country_code: Mapped[str] = mapped_column(
        String(2), ForeignKey("supported_countries.code", ondelete="CASCADE"), nullable=False,
    )
    provider_code: Mapped[str] = mapped_column(
        String(20), ForeignKey("payment_providers.code", ondelete="CASCADE"), nullable=False,
    )
    # 1 = default provider for the country, 2 = secondary (fallback), ...
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Per-country toggle; the provider's global is_active still applies on top.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Optional per-country credential overrides (encrypted values). Empty for
    # providers with account-global credentials (AccountPE) — TouchPay keeps
    # its historical tp_* columns on supported_countries.
    credentials: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    provider: Mapped["ProviderConfig"] = relationship(back_populates="country_links")

    def __repr__(self):
        return f"<CountryProvider {self.country_code}/{self.provider_code} prio={self.priority}>"
