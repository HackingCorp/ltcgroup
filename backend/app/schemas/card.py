from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, UUID4
from app.models.card import CardType, CardStatus


class CardPurchase(BaseModel):
    card_type: CardType
    initial_balance: Decimal = Field(..., ge=0, decimal_places=2)


class CardResponse(BaseModel):
    id: UUID4
    card_type: CardType
    card_number_masked: str
    status: CardStatus
    balance: Decimal
    currency: str
    expiry_date: str
    created_at: datetime

    class Config:
        from_attributes = True


class CardAction(BaseModel):
    action: str = Field(..., pattern="^(freeze|unfreeze|block)$")


class CardListResponse(BaseModel):
    cards: list[CardResponse]
    total: int
