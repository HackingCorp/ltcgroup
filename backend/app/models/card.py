import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Numeric, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database import Base


class CardType(str, enum.Enum):
    VISA = "VISA"
    MASTERCARD = "MASTERCARD"


class CardStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    FROZEN = "FROZEN"
    BLOCKED = "BLOCKED"
    EXPIRED = "EXPIRED"


class Card(Base):
    __tablename__ = "cards"
    __table_args__ = (
        CheckConstraint('balance >= 0', name='ck_cards_balance_positive'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    card_type: Mapped[CardType] = mapped_column(SQLEnum(CardType), nullable=False)
    card_number_masked: Mapped[str] = mapped_column(String(20), nullable=False)
    card_number_full_encrypted: Mapped[str] = mapped_column(String(500), nullable=False)

    status: Mapped[CardStatus] = mapped_column(
        SQLEnum(CardStatus), default=CardStatus.ACTIVE, nullable=False
    )
    balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=2), default=Decimal("0.00"), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    provider: Mapped[str] = mapped_column(String(50), default="AccountPE", nullable=False)
    provider_card_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    expiry_date: Mapped[str] = mapped_column(String(5), nullable=False)
    cvv_encrypted: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="cards")
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="card", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Card {self.card_number_masked} ({self.card_type})>"
