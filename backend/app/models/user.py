import uuid
from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, Float, Text, Enum as SQLEnum, Numeric, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database import Base


class KYCStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint('wallet_balance >= 0', name='ck_users_wallet_balance_positive'),
        CheckConstraint("country_code ~ '^[A-Z]{2}$'", name='ck_users_country_code_format'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    kyc_status: Mapped[KYCStatus] = mapped_column(
        SQLEnum(KYCStatus), default=KYCStatus.PENDING, nullable=False
    )
    kyc_document_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    kyc_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    kyc_rejected_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # KYC personal info
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    street: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # KYC document details
    id_proof_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    id_proof_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    id_proof_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    kyc_document_front_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    kyc_document_back_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    kyc_selfie_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # KYC verification scores
    kyc_liveness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    kyc_face_match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    kyc_ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    kyc_verification_method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    kyc_ocr_raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Wallet balance (main wallet for all operations)
    wallet_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=12, scale=2), default=Decimal("0.00"), server_default="0", nullable=False
    )

    # Country code (ISO 3166-1 alpha-2)
    country_code: Mapped[str] = mapped_column(String(2), default="CM", server_default="CM", nullable=False)

    # AccountPE provider user ID (set on first card purchase)
    accountpe_user_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

    # Password reset fields (columns created by Base.metadata.create_all in dev)
    reset_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reset_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    cards: Mapped[list["Card"]] = relationship(
        "Card", back_populates="user", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="user"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.email}>"
