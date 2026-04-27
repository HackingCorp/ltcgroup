"""
LtcPay - Withdrawal Schemas
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, UUID4, model_validator
from app.models.withdrawal import WithdrawalStatus, WithdrawalMethod


class WithdrawalCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field(default="XAF", max_length=3)
    method: WithdrawalMethod

    # Mobile Money fields
    mobile_money_number: Optional[str] = Field(None, min_length=9, max_length=20)
    mobile_money_operator: Optional[str] = Field(None, max_length=20)

    # Bank Transfer fields
    bank_name: Optional[str] = Field(None, max_length=255)
    bank_account_number: Optional[str] = Field(None, max_length=50)
    bank_account_name: Optional[str] = Field(None, max_length=255)

    @model_validator(mode="after")
    def validate_method_fields(self) -> "WithdrawalCreate":
        if self.method == WithdrawalMethod.MOBILE_MONEY:
            if not self.mobile_money_number or not self.mobile_money_operator:
                raise ValueError(
                    "mobile_money_number and mobile_money_operator are required for MOBILE_MONEY"
                )
        elif self.method == WithdrawalMethod.BANK_TRANSFER:
            if not self.bank_name or not self.bank_account_number or not self.bank_account_name:
                raise ValueError(
                    "bank_name, bank_account_number, and bank_account_name are required for BANK_TRANSFER"
                )
        return self


class WithdrawalResponse(BaseModel):
    id: UUID4
    merchant_id: UUID4
    reference: str
    amount: Decimal
    fee: Decimal
    currency: str
    method: WithdrawalMethod
    status: WithdrawalStatus

    mobile_money_number: Optional[str] = None
    mobile_money_operator: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None

    admin_note: Optional[str] = None
    processed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WithdrawalListResponse(BaseModel):
    withdrawals: list[WithdrawalResponse]
    total_count: int
    page: int
    page_size: int


class BalanceResponse(BaseModel):
    total_earned: Decimal
    total_fees: Decimal
    total_withdrawn: Decimal
    pending_withdrawals: Decimal
    available_balance: Decimal
    currency: str = "XAF"


class AdminWithdrawalAction(BaseModel):
    admin_note: Optional[str] = Field(None, max_length=1000)
