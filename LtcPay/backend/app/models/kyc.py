import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSON

from app.core.database import Base


class KycStatus(str, PyEnum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class KycDocumentStatus(str, PyEnum):
    TODO = "TODO"
    UPLOADED = "UPLOADED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class KycDocumentType(str, PyEnum):
    RCCM = "RCCM"
    NIU = "NIU"
    ID_CARD = "ID_CARD"
    STATUTS = "STATUTS"
    ADDRESS_PROOF = "ADDRESS_PROOF"


class KycSubmission(Base):
    __tablename__ = "kyc_submissions"
    __table_args__ = (
        Index("ix_kyc_submissions_merchant_id", "merchant_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payment_merchants.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[KycStatus] = mapped_column(
        SQLEnum(KycStatus), nullable=False, default=KycStatus.NOT_STARTED
    )
    business_info: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    beneficial_owner: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admin_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

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
        return f"<KycSubmission merchant_id={self.merchant_id} ({self.status})>"


class KycDocument(Base):
    __tablename__ = "kyc_documents"
    __table_args__ = (
        Index("ix_kyc_documents_submission_id", "kyc_submission_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    kyc_submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kyc_submissions.id", ondelete="CASCADE"),
        nullable=False,
    )
    document_type: Mapped[KycDocumentType] = mapped_column(
        SQLEnum(KycDocumentType), nullable=False
    )
    document_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[KycDocumentStatus] = mapped_column(
        SQLEnum(KycDocumentStatus), nullable=False, default=KycDocumentStatus.TODO
    )
    uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def __repr__(self):
        return f"<KycDocument {self.document_type} ({self.status})>"
