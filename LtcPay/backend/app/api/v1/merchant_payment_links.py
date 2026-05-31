"""Merchant payment links endpoints."""
import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.payment_link import PaymentLink
from app.api.v1.merchant_auth import get_current_merchant_jwt

router = APIRouter(prefix="/merchant-dashboard/links", tags=["Merchant Payment Links"])


class CreatePaymentLinkRequest(BaseModel):
    name: str
    amount: float | None = None
    currency: str = "XAF"
    description: str | None = None
    max_uses: int | None = None


class UpdatePaymentLinkRequest(BaseModel):
    name: str | None = None
    amount: float | None = None
    description: str | None = None
    max_uses: int | None = None
    active: bool | None = None


def _slugify(name: str) -> str:
    """Generate a URL-safe slug from a name with a random suffix."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    suffix = secrets.token_hex(2)
    return f"{slug}-{suffix}"


def _serialize_link(link: PaymentLink) -> dict:
    return {
        "id": str(link.id),
        "name": link.name,
        "slug": link.slug,
        "amount": float(link.amount) if link.amount is not None else None,
        "currency": link.currency,
        "description": link.description,
        "uses": link.uses,
        "max_uses": link.max_uses,
        "active": link.active,
        "created_at": link.created_at.isoformat(),
        "updated_at": link.updated_at.isoformat(),
    }


@router.get("/")
async def list_payment_links(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    active: bool | None = Query(None),
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """List payment links for the current merchant."""
    filters = [PaymentLink.merchant_id == merchant.id]
    if active is not None:
        filters.append(PaymentLink.active == active)

    count_q = await db.execute(
        select(func.count(PaymentLink.id)).where(and_(*filters))
    )
    total = count_q.scalar() or 0

    offset = (page - 1) * page_size
    items_q = await db.execute(
        select(PaymentLink)
        .where(and_(*filters))
        .order_by(PaymentLink.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = items_q.scalars().all()

    return {
        "items": [_serialize_link(link) for link in items],
        "total": total,
        "page": page,
        "per_page": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


@router.post("/")
async def create_payment_link(
    body: CreatePaymentLinkRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Create a new payment link."""
    slug = _slugify(body.name)

    link = PaymentLink(
        merchant_id=merchant.id,
        name=body.name,
        slug=slug,
        amount=body.amount,
        currency=body.currency,
        description=body.description,
        max_uses=body.max_uses,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return _serialize_link(link)


@router.get("/{link_id}")
async def get_payment_link(
    link_id: str,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get a single payment link."""
    result = await db.execute(
        select(PaymentLink).where(
            and_(PaymentLink.id == link_id, PaymentLink.merchant_id == merchant.id)
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")
    return _serialize_link(link)


@router.patch("/{link_id}")
async def update_payment_link(
    link_id: str,
    body: UpdatePaymentLinkRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Update a payment link."""
    result = await db.execute(
        select(PaymentLink).where(
            and_(PaymentLink.id == link_id, PaymentLink.merchant_id == merchant.id)
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")

    if body.name is not None:
        link.name = body.name
    if body.amount is not None:
        link.amount = body.amount
    if body.description is not None:
        link.description = body.description
    if body.max_uses is not None:
        link.max_uses = body.max_uses
    if body.active is not None:
        link.active = body.active

    await db.commit()
    await db.refresh(link)
    return _serialize_link(link)


@router.delete("/{link_id}")
async def delete_payment_link(
    link_id: str,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a payment link (set active=False)."""
    result = await db.execute(
        select(PaymentLink).where(
            and_(PaymentLink.id == link_id, PaymentLink.merchant_id == merchant.id)
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")

    link.active = False
    await db.commit()
    return {"detail": "Payment link deactivated"}
