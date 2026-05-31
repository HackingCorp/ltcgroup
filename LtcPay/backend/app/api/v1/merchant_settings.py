"""Merchant settings endpoints."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.merchant import Merchant
from app.api.v1.merchant_auth import get_current_merchant_jwt

router = APIRouter(prefix="/merchant-dashboard/settings", tags=["Merchant Settings"])


class UpdateBusinessRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    business_type: str | None = None
    description: str | None = None
    legal_name: str | None = None
    trade_register: str | None = None
    tax_id: str | None = None
    address: str | None = None


class UpdatePayoutsRequest(BaseModel):
    payout_schedule: str | None = None
    fee_rate: float | None = None
    fee_bearer: str | None = None


class UpdateSecurityRequest(BaseModel):
    two_fa_enabled: bool | None = None
    ip_whitelist: list[str] | None = None
    sms_alerts_enabled: bool | None = None
    email_confirm_withdrawals: bool | None = None


class UpdateBrandingRequest(BaseModel):
    logo_url: str | None = None
    checkout_primary_color: str | None = None
    checkout_subdomain: str | None = None


def _build_settings(merchant: Merchant) -> dict:
    """Build the full settings dict from the merchant model."""
    return {
        "business": {
            "name": merchant.name,
            "email": merchant.email,
            "phone": merchant.phone,
            "website": merchant.website,
            "business_type": merchant.business_type,
            "description": merchant.description,
            "legal_name": getattr(merchant, "legal_name", None),
            "trade_register": getattr(merchant, "trade_register", None),
            "tax_id": getattr(merchant, "tax_id", None),
            "address": getattr(merchant, "address", None),
        },
        "payouts": {
            "payout_schedule": getattr(merchant, "payout_schedule", "weekly"),
            "fee_rate": float(merchant.fee_rate),
            "fee_bearer": merchant.fee_bearer.value if hasattr(merchant.fee_bearer, "value") else str(merchant.fee_bearer),
        },
        "security": {
            "two_fa_enabled": getattr(merchant, "two_fa_enabled", False),
            "ip_whitelist": getattr(merchant, "ip_whitelist", []),
            "sms_alerts_enabled": getattr(merchant, "sms_alerts_enabled", False),
            "email_confirm_withdrawals": getattr(merchant, "email_confirm_withdrawals", False),
        },
        "branding": {
            "logo_url": merchant.logo_url,
            "checkout_primary_color": getattr(merchant, "checkout_primary_color", None),
            "checkout_subdomain": getattr(merchant, "checkout_subdomain", None),
        },
    }


@router.get("/")
async def get_settings(
    merchant: Merchant = Depends(get_current_merchant_jwt),
):
    """Return all merchant settings grouped by category."""
    return _build_settings(merchant)


@router.patch("/business")
async def update_business(
    body: UpdateBusinessRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Update business profile fields."""
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if hasattr(merchant, field):
            setattr(merchant, field, value)
    await db.commit()
    await db.refresh(merchant)
    return _build_settings(merchant)


@router.patch("/payouts")
async def update_payouts(
    body: UpdatePayoutsRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Update payout configuration."""
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if hasattr(merchant, field):
            setattr(merchant, field, value)
    await db.commit()
    await db.refresh(merchant)
    return _build_settings(merchant)


@router.patch("/security")
async def update_security(
    body: UpdateSecurityRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Update security settings."""
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if hasattr(merchant, field):
            setattr(merchant, field, value)
    await db.commit()
    await db.refresh(merchant)
    return _build_settings(merchant)


@router.patch("/branding")
async def update_branding(
    body: UpdateBrandingRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Update branding settings."""
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if hasattr(merchant, field):
            setattr(merchant, field, value)
    await db.commit()
    await db.refresh(merchant)
    return _build_settings(merchant)
