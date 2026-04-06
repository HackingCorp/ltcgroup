"""
Dashboard stats endpoint for the LtcPay admin dashboard.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.auth import get_current_admin
from app.models.payment import Payment, PaymentStatus

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    _=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return dashboard statistics."""
    # Total payments count
    total_result = await db.execute(select(func.count(Payment.id)))
    total_payments = total_result.scalar() or 0

    # Completed payments (revenue)
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.status == PaymentStatus.COMPLETED)
    )
    total_revenue = float(revenue_result.scalar() or 0)

    # Total transactions (completed + failed + refunded)
    tx_result = await db.execute(
        select(func.count(Payment.id))
        .where(Payment.status.in_([
            PaymentStatus.COMPLETED,
            PaymentStatus.FAILED,
            PaymentStatus.REFUNDED,
        ]))
    )
    total_transactions = tx_result.scalar() or 0

    # Success rate
    completed_result = await db.execute(
        select(func.count(Payment.id))
        .where(Payment.status == PaymentStatus.COMPLETED)
    )
    completed_count = completed_result.scalar() or 0
    success_rate = (completed_count / total_transactions * 100) if total_transactions > 0 else 0

    # Recent payments (last 10)
    recent_result = await db.execute(
        select(Payment)
        .order_by(Payment.created_at.desc())
        .limit(10)
    )
    recent_payments = []
    for p in recent_result.scalars().all():
        recent_payments.append({
            "id": str(p.id),
            "reference": p.reference,
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status.value,
            "description": p.description,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    # Revenue chart (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    chart_result = await db.execute(
        select(
            cast(Payment.created_at, Date).label("date"),
            func.coalesce(func.sum(Payment.amount), 0).label("amount"),
        )
        .where(
            Payment.status == PaymentStatus.COMPLETED,
            Payment.created_at >= thirty_days_ago,
        )
        .group_by(cast(Payment.created_at, Date))
        .order_by(cast(Payment.created_at, Date))
    )
    revenue_chart = [
        {"date": str(row.date), "amount": float(row.amount)}
        for row in chart_result.all()
    ]

    return {
        "total_payments": total_payments,
        "total_revenue": total_revenue,
        "total_transactions": total_transactions,
        "success_rate": round(success_rate, 1),
        "recent_payments": recent_payments,
        "revenue_chart": revenue_chart,
    }


@router.get("/payments")
async def list_payments_admin(
    _=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    status: str | None = Query(default=None),
):
    """List all payments (admin view)."""
    base_query = select(Payment)

    if status:
        try:
            ps = PaymentStatus(status)
            base_query = base_query.where(Payment.status == ps)
        except ValueError:
            pass

    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * per_page
    result = await db.execute(
        base_query.order_by(Payment.created_at.desc()).offset(offset).limit(per_page)
    )
    payments = result.scalars().all()

    items = []
    for p in payments:
        items.append({
            "id": str(p.id),
            "reference": p.reference,
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status.value,
            "description": p.description,
            "payment_method": p.method.value if p.method else None,
            "customer_email": p.customer_info.get("email") if p.customer_info else None,
            "customer_phone": p.customer_info.get("phone") if p.customer_info else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
    }
