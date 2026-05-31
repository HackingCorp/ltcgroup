import uuid
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import String, Boolean, DateTime, Text, Numeric, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSON

from app.core.database import Base


class DisputeStatus(str, PyEnum):
    evidence_required = "evidence_required"
    evidence_received = "evidence_received"
    under_review = "under_review"
    escalated = "escalated"
    won = "won"
    lost = "lost"


def generate_dispute_ref() -> str:
    return f"DSP-{uuid.uuid4().hex[:12].upper()}"


class Dispute(Base):
    __tablename__ = "disputes"
    __table_args__ = (
        Index("ix_disputes_merchant_id", "merchant_id"),
        Index("ix_disputes_reference", "reference", unique=True),
        Index("ix_disputes_payment_id", "payment_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    reference: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, default=generate_dispute_ref
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payment_merchants.id", ondelete="CASCADE"),
        nullable=False,
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payment_gateway_payments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_contact: Mapped[str | None] = mapped_column(String(100), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="XAF")
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[DisputeStatus] = mapped_column(
        SQLEnum(DisputeStatus), nullable=False, default=DisputeStatus.evidence_required
    )
    priority: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    evidence_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admin_users.id", ondelete="SET NULL"),
        nullable=True,
    )

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

    def __repr__(self):
        return f"<Dispute {self.reference} {self.amount} ({self.status})>"
