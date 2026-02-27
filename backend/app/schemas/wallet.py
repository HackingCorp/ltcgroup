from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, UUID4, model_validator


class WalletBalanceResponse(BaseModel):
    balance: Decimal
    currency: str = "USD"


class WalletTopupRequest(BaseModel):
    amount_usd: Optional[Decimal] = Field(None, gt=0, le=10000, decimal_places=2)
    amount_local: Optional[Decimal] = Field(None, gt=0, le=50000000, decimal_places=2)
    payment_method: str = Field(..., pattern="^(mobile_money|enkap)$")
    phone: Optional[str] = None

    @model_validator(mode='after')
    def check_amount_exclusivity(self):
        if self.amount_usd is not None and self.amount_local is not None:
            raise ValueError('Provide either amount_usd or amount_local, not both')
        if self.amount_usd is None and self.amount_local is None:
            raise ValueError('Provide either amount_usd or amount_local')
        return self


class WalletTopupResponse(BaseModel):
    success: bool
    transaction_id: UUID4
    amount_usd: Decimal
    amount_local: Decimal
    local_currency: str
    exchange_rate: Decimal
    fee_local: Decimal
    total_local: Decimal
    fee_rate: Decimal
    payment_reference: Optional[str] = None
    payment_url: Optional[str] = None
    message: str


class WalletTransferRequest(BaseModel):
    card_id: UUID4
    amount: Decimal = Field(..., gt=0, le=10000, decimal_places=2)


class WalletTransferResponse(BaseModel):
    success: bool
    transaction_id: UUID4
    amount: Decimal
    fee: Decimal
    total_debited: Decimal
    currency: str = "USD"
    new_wallet_balance: Decimal
    new_card_balance: Decimal
    message: str


class WalletWithdrawRequest(BaseModel):
    amount_usd: Decimal = Field(..., gt=0, le=10000, decimal_places=2)
    phone: str = Field(..., min_length=9, max_length=20)
    payment_method: str = Field(default="mobile_money")


class WalletWithdrawResponse(BaseModel):
    success: bool
    transaction_id: UUID4
    amount_usd: Decimal
    amount_local: Decimal
    local_currency: str
    exchange_rate: Decimal
    new_wallet_balance: Decimal
    message: str


class ExchangeRateResponse(BaseModel):
    topup_rate: Decimal
    withdrawal_rate: Decimal
    local_currency: str
    fee_rate: Decimal
    markup_percent: Decimal
