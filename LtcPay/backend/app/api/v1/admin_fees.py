"""
Admin fee management endpoints — fee rules, overrides, stats.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.fee_rule import FeeRule, FeeOverride
from app.models.merchant import Merchant
from app.api.v1.auth import get_current_admin

router = APIRouter(prefix="/admin/fees", tags=["Admin Fees"])


# ─── Request bodies ────────────────────────────────────────────

class FeeRuleCreate(BaseModel):
    payment_method: str
    plan: str
    rate: str
    settle_delay: str = "T+1"
    is_active: bool = True


class FeeRuleUpdate(BaseModel):
    payment_method: Optional[str] = None
    plan: Optional[str] = None
    rate: Optional[str] = None
    settle_delay: Optional[str] = None
    is_active: Optional[bool] = None


class FeeOverrideCreate(BaseModel):
    merchant_id: str
    payment_method: str
    standard_rate: str
    custom_rate: str
    expires_at: Optional[datetime] = None
    admin_note: Optional[str] = None


class FeeOverrideUpdate(BaseModel):
    payment_method: Optional[str] = None
    standard_rate: Optional[str] = None
    custom_rate: Optional[str] = None
    expires_at: Optional[datetime] = None
    admin_note: Optional[str] = None


# ─── Fee Rules ─────────────────────────────────────────────────

@router.get("/rules")
async def list_fee_rules(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all fee rules."""
    q = await db.execute(
        select(FeeRule).order_by(FeeRule.created_at.desc())
    )
    rules = q.scalars().all()
    return {
        "rules": [
            {
                "id": str(r.id),
                "payment_method": r.payment_method,
                "plan": r.plan,
                "rate": r.rate,
                "settle_delay": r.settle_delay,
                "is_active": r.is_active,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rules
        ]
    }


@router.post("/rules")
async def create_fee_rule(
    body: FeeRuleCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a fee rule."""
    rule = FeeRule(
        payment_method=body.payment_method,
        plan=body.plan,
        rate=body.rate,
        settle_delay=body.settle_delay,
        is_active=body.is_active,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {
        "id": str(rule.id),
        "payment_method": rule.payment_method,
        "plan": rule.plan,
        "rate": rule.rate,
        "settle_delay": rule.settle_delay,
        "is_active": rule.is_active,
        "created_at": rule.created_at.isoformat() if rule.created_at else None,
    }


@router.patch("/rules/{rule_id}")
async def update_fee_rule(
    rule_id: str,
    body: FeeRuleUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a fee rule."""
    result = await db.execute(select(FeeRule).where(FeeRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Fee rule not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)

    await db.commit()
    await db.refresh(rule)
    return {
        "id": str(rule.id),
        "payment_method": rule.payment_method,
        "plan": rule.plan,
        "rate": rule.rate,
        "settle_delay": rule.settle_delay,
        "is_active": rule.is_active,
        "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
    }


# ─── Fee Overrides ─────────────────────────────────────────────

@router.get("/overrides")
async def list_fee_overrides(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all fee overrides with merchant name."""
    q = await db.execute(
        select(FeeOverride, Merchant.name.label("merchant_name"))
        .outerjoin(Merchant, FeeOverride.merchant_id == Merchant.id)
        .order_by(FeeOverride.created_at.desc())
    )
    rows = q.all()
    return {
        "overrides": [
            {
                "id": str(o.id),
                "merchant_id": str(o.merchant_id),
                "merchant_name": mn,
                "payment_method": o.payment_method,
                "standard_rate": o.standard_rate,
                "custom_rate": o.custom_rate,
                "expires_at": o.expires_at.isoformat() if o.expires_at else None,
                "admin_note": o.admin_note,
                "created_by": str(o.created_by) if o.created_by else None,
                "created_at": o.created_at.isoformat() if o.created_at else None,
                "updated_at": o.updated_at.isoformat() if o.updated_at else None,
            }
            for o, mn in rows
        ]
    }


@router.post("/overrides")
async def create_fee_override(
    body: FeeOverrideCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a fee override for a merchant."""
    override = FeeOverride(
        merchant_id=uuid.UUID(body.merchant_id),
        payment_method=body.payment_method,
        standard_rate=body.standard_rate,
        custom_rate=body.custom_rate,
        expires_at=body.expires_at,
        admin_note=body.admin_note,
        created_by=admin.id,
    )
    db.add(override)
    await db.commit()
    await db.refresh(override)
    return {
        "id": str(override.id),
        "merchant_id": str(override.merchant_id),
        "payment_method": override.payment_method,
        "standard_rate": override.standard_rate,
        "custom_rate": override.custom_rate,
        "expires_at": override.expires_at.isoformat() if override.expires_at else None,
        "admin_note": override.admin_note,
        "created_by": str(override.created_by) if override.created_by else None,
        "created_at": override.created_at.isoformat() if override.created_at else None,
    }


@router.patch("/overrides/{override_id}")
async def update_fee_override(
    override_id: str,
    body: FeeOverrideUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a fee override."""
    result = await db.execute(
        select(FeeOverride).where(FeeOverride.id == override_id)
    )
    override = result.scalar_one_or_none()
    if not override:
        raise HTTPException(status_code=404, detail="Fee override not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(override, field, value)

    await db.commit()
    await db.refresh(override)
    return {
        "id": str(override.id),
        "merchant_id": str(override.merchant_id),
        "payment_method": override.payment_method,
        "standard_rate": override.standard_rate,
        "custom_rate": override.custom_rate,
        "expires_at": override.expires_at.isoformat() if override.expires_at else None,
        "admin_note": override.admin_note,
        "updated_at": override.updated_at.isoformat() if override.updated_at else None,
    }


@router.delete("/overrides/{override_id}")
async def delete_fee_override(
    override_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a fee override."""
    result = await db.execute(
        select(FeeOverride).where(FeeOverride.id == override_id)
    )
    override = result.scalar_one_or_none()
    if not override:
        raise HTTPException(status_code=404, detail="Fee override not found")

    await db.delete(override)
    await db.commit()
    return {"detail": "Fee override deleted"}


# ─── Stats ─────────────────────────────────────────────────────

@router.get("/stats")
async def fee_plan_stats(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Count merchants per plan."""
    q = await db.execute(
        select(
            Merchant.plan,
            func.count(Merchant.id).label("count"),
        ).group_by(Merchant.plan)
    )
    rows = q.all()
    return {
        "plans": [
            {"plan": r.plan, "count": r.count}
            for r in rows
        ]
    }
