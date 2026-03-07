from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, UUID4
from pydantic import model_validator
from app.models.card import CardType, CardStatus, CardTier


class CardPurchase(BaseModel):
    card_type: CardType
    card_tier: CardTier = CardTier.STANDARD
    initial_balance: Decimal = Field(default=Decimal("1"), ge=1, decimal_places=2)

    @model_validator(mode="after")
    def validate_tier_type(self):
        if self.card_tier in (CardTier.STANDARD, CardTier.PREMIUM) and self.card_type != CardType.VISA:
            raise ValueError("Standard and Premium tiers only support VISA cards")
        if self.card_tier == CardTier.GOLD and self.card_type not in (CardType.VISA, CardType.MASTERCARD):
            raise ValueError("Gold tier only supports VISA or MASTERCARD")
        if self.initial_balance <= 0:
            raise ValueError("Initial balance must be greater than 0")
        return self


class CardResponse(BaseModel):
    id: UUID4
    card_type: CardType
    card_tier: CardTier
    card_number_masked: str
    status: CardStatus
    balance: Decimal
    currency: str
    expiry_date: str
    spending_limit: Decimal
    daily_limit: Decimal
    transaction_limit: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


class CardUpdateLimit(BaseModel):
    spending_limit: Decimal | None = Field(None, ge=0, decimal_places=2)
    daily_limit: Decimal | None = Field(None, ge=0, decimal_places=2)
    transaction_limit: Decimal | None = Field(None, ge=0, decimal_places=2)


class CardListResponse(BaseModel):
    cards: list[CardResponse]
    total: int


class CardRevealResponse(BaseModel):
    card_number_full: str
    cvv: str
    expiry_date: str
