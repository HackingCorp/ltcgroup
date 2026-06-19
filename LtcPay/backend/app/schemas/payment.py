"""
LtcPay - Payment Schemas
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, UUID4, field_validator, model_validator

from app.models.payment import PaymentStatus, PaymentMethod, PaymentMode, PaymentProvider, MobileMoneyOperator

# MobileMoneyOperator is kept as a Python enum for backwards compatibility
# but the DB column is now VARCHAR(20) to support dynamic operators.


# ---------------------------------------------------------------------------
# Merchant Payment API schemas (used by api/v1/payments.py)
# ---------------------------------------------------------------------------

class CustomerInfo(BaseModel):
    """Customer information provided by the merchant."""
    name: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)


class PaymentInitiate(BaseModel):
    """Schema for initiating a new payment (sent by merchant via API)."""
    amount: Decimal = Field(..., gt=0, le=5000000, decimal_places=2)
    currency: Optional[str] = Field(default=None, max_length=3)
    merchant_reference: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    customer_info: Optional[CustomerInfo] = None
    payment_method: Optional[PaymentMethod] = None
    callback_url: Optional[str] = Field(None, max_length=500)
    return_url: Optional[str] = Field(None, max_length=500)
    metadata: Optional[dict] = None

    # Multi-country support
    country: Optional[str] = Field(None, min_length=2, max_length=2, description="ISO 3166-1 alpha-2 country code")

    # Direct API fields (optional - can be provided on checkout page)
    payment_mode: Optional[PaymentMode] = None  # None = use merchant default
    operator: Optional[str] = Field(None, max_length=20, description="Operator code (e.g. MTN, ORANGE, WAVE)")
    customer_phone: Optional[str] = Field(None, max_length=20)

    @field_validator("country", mode="before")
    @classmethod
    def normalize_country(cls, v: str | None) -> str | None:
        if v is not None:
            return v.upper()
        return v

    @field_validator("operator", mode="before")
    @classmethod
    def normalize_operator(cls, v: str | None) -> str | None:
        if v is not None:
            return v.upper()
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v < Decimal("100"):
            raise ValueError("Le montant minimum est 100")
        return v.quantize(Decimal("0.01"))

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str | None) -> str | None:
        if v is None:
            return v
        supported = {"XAF", "XOF", "EUR", "USD"}
        v = v.upper()
        if v not in supported:
            raise ValueError(f"Currency {v} not supported. Supported: {', '.join(sorted(supported))}")
        return v


class PaymentInitiateResponse(BaseModel):
    """Response after initiating a payment via merchant API."""
    payment_id: UUID4
    reference: str
    payment_token: str
    amount: Decimal
    currency: str
    status: PaymentStatus
    payment_mode: PaymentMode = PaymentMode.SDK
    country: Optional[str] = None
    payment_url: Optional[str] = None
    stripe_client_secret: Optional[str] = None
    created_at: datetime


class PaymentResponse(BaseModel):
    """Full payment details."""
    id: UUID4
    merchant_id: UUID4
    reference: str
    payment_token: str
    merchant_reference: Optional[str] = None
    provider_transaction_id: Optional[str] = None
    amount: Decimal
    fee: Decimal = Decimal("0")
    currency: str
    method: Optional[PaymentMethod] = None
    status: PaymentStatus
    payment_mode: PaymentMode = PaymentMode.SDK
    country: Optional[str] = None
    provider: Optional[PaymentProvider] = None
    operator: Optional[str] = None
    operator_transaction_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    customer_info: Optional[dict] = None
    description: Optional[str] = None
    touchpay_data: Optional[dict] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaymentListResponse(BaseModel):
    payments: list[PaymentResponse]
    total_count: int
    page: int
    page_size: int


class PaymentStatusResponse(BaseModel):
    """Lightweight status check response."""
    reference: str
    status: PaymentStatus
    amount: Decimal
    currency: str
    completed_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Transaction-based schemas (used by endpoints/payments.py - direct TouchPay)
# ---------------------------------------------------------------------------

class PaymentInitRequest(BaseModel):
    """Direct payment initialization request (non-merchant API)."""
    amount: float = Field(..., gt=0)
    currency: str = Field(default="XAF", max_length=3)
    payer_phone: Optional[str] = Field(None, max_length=20)
    payer_email: Optional[str] = Field(None, max_length=255)
    payer_name: Optional[str] = Field(None, max_length=255)
    payment_method: Optional[str] = None
    description: Optional[str] = None
    callback_url: Optional[str] = None
    return_url: Optional[str] = None
    metadata: Optional[dict] = None


class PaymentInitResponse(BaseModel):
    """Direct payment initialization response."""
    reference: str
    amount: float
    currency: str
    status: str
    payment_url: str
    payment_token: str
    created_at: datetime


class TransactionStatusResponse(BaseModel):
    """Full transaction status response."""
    reference: str
    external_ref: Optional[str] = None
    amount: float
    currency: str
    fee: float = 0.0
    net_amount: Optional[float] = None
    status: str
    status_message: Optional[str] = None
    payment_method: Optional[str] = None
    payer_phone: Optional[str] = None
    payer_name: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# TouchPay callback / webhook schemas
# ---------------------------------------------------------------------------

class TouchPayCallback(BaseModel):
    """Schema for TouchPay webhook/callback data."""
    transaction_id: Optional[str] = None
    trx_id: Optional[str] = None
    status: Optional[str] = None
    amount: Optional[str] = None
    currency: Optional[str] = None
    phone: Optional[str] = None
    reference: Optional[str] = None
    merchant_reference: Optional[str] = None
    operator_id: Optional[str] = None
    message: Optional[str] = None
    extra: Optional[dict] = None


class WebhookPayload(BaseModel):
    """Payload sent to merchant webhook URL."""
    event: str
    reference: str
    merchant_reference: Optional[str] = None
    status: PaymentStatus
    amount: Decimal
    currency: str
    method: Optional[PaymentMethod] = None
    completed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    timestamp: datetime
