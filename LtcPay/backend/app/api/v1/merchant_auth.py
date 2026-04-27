"""
Merchant portal authentication endpoints.
"""
import bcrypt as _bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_api_secret, generate_api_secret
from app.models.merchant import Merchant
from app.api.v1.auth import create_access_token, LoginRequest
from app.schemas.merchant import (
    MerchantRegisterWithPassword,
    MerchantProfileUpdate,
    MerchantAuthResponse,
    MerchantCredentialsResponse,
    MerchantResponse,
    ChangePasswordRequest,
)

router = APIRouter(prefix="/merchant-auth", tags=["Merchant Auth"])
bearer_scheme = HTTPBearer(auto_error=False)


def _hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


async def get_current_merchant_jwt(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Merchant:
    """Authenticate merchant via JWT Bearer token (portal login)."""
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = payload.get("sub")
        role = payload.get("role")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if role != "merchant":
        raise HTTPException(status_code=403, detail="Merchant access required")

    result = await db.execute(select(Merchant).where(Merchant.id == user_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=401, detail="Merchant not found")
    if not merchant.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")
    return merchant


@router.post("/register")
async def register_merchant(
    data: MerchantRegisterWithPassword,
    db: AsyncSession = Depends(get_db),
):
    """Register a new merchant with password for portal access."""
    # Check if email already exists
    result = await db.execute(select(Merchant).where(Merchant.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate API credentials
    raw_secret = generate_api_secret()

    merchant = Merchant(
        name=data.name,
        email=data.email,
        phone=data.phone,
        website=data.website,
        business_type=data.business_type,
        description=data.description,
        password_hash=_hash_password(data.password),
        api_secret_hash=hash_api_secret(raw_secret),
    )

    db.add(merchant)
    await db.commit()
    await db.refresh(merchant)

    token = create_access_token(str(merchant.id), merchant.email, role="merchant")

    return {
        "access_token": token,
        "refresh_token": token,
        "token_type": "bearer",
        "merchant": {
            "id": str(merchant.id),
            "name": merchant.name,
            "email": merchant.email,
            "api_key_live": merchant.api_key_live,
            "api_key_test": merchant.api_key_test,
            "api_secret": raw_secret,
            "webhook_secret": merchant.webhook_secret,
            "message": "Store the api_secret securely. It cannot be retrieved again.",
        },
    }


@router.post("/login")
async def login_merchant(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login merchant to the portal."""
    result = await db.execute(select(Merchant).where(Merchant.email == data.email))
    merchant = result.scalar_one_or_none()

    if not merchant or not merchant.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not _verify_password(data.password, merchant.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not merchant.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    token = create_access_token(str(merchant.id), merchant.email, role="merchant")

    return {
        "access_token": token,
        "refresh_token": token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=MerchantResponse)
async def get_merchant_profile(
    merchant: Merchant = Depends(get_current_merchant_jwt),
):
    """Get current merchant profile."""
    return merchant


@router.patch("/profile", response_model=MerchantResponse)
async def update_merchant_profile(
    data: MerchantProfileUpdate,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Update current merchant profile."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(merchant, field, value)

    await db.commit()
    await db.refresh(merchant)
    return merchant


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Change merchant password."""
    if not merchant.password_hash or not _verify_password(data.current_password, merchant.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    merchant.password_hash = _hash_password(data.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}
