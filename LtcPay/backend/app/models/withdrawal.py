import uuid
import secrets
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    String, Boolean, DateTime, Text, Numeric, ForeignKey,
    Index, Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class WithdrawalStatus(str, PyEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class WithdrawalMethod(str, PyEnum):
    MOBILE_MONEY = "MOBILE_MONEY"
    BANK_TRANSFER = "BANK_TRANSFER"


def generate_withdrawal_ref() -> str:
    return f"WDR-{uuid.uuid4().hex[:12].upper()}"


class Withdrawal(Base):
    __tablename__ = "merchant_withdrawals"
    __table_args__ = (
        Index("ix_merchant_withdrawals_merchant_id", "merchant_id"),
        Index("ix_merchant_withdrawals_reference", "reference", unique=True),
        Index("ix_merchant_withdrawals_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payment_merchants.id", ondelete="CASCADE"),
        nullable=False,
    )
    reference: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, default=generate_withdrawal_ref
    )

    # Amount
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="XAF")

    # Method
    method: Mapped[WithdrawalMethod] = mapped_column(
        SQLEnum(WithdrawalMethod), nullable=False
    )
    status: Mapped[WithdrawalStatus] = mapped_column(
        SQLEnum(WithdrawalStatus), nullable=False, default=WithdrawalStatus.PENDING
    )

    # Mobile Money fields
    mobile_money_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mobile_money_operator: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Bank Transfer fields
    bank_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_account_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Admin
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

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

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="withdrawals")

    def __repr__(self):
        return f"<Withdrawal {self.reference} {self.amount} {self.currency} ({self.status})>"
