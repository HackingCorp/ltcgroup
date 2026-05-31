"""Merchant refunds endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.refund import Refund, RefundStatus, generate_refund_ref
from app.models.payment import Payment, PaymentStatus
from app.api.v1.merchant_auth import get_current_merchant_jwt

router = APIRouter(prefix="/merchant-dashboard/refunds", tags=["Merchant Refunds"])


class CreateRefundRequest(BaseModel):
    payment_id: str
    amount: float
    reason: str | None = None


def _serialize_refund(refund: Refund) -> dict:
    return {
        "id": str(refund.id),
        "payment_id": str(refund.payment_id),
        "reference": refund.reference,
        "amount": float(refund.amount),
        "currency": refund.currency,
        "status": refund.status.value if hasattr(refund.status, "value") else str(refund.status),
        "reason": refund.reason,
        "operator": refund.operator,
        "customer_contact": refund.customer_contact,
        "processed_at": refund.processed_at.isoformat() if refund.processed_at else None,
        "created_at": refund.created_at.isoformat(),
        "updated_at": refund.updated_at.isoformat(),
    }


@router.get("/stats")
async def get_refund_stats(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get refund KPIs for the merchant."""
    # Total refunded amount (COMPLETED refunds)
    refunded_q = await db.execute(
        select(func.coalesce(func.sum(Refund.amount), 0)).where(
            and_(
                Refund.merchant_id == merchant.id,
                Refund.status == RefundStatus.COMPLETED,
            )
        )
    )
    total_refunded = float(refunded_q.scalar() or 0)

    # Refund rate: count of refunds / count of payments * 100
    refund_count_q = await db.execute(
        select(func.count(Refund.id)).where(Refund.merchant_id == merchant.id)
    )
    refund_count = refund_count_q.scalar() or 0

    payment_count_q = await db.execute(
        select(func.count(Payment.id)).where(Payment.merchant_id == merchant.id)
    )
    payment_count = payment_count_q.scalar() or 0

    refund_rate = (refund_count / payment_count * 100) if payment_count > 0 else 0

    # Average processing days for COMPLETED refunds
    avg_days_q = await db.execute(
        select(
            func.avg(
                func.extract("epoch", Refund.processed_at - Refund.created_at) / 86400
            )
        ).where(
            and_(
                Refund.merchant_id == merchant.id,
                Refund.status == RefundStatus.COMPLETED,
                Refund.processed_at.isnot(None),
            )
        )
    )
    avg_processing_days = float(avg_days_q.scalar() or 0)

    return {
        "total_refunded": total_refunded,
        "refund_rate": round(refund_rate, 2),
        "avg_processing_days": round(avg_processing_days, 1),
    }


@router.get("/")
async def list_refunds(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """List refunds for the current merchant."""
    filters = [Refund.merchant_id == merchant.id]
    if status:
        try:
            rs = RefundStatus(status)
            filters.append(Refund.status == rs)
        except ValueError:
            pass

    count_q = await db.execute(
        select(func.count(Refund.id)).where(and_(*filters))
    )
    total = count_q.scalar() or 0

    offset = (page - 1) * page_size
    items_q = await db.execute(
        select(Refund)
        .where(and_(*filters))
        .order_by(Refund.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = items_q.scalars().all()

    return {
        "items": [_serialize_refund(r) for r in items],
        "total": total,
        "page": page,
        "per_page": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


@router.post("/")
async def create_refund(
    body: CreateRefundRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Request a refund for a payment."""
    # Validate payment belongs to merchant
    payment_q = await db.execute(
        select(Payment).where(
            and_(Payment.id == body.payment_id, Payment.merchant_id == merchant.id)
        )
    )
    payment = payment_q.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Payment must be completed
    if payment.status != PaymentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Payment is not in COMPLETED status")

    # Amount must not exceed payment amount
    if body.amount > float(payment.amount):
        raise HTTPException(status_code=400, detail="Refund amount exceeds payment amount")

    refund = Refund(
        merchant_id=merchant.id,
        payment_id=payment.id,
        reference=generate_refund_ref(),
        amount=body.amount,
        currency=payment.currency,
        reason=body.reason,
        operator=payment.operator.value if payment.operator and hasattr(payment.operator, "value") else None,
        customer_contact=payment.customer_phone,
    )
    db.add(refund)
    await db.commit()
    await db.refresh(refund)
    return _serialize_refund(refund)


@router.get("/{refund_id}")
async def get_refund(
    refund_id: str,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get a single refund detail."""
    result = await db.execute(
        select(Refund).where(
            and_(Refund.id == refund_id, Refund.merchant_id == merchant.id)
        )
    )
    refund = result.scalar_one_or_none()
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")
    return _serialize_refund(refund)
