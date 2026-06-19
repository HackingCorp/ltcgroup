"""
LtcPay - Country & Operator Schemas (Admin CRUD + Public API)
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, UUID4


# ---------------------------------------------------------------------------
# Operator schemas
# ---------------------------------------------------------------------------

class OperatorCreate(BaseModel):
    operator_code: str = Field(..., min_length=1, max_length=20)
    operator_name: str = Field(..., min_length=1, max_length=100)
    service_code: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#000000", max_length=7)
    logo_url: str = Field(default="", max_length=500)
    min_amount: int = Field(default=100, ge=1)
    max_amount: int = Field(default=500_000, ge=1)
    ussd_code: str = Field(default="", max_length=20)
    is_active: bool = True


class OperatorUpdate(BaseModel):
    operator_code: Optional[str] = Field(None, min_length=1, max_length=20)
    operator_name: Optional[str] = Field(None, min_length=1, max_length=100)
    service_code: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, max_length=7)
    logo_url: Optional[str] = Field(None, max_length=500)
    min_amount: Optional[int] = Field(None, ge=1)
    max_amount: Optional[int] = Field(None, ge=1)
    ussd_code: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class OperatorResponse(BaseModel):
    id: UUID4
    country_code: str
    operator_code: str
    operator_name: str
    service_code: str
    color: str
    logo_url: str
    min_amount: int
    max_amount: int
    ussd_code: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Country schemas
# ---------------------------------------------------------------------------

class CountryCredentials(BaseModel):
    """TouchPay credentials for a country (input only, never returned as-is)."""
    agency_code: str = Field(default="", max_length=100)
    login: str = Field(default="", max_length=100)
    password: str = Field(default="", max_length=500)
    secret: str = Field(default="", max_length=500)
    merchant_id: str = Field(default="", max_length=100)
    secure_code: str = Field(default="", max_length=500)
    merchant_website: str = Field(default="", max_length=255)
    sdk_url: str = Field(
        default="https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.1.js",
        max_length=500,
    )
    direct_api_url: str = Field(
        default="https://apidist.gutouch.net/apidist/sec/touchpayapi",
        max_length=500,
    )


class CountryCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=2)
    name: str = Field(..., min_length=1, max_length=100)
    currency: str = Field(..., min_length=3, max_length=3)
    phone_prefix: str = Field(..., min_length=1, max_length=5)
    phone_digits: int = Field(default=9, ge=4, le=15)
    phone_pattern: str = Field(default="6XX XX XX XX", max_length=30)
    flag_emoji: str = Field(default="", max_length=10)
    default_city: str = Field(default="", max_length=100)
    min_amount: int = Field(default=100, ge=1)
    max_amount: int = Field(default=500_000, ge=1)
    credentials: Optional[CountryCredentials] = None
    is_active: bool = True


class CountryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    phone_prefix: Optional[str] = Field(None, min_length=1, max_length=5)
    phone_digits: Optional[int] = Field(None, ge=4, le=15)
    phone_pattern: Optional[str] = Field(None, max_length=30)
    flag_emoji: Optional[str] = Field(None, max_length=10)
    default_city: Optional[str] = Field(None, max_length=100)
    min_amount: Optional[int] = Field(None, ge=1)
    max_amount: Optional[int] = Field(None, ge=1)
    credentials: Optional[CountryCredentials] = None
    is_active: Optional[bool] = None


class CountryResponse(BaseModel):
    """Country response with credentials masked."""
    code: str
    name: str
    currency: str
    phone_prefix: str
    phone_digits: int
    phone_pattern: str
    flag_emoji: str
    default_city: str
    min_amount: int
    max_amount: int
    credentials_configured: bool  # True if agency_code + merchant_id are non-empty
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CountryDetailResponse(CountryResponse):
    """Country with nested operators."""
    operators: list[OperatorResponse] = []


# ---------------------------------------------------------------------------
# Public API schemas (for merchants / checkout)
# ---------------------------------------------------------------------------

class PublicOperatorInfo(BaseModel):
    code: str
    name: str
    color: str
    logo_url: str
    min_amount: int
    max_amount: int
    ussd_code: str


class PublicCountryInfo(BaseModel):
    code: str
    name: str
    currency: str
    phone_prefix: str
    phone_digits: int
    phone_pattern: str
    flag_emoji: str
    min_amount: int
    max_amount: int
    operators: list[PublicOperatorInfo] = []


# ---------------------------------------------------------------------------
# Merchant country restriction schemas
# ---------------------------------------------------------------------------

class MerchantCountryResponse(BaseModel):
    country_code: str
    country_name: str
    is_active: bool

    class Config:
        from_attributes = True


class MerchantCountryToggle(BaseModel):
    is_active: bool = True


# ---------------------------------------------------------------------------
# Country integration test schemas
# ---------------------------------------------------------------------------

class CountryTestCheck(BaseModel):
    name: str
    status: str  # "pass" or "fail"
    message: str
    latency_ms: Optional[float] = None


class CountryTestResult(BaseModel):
    country_code: str
    overall_status: str  # "pass", "partial", or "fail"
    checks: list[CountryTestCheck]
    tested_at: datetime
