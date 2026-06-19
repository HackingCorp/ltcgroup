"""
LtcPay - Multi-Country Models

Tables:
  - supported_countries: Country config + encrypted TouchPay credentials
  - country_operators: Mobile money operators per country
  - merchant_countries: Per-merchant country restrictions
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text,
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
        UniqueConstraint("country_code", "operator_code", name="uq_country_operator"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    country_code: Mapped[str] = mapped_column(
        String(2), ForeignKey("supported_countries.code", ondelete="CASCADE"), nullable=False,
    )
    operator_code: Mapped[str] = mapped_column(String(20), nullable=False)  # "MTN", "ORANGE", "WAVE"
    operator_name: Mapped[str] = mapped_column(String(100), nullable=False)  # "MTN MoMo"
    service_code: Mapped[str] = mapped_column(String(100), nullable=False)  # "PAIEMENTMARCHAND_MTN_CM"
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#000000")
    logo_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    min_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    max_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=500_000)
    ussd_code: Mapped[str] = mapped_column(String(20), nullable=False, default="")
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
