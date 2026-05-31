"""
Admin finance endpoints — platform KPIs, settlements, revenue split.
"""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.payment import Payment, PaymentStatus
from app.models.withdrawal import Withdrawal, WithdrawalStatus
from app.api.v1.auth import get_current_admin

router = APIRouter(prefix="/admin/finance", tags=["Admin Finance"])


@router.get("/stats")
async def finance_stats(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform financial KPIs."""
    # Completed payments aggregation
    pay_q = await db.execute(
        select(
            func.coalesce(func.sum(Payment.amount), 0).label("total_gmv"),
            func.coalesce(func.sum(Payment.fee), 0).label("total_fees"),
            func.count(Payment.id).label("payment_count"),
        ).where(Payment.status == PaymentStatus.COMPLETED)
    )
    row = pay_q.one()
    total_gmv = float(row.total_gmv)
    total_fees = float(row.total_fees)
    payment_count = row.payment_count

    # Completed withdrawals
    wd_q = await db.execute(
        select(
            func.coalesce(func.sum(Withdrawal.amount), 0).label("total_payouts"),
        ).where(Withdrawal.status == WithdrawalStatus.COMPLETED)
    )
    total_payouts = float(wd_q.scalar_one())

    net_revenue = total_fees
    take_rate = (total_fees / total_gmv * 100) if total_gmv > 0 else 0
    margin = net_revenue - total_payouts
    avg_transaction = (total_gmv / payment_count) if payment_count > 0 else 0

    return {
        "total_gmv": round(total_gmv, 2),
        "total_fees": round(total_fees, 2),
        "net_revenue": round(net_revenue, 2),
        "take_rate": round(take_rate, 2),
        "total_payouts": round(total_payouts, 2),
        "margin": round(margin, 2),
        "payment_count": payment_count,
        "avg_transaction": round(avg_transaction, 2),
    }


@router.get("/settlements")
async def settlements(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Settlements by day (last 30 days)."""
    since = datetime.now(timezone.utc) - timedelta(days=30)
    q = await db.execute(
        select(
            cast(Payment.completed_at, Date).label("date"),
            func.count(Payment.id).label("count"),
            func.coalesce(func.sum(Payment.amount), 0).label("volume"),
            func.coalesce(func.sum(Payment.fee), 0).label("fees"),
        )
        .where(
            and_(
                Payment.status == PaymentStatus.COMPLETED,
                Payment.completed_at >= since,
            )
        )
        .group_by(cast(Payment.completed_at, Date))
        .order_by(cast(Payment.completed_at, Date).desc())
    )
    rows = q.all()
    return {
        "settlements": [
            {
                "date": str(r.date) if r.date else None,
                "count": r.count,
                "volume": float(r.volume),
                "fees": float(r.fees),
            }
            for r in rows
        ]
    }


@router.get("/revenue-split")
async def revenue_split(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Revenue decomposition grouped by operator."""
    q = await db.execute(
        select(
            Payment.operator.label("operator"),
            func.coalesce(func.sum(Payment.amount), 0).label("volume"),
            func.coalesce(func.sum(Payment.fee), 0).label("fees"),
            func.count(Payment.id).label("count"),
        )
        .where(Payment.status == PaymentStatus.COMPLETED)
        .group_by(Payment.operator)
    )
    rows = q.all()
    return {
        "revenue_split": [
            {
                "operator": r.operator.value if hasattr(r.operator, "value") else str(r.operator) if r.operator else "unknown",
                "volume": float(r.volume),
                "fees": float(r.fees),
                "count": r.count,
            }
            for r in rows
        ]
    }
