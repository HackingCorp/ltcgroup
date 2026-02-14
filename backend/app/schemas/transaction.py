from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, UUID4
from app.models.transaction import TransactionType, TransactionStatus


class TopupRequest(BaseModel):
    card_id: UUID4
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field(default="USD", max_length=3)


class WithdrawRequest(BaseModel):
    card_id: UUID4
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field(default="USD", max_length=3)


class TransactionResponse(BaseModel):
    id: UUID4
    card_id: UUID4
    amount: Decimal
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
