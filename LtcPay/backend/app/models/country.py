"""
LtcPay - Multi-Country Models

Tables:
  - supported_countries: Country config + encrypted TouchPay credentials
  - country_operators: Mobile money operators per country
  - merchant_countries: Per-merchant country restrictions
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SupportedCountry(Base):
    __tablename__ = "supported_countries"

    code: Mapped[str] = mapped_column(String(2), primary_key=True)  # "CM", "CI"
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)  # "XAF"
    phone_prefix: Mapped[str] = mapped_column(String(5), nullable=False, unique=True)  # "237"
    phone_digits: Mapped[int] = mapped_column(Integer, nullable=False, default=9)
    phone_pattern: Mapped[str] = mapped_column(String(30), nullable=False, default="6XX XX XX XX")
    flag_emoji: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    default_city: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    min_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    max_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=500_000)
    # When False, operator phone_prefixes are informative only (UI hints):
    # payments are never rejected on a prefix mismatch. Use for countries
    # with active number portability (e.g. SN, CI) where a prefix no longer
    # proves the operator.
    enforce_phone_prefix_check: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, server_default="true",
    )

    # TouchPay credentials (sensitive fields encrypted with Fernet)
    tp_agency_code: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tp_login: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tp_password: Mapped[str] = mapped_column(Text, nullable=False, default="")  # encrypted
    tp_secret: Mapped[str] = mapped_column(Text, nullable=False, default="")  # encrypted
    tp_merchant_id: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    tp_secure_code: Mapped[str] = mapped_column(Text, nullable=False, default="")  # encrypted
    tp_merchant_website: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    tp_sdk_url: Mapped[str] = mapped_column(
        String(500), nullable=False,
        default="https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.1.js",
    )
    # Partner API credentials. TouchPay's check_status / get_balance / cashin
    # endpoints authenticate with a different triple than the Direct payin
    # API (which uses agency + loginAgent + passwordAgent in the query
    # string). Same agency, different keys — see the Insomnia collection.
    tp_partner_id: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tp_login_api: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tp_password_api: Mapped[str] = mapped_column(Text, nullable=False, default="")  # encrypted

    tp_direct_api_url: Mapped[str] = mapped_column(
        String(500), nullable=False,
        default="https://apidist.gutouch.net/apidist/sec/touchpayapi",
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relations
    operators: Mapped[list["CountryOperator"]] = relationship(
        back_populates="country", cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<SupportedCountry {self.code} ({self.name})>"


class CountryOperator(Base):
    __tablename__ = "country_operators"
    __table_args__ = (
        UniqueConstraint(
            "country_code", "provider_code", "operator_code",
            name="uq_country_provider_operator",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    country_code: Mapped[str] = mapped_column(
        String(2), ForeignKey("supported_countries.code", ondelete="CASCADE"), nullable=False,
    )
    operator_code: Mapped[str] = mapped_column(String(20), nullable=False)  # "MTN", "ORANGE", "WAVE"
    # Which PSP this operator row belongs to. The same operator (e.g. MTN/CM)
    # may exist once per provider, each with its own service_code and limits.
    provider_code: Mapped[str] = mapped_column(
        String(20), nullable=False, default="TOUCHPAY", server_default="TOUCHPAY",
    )
    operator_name: Mapped[str] = mapped_column(String(100), nullable=False)  # "MTN MoMo"
    service_code: Mapped[str] = mapped_column(String(100), nullable=False)  # "PAIEMENTMARCHAND_MTN_CM"
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#000000")
    logo_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    min_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    max_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=500_000)
    ussd_code: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    # National-number prefixes owned by this operator (e.g. ["69", "655"]).
    # Used to detect operator/number mismatches before calling the PSP.
    # Empty/null = no prefix knowledge; numbers are never blocked on it.
    phone_prefixes: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    # What the provider charges us for this operator, in percent — read off
    # the `fees` it returns at initiation. Documentation, never billing.
    provider_fee_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    # Floor we bill for this operator, in percent. The merchant's own rate
    # applies when it is higher; null means no floor (legacy behaviour).
    min_fee_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    country: Mapped["SupportedCountry"] = relationship(back_populates="operators")

    def __repr__(self):
        return f"<CountryOperator {self.country_code}/{self.operator_code}>"


class MerchantCountry(Base):
    __tablename__ = "merchant_countries"
    __table_args__ = (
        UniqueConstraint("merchant_id", "country_code", name="uq_merchant_country"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payment_merchants.id", ondelete="CASCADE"), nullable=False,
    )
    country_code: Mapped[str] = mapped_column(
        String(2), ForeignKey("supported_countries.code", ondelete="CASCADE"), nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self):
        return f"<MerchantCountry merchant={self.merchant_id} country={self.country_code}>"


class MerchantOperatorRate(Base):
    """A Mobile Money rate agreed with one merchant for one country.

    `operator_code` NULL covers every operator of the country; a row naming
    an operator wins over it. What the merchant is billed is this rate when
    a row matches, and their own `fee_rate` — floored at the platform
    minimum — when none does.
    """
    __tablename__ = "merchant_operator_rates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payment_merchants.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    operator_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    fee_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self):
        target = f"{self.country_code}/{self.operator_code or '*'}"
        return f"<MerchantOperatorRate {target} {self.fee_rate}%>"
