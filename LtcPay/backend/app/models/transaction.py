"""
LtcPay - Transaction Model
"""
import enum
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, DateTime, Enum, Text, Integer
from sqlalchemy.sql import func

from app.core.database import Base


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    MOBILE_MONEY = "mobile_money"
    ORANGE_MONEY = "orange_money"
    MTN_MONEY = "mtn_money"
    BANK_CARD = "bank_card"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reference = Column(String(64), unique=True, nullable=False, index=True)
    external_ref = Column(String(128), nullable=True, index=True)

    # Payment details
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="XAF")
    fee = Column(Float, default=0.0)
    net_amount = Column(Float, nullable=True)

    # Payer info
    payer_phone = Column(String(20), nullable=True)
    payer_email = Column(String(255), nullable=True)
    payer_name = Column(String(255), nullable=True)

    # Payment method
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    operator = Column(String(50), nullable=True)

    # Status
    status = Column(
        Enum(TransactionStatus),
        default=TransactionStatus.PENDING,
        nullable=False,
        index=True,
    )
    status_message = Column(Text, nullable=True)

    # Metadata
    description = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)

    # Callbacks
    callback_url = Column(String(512), nullable=True)
    return_url = Column(String(512), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)

    @property
    def customer_name(self) -> str | None:
        return self.payer_name
