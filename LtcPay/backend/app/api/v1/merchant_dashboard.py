"""
Merchant dashboard endpoints — stats and payment history for the merchant portal.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.payment import Payment, PaymentStatus
from app.api.v1.merchant_auth import get_current_merchant_jwt

router = APIRouter(prefix="/merchant-dashboard", tags=["Merchant Dashboard"])


@router.get("/stats")
async def get_merchant_stats(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics for the current merchant."""
    merchant_filter = Payment.merchant_id == merchant.id

    # Total payments
    total_q = await db.execute(
        select(func.count(Payment.id)).where(merchant_filter)
    )
    total_payments = total_q.scalar() or 0

    # Completed payments (revenue)
    completed_q = await db.execute(
        select(func.count(Payment.id), func.coalesce(func.sum(Payment.amount), 0)).where(
            and_(merchant_filter, Payment.status == PaymentStatus.COMPLETED)
        )
    )
    row = completed_q.one()
    completed_count = row[0] or 0
    total_revenue = float(row[1] or 0)

    # Success rate
    success_rate = (completed_count / total_payments * 100) if total_payments > 0 else 0

    # Recent payments
    recent_q = await db.execute(
        select(Payment)
        .where(merchant_filter)
        .order_by(Payment.created_at.desc())
        .limit(10)
    )
    recent_payments = recent_q.scalars().all()

    # Revenue chart (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    chart_q = await db.execute(
        select(
            func.date(Payment.created_at).label("date"),
            func.sum(Payment.amount).label("amount"),
        )
        .where(
            and_(
                merchant_filter,
                Payment.status == PaymentStatus.COMPLETED,
                Payment.created_at >= thirty_days_ago,
            )
        )
        .group_by(func.date(Payment.created_at))
        .order_by(func.date(Payment.created_at))
    )
    revenue_chart = [
        {"date": str(r.date), "amount": float(r.amount)} for r in chart_q.all()
    ]

    return {
        "total_payments": total_payments,
        "total_revenue": total_revenue,
        "total_transactions": completed_count,
        "success_rate": round(success_rate, 1),
        "recent_payments": [
            {
                "id": str(p.id),
                "reference": p.reference,
                "amount": float(p.amount),
                "currency": p.currency,
                "status": p.status.value if hasattr(p.status, "value") else p.status,
                "description": p.description,
                "customer_email": p.customer_email,
                "customer_phone": p.customer_phone,
                "created_at": p.created_at.isoformat(),
                "updated_at": p.updated_at.isoformat(),
            }
            for p in recent_payments
        ],
        "revenue_chart": revenue_chart,
    }


@router.get("/payments")
async def list_merchant_payments(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """List payments for the current merchant."""
    base_filter = Payment.merchant_id == merchant.id
    filters = [base_filter]

    if status:
        try:
            ps = PaymentStatus(status)
            filters.append(Payment.status == ps)
        except ValueError:
            pass

    # Count
    count_q = await db.execute(
        select(func.count(Payment.id)).where(and_(*filters))
    )
    total_count = count_q.scalar() or 0

    # Fetch
    offset = (page - 1) * page_size
    payments_q = await db.execute(
        select(Payment)
        .where(and_(*filters))
        .order_by(Payment.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    payments = payments_q.scalars().all()

    return {
        "items": [
            {
                "id": str(p.id),
                "reference": p.reference,
                "amount": float(p.amount),
                "currency": p.currency,
                "status": p.status.value if hasattr(p.status, "value") else p.status,
                "description": p.description,
                "customer_email": p.customer_email,
                "customer_phone": p.customer_phone,
                "payment_method": p.payment_method.value if p.payment_method and hasattr(p.payment_method, "value") else p.payment_method,
                "created_at": p.created_at.isoformat(),
                "updated_at": p.updated_at.isoformat(),
            }
            for p in payments
        ],
        "total": total_count,
        "page": page,
        "per_page": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if page_size > 0 else 0,
    }


@router.get("/payments/{reference}")
async def get_merchant_payment(
    reference: str,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get a single payment detail."""
    result = await db.execute(
        select(Payment).where(
            and_(Payment.reference == reference, Payment.merchant_id == merchant.id)
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    return {
        "id": str(payment.id),
        "reference": payment.reference,
        "amount": float(payment.amount),
        "currency": payment.currency,
        "status": payment.status.value if hasattr(payment.status, "value") else payment.status,
        "description": payment.description,
        "customer_email": payment.customer_email,
        "customer_phone": payment.customer_phone,
        "payment_method": payment.payment_method.value if payment.payment_method and hasattr(payment.payment_method, "value") else payment.payment_method,
        "callback_url": payment.callback_url,
        "metadata": payment.payment_metadata,
        "created_at": payment.created_at.isoformat(),
        "updated_at": payment.updated_at.isoformat(),
    }
