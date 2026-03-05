from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field, UUID4, field_validator
from app.models.transaction import TransactionType, TransactionStatus

SUPPORTED_CURRENCIES = {"USD", "XAF", "XOF", "EUR", "GBP", "NGN", "KES", "GHS", "ZAR", "CDF"}


def _validate_amount(v: Decimal) -> Decimal:
    """Normalize amount to 2 decimal places and enforce minimum."""
    if v < Decimal("1"):
        raise ValueError("Le montant minimum est $1")
    return v.quantize(Decimal("0.01"))


class TopupRequest(BaseModel):
    card_id: UUID4
    amount: Decimal = Field(..., ge=Decimal("1"), le=5000000, decimal_places=2)
    currency: str = Field(default="USD", max_length=3)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        return _validate_amount(v)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        if v.upper() not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Currency {v} not supported")
        return v.upper()


class WithdrawRequest(BaseModel):
    card_id: UUID4
    amount: Decimal = Field(..., ge=Decimal("1"), le=5000000, decimal_places=2)
    currency: str = Field(default="USD", max_length=3)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        return _validate_amount(v)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        if v.upper() not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Currency {v} not supported")
        return v.upper()


class TransactionResponse(BaseModel):
    id: UUID
    card_id: UUID | None = None
    amount: Decimal
    fee: Decimal = Decimal("0")
    currency: str
    type: TransactionType
    status: TransactionStatus
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    transactions: list[TransactionResponse]
    total_count: int
    page: int
    page_size: int
