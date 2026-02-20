import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Index, Numeric, Text, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSON
import enum

from app.database import Base


class TransactionType(str, enum.Enum):
    TOPUP = "TOPUP"
    WITHDRAW = "WITHDRAW"
    PURCHASE = "PURCHASE"
    REFUND = "REFUND"


class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint(
            "provider_transaction_id",
            name="uq_provider_transaction_id",
        ),
        Index("ix_transactions_status_created", "status", "created_at"),
        CheckConstraint('amount > 0', name='ck_transactions_amount_positive'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    card_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=2), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    type: Mapped[TransactionType] = mapped_column(SQLEnum(TransactionType), nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(
        SQLEnum(TransactionStatus), default=TransactionStatus.PENDING, nullable=False
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider_transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None, index=True)
    extra_data: Mapped[dict | None] = mapped_column("extra_data", JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    card: Mapped["Card"] = relationship("Card", back_populates="transactions")
    user: Mapped["User"] = relationship("User", back_populates="transactions")

    def __repr__(self):
        return f"<Transaction {self.type} {self.amount} {self.currency}>"
