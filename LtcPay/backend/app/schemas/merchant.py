"""
LtcPay - Merchant Schemas
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, UUID4, field_validator
from app.models.payment import PaymentMode
from app.models.merchant import FeeBearer


class MerchantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = Field(None, min_length=9, max_length=20)
    website: Optional[str] = Field(None, max_length=500)
    callback_url: Optional[str] = Field(None, max_length=500)
    business_type: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    logo_url: Optional[str] = Field(None, max_length=500)
    default_payment_mode: Optional[PaymentMode] = PaymentMode.SDK
    fee_rate: Decimal = Field(default=Decimal("1.75"), ge=Decimal("1.75"), le=Decimal("20.00"))
    fee_bearer: FeeBearer = FeeBearer.MERCHANT

    @field_validator("fee_rate")
    @classmethod
    def validate_fee_rate(cls, v: Decimal) -> Decimal:
        if v < Decimal("1.75"):
            raise ValueError("Le taux minimum est 1.75%")
        return v.quantize(Decimal("0.01"))


class MerchantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, min_length=9, max_length=20)
    website: Optional[str] = Field(None, max_length=500)
    callback_url: Optional[str] = Field(None, max_length=500)
    business_type: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    logo_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    default_payment_mode: Optional[PaymentMode] = None
    fee_rate: Optional[Decimal] = Field(None, ge=Decimal("1.75"), le=Decimal("20.00"))
    fee_bearer: Optional[FeeBearer] = None


class MerchantResponse(BaseModel):
    id: UUID4
    name: str
    email: str
    phone: Optional[str] = None
    website: Optional[str] = None
    api_key_live: str
    api_key_test: str
    webhook_secret: str = ""
    callback_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_test_mode: bool
    business_type: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    default_payment_mode: PaymentMode = PaymentMode.SDK
    fee_rate: Decimal = Decimal("1.75")
    fee_bearer: FeeBearer = FeeBearer.MERCHANT
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MerchantCredentialsResponse(BaseModel):
    """Returned only at merchant creation time with the raw API secret."""
    id: UUID4
    name: str
    api_key_live: str
    api_key_test: str
    api_secret: str
    webhook_secret: str
    message: str = "Store the api_secret securely. It cannot be retrieved again."


class MerchantListResponse(BaseModel):
    merchants: list[MerchantResponse]
    total_count: int
    page: int
    page_size: int


# --- Merchant Portal Auth Schemas ---

class MerchantRegisterWithPassword(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    phone: Optional[str] = Field(None, min_length=9, max_length=20)
    website: Optional[str] = Field(None, max_length=500)
    business_type: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None


class MerchantProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, min_length=9, max_length=20)
    website: Optional[str] = Field(None, max_length=500)
    callback_url: Optional[str] = Field(None, max_length=500)
    business_type: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    logo_url: Optional[str] = Field(None, max_length=500)


class MerchantAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    merchant: MerchantResponse


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
