"""
Merchant management endpoints for LtcPay.
Merchants register to get API credentials, then use those to create payments.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import hash_api_secret, get_current_merchant, generate_api_secret
from app.models.merchant import Merchant, generate_api_key_live, generate_api_key_test
from app.schemas.merchant import (
    MerchantCreate,
    MerchantResponse,
    MerchantCredentialsResponse,
    MerchantListResponse,
    MerchantUpdate,
)
from app.api.v1.auth import get_current_admin

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


# ── Admin endpoints ──────────────────────────────────────────────────────

@router.get("/", response_model=MerchantListResponse)
async def list_merchants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all merchants (admin only)."""
    total_result = await db.execute(select(func.count(Merchant.id)))
    total_count = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Merchant)
        .order_by(Merchant.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    merchants = result.scalars().all()

    return MerchantListResponse(
        merchants=[MerchantResponse.model_validate(m) for m in merchants],
        total_count=total_count,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=MerchantCredentialsResponse, status_code=status.HTTP_201_CREATED)
async def create_merchant(
    data: MerchantCreate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new merchant (admin only). Returns credentials including raw API secret."""
    existing = await db.execute(
        select(Merchant).where(Merchant.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A merchant with this email already exists",
        )

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


@router.get("/{merchant_id}", response_model=MerchantResponse)
async def get_merchant(
    merchant_id: uuid.UUID,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a single merchant by ID (admin only)."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return MerchantResponse.model_validate(merchant)


@router.patch("/{merchant_id}", response_model=MerchantResponse)
async def update_merchant(
    merchant_id: uuid.UUID,
    data: MerchantUpdate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a merchant (admin only)."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(merchant, field, value)

    await db.commit()
    await db.refresh(merchant)
    return MerchantResponse.model_validate(merchant)
