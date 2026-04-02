"""
Merchant management endpoints for LtcPay.
Merchants register to get API credentials, then use those to create payments.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import hash_api_secret, get_current_merchant, generate_api_secret
from app.models.merchant import Merchant, generate_api_key_live, generate_api_key_test
from app.schemas.merchant import (
    MerchantCreate,
    MerchantResponse,
    MerchantCredentialsResponse,
)

router = APIRouter(prefix="/merchants", tags=["Merchants"])


@router.post("/register", response_model=MerchantCredentialsResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def register_merchant(
    request: Request,
    data: MerchantCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new merchant and generate API credentials.

    Returns live/test API keys and the raw API secret. The secret is shown
    only once and must be stored securely by the merchant.

    Rate limit: 5 registrations per hour per IP to prevent abuse.
    """
    # Check if email already exists
    existing = await db.execute(
        select(Merchant).where(Merchant.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A merchant with this email already exists",
        )

    # Generate API credentials
    raw_secret = generate_api_secret()
    hashed_secret = hash_api_secret(raw_secret)

    merchant = Merchant(
        name=data.name,
        email=data.email,
        phone=data.phone,
        website=data.website,
        callback_url=data.callback_url,
        business_type=data.business_type,
        description=data.description,
        api_key_live=generate_api_key_live(),
        api_key_test=generate_api_key_test(),
        api_secret_hash=hashed_secret,
    )
    db.add(merchant)
    await db.commit()
    await db.refresh(merchant)

    return MerchantCredentialsResponse(
        id=merchant.id,
        name=merchant.name,
        api_key_live=merchant.api_key_live,
        api_key_test=merchant.api_key_test,
        api_secret=raw_secret,
        webhook_secret=merchant.webhook_secret,
        message="Store the api_secret securely. It cannot be retrieved again.",
    )


@router.get("/me", response_model=MerchantResponse)
async def get_merchant_profile(
    merchant: Merchant = Depends(get_current_merchant),
):
    """Get the authenticated merchant's profile."""
    return MerchantResponse.model_validate(merchant)
