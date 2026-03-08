import re
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, UUID4, field_validator
from app.models.user import KYCStatus


class UserCreate(BaseModel):
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=72)
    country_code: str = Field("CM", min_length=2, max_length=2)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("Password must contain at least one special character")
        return v


class UserResponse(BaseModel):
    id: UUID4
    email: EmailStr
    phone: str
    first_name: str
    last_name: str
    kyc_status: KYCStatus
    kyc_submitted_at: datetime | None = None
    kyc_rejected_reason: str | None = None
    wallet_balance: Decimal = Decimal("0.00")
    country_code: str = "CM"
    local_currency: str | None = None
    consent_given_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, min_length=10, max_length=20)


class KYCSubmit(BaseModel):
    dob: date
    gender: str = Field(..., pattern=r'^(M|F|OTHER)$')
    address: str = Field(..., max_length=500)
    street: str = Field("", max_length=255)
    city: str = Field(..., max_length=100)
    postal_code: str = Field("", max_length=20)
    document_type: str = Field(..., pattern=r'^(id_card|passport|driver_license|residence_permit)$')
    id_proof_no: str = Field(..., max_length=100)
    id_proof_expiry: date
    document_front_url: str = Field(..., max_length=500)
    document_back_url: Optional[str] = Field(None, max_length=500)
    selfie_url: str = Field(..., max_length=500)

    @field_validator('dob')
    @classmethod
    def validate_dob(cls, v):
        if isinstance(v, str):
            v = date.fromisoformat(v)
        today = date.today()
        age = (today - v).days // 365
        if v > today:
            raise ValueError("La date de naissance ne peut pas être dans le futur")
        if age < 18:
            raise ValueError("L'utilisateur doit avoir au moins 18 ans")
        if age > 120:
            raise ValueError("Date de naissance invalide")
        return v

    @field_validator('id_proof_expiry')
    @classmethod
    def validate_id_proof_expiry(cls, v):
        if isinstance(v, str):
            v = date.fromisoformat(v)
        if v <= date.today():
            raise ValueError("Le document d'identité est expiré")
        return v


class KYCResponse(BaseModel):
    kyc_status: KYCStatus
    kyc_submitted_at: datetime | None
    kyc_verification_method: str | None = None
    kyc_rejected_reason: str | None = None

    class Config:
        from_attributes = True
