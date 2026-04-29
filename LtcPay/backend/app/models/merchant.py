import uuid
import enum
import secrets
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Text, Index, Enum as SQLEnum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models.payment import PaymentMode

from app.core.database import Base


class FeeBearer(str, enum.Enum):
    MERCHANT = "MERCHANT"
    CLIENT = "CLIENT"


def generate_api_key_live() -> str:
    """Generate a secure live API key with ltcpay_live_ prefix."""
    return f"ltcpay_live_{secrets.token_hex(24)}"


def generate_api_key_test() -> str:
    """Generate a secure test API key with ltcpay_test_ prefix."""
    return f"ltcpay_test_{secrets.token_hex(24)}"


class Merchant(Base):
    __tablename__ = "payment_merchants"
    __table_args__ = (
        Index("ix_payment_merchants_api_key_live", "api_key_live", unique=True),
        Index("ix_payment_merchants_api_key_test", "api_key_test", unique=True),
        Index("ix_payment_merchants_email", "email", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # API Authentication -- separate live and test keys
    api_key_live: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, default=generate_api_key_live
    )
    api_key_test: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, default=generate_api_key_test
    )
    api_secret_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Callback / Webhook configuration
    callback_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    webhook_secret: Mapped[str] = mapped_column(
        String(255), nullable=False, default=lambda: secrets.token_hex(32)
    )

    # Default payment mode for this merchant
    default_payment_mode: Mapped[PaymentMode] = mapped_column(
        SQLEnum(PaymentMode), default=PaymentMode.SDK, server_default="SDK", nullable=False
    )

    # Fee configuration
    fee_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("1.75"), server_default="1.75", nullable=False
    )
    fee_bearer: Mapped[FeeBearer] = mapped_column(
        SQLEnum(FeeBearer), default=FeeBearer.MERCHANT, server_default="MERCHANT", nullable=False
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_test_mode: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Business info
    business_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Merchant portal password (nullable — only set when merchant registers for portal)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="merchant", cascade="all, delete-orphan"
    )
    withdrawals: Mapped[list["Withdrawal"]] = relationship(
        "Withdrawal", back_populates="merchant", cascade="all, delete-orphan"
    )

    @property
    def api_key(self) -> str:
        """Return the active API key based on mode."""
        return self.api_key_test if self.is_test_mode else self.api_key_live

    def __repr__(self):
        return f"<Merchant {self.name} ({self.email})>"
