from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, UUID4
from app.models.user import KYCStatus


class UserCreate(BaseModel):
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID4
    email: EmailStr
    phone: str
    first_name: str
    last_name: str
    kyc_status: KYCStatus
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, min_length=10, max_length=20)


class KYCSubmit(BaseModel):
    document_url: str = Field(..., max_length=500)
    document_type: str = Field(..., max_length=50)


class KYCResponse(BaseModel):
    kyc_status: KYCStatus
    kyc_submitted_at: datetime | None

    class Config:
        from_attributes = True
