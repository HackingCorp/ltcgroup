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
            "customer_email": p.customer_email,
            "customer_phone": p.customer_phone,
            "payment_method": p.payment_mode.value if p.payment_mode and hasattr(p.payment_mode, "value") else p.payment_mode,
            "operator": p.operator.value if p.operator and hasattr(p.operator, "value") else p.operator,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
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

    # Status distribution
    status_dist_result = await db.execute(
        select(
            Payment.status,
            func.count(Payment.id).label("count"),
        )
        .group_by(Payment.status)
    )
    status_distribution = [
        {
            "status": row.status.value if hasattr(row.status, "value") else str(row.status),
            "count": row.count,
        }
        for row in status_dist_result.all()
    ]

    return {
        "total_payments": total_payments,
        "total_revenue": total_revenue,
        "total_transactions": total_transactions,
        "success_rate": round(success_rate, 1),
        "recent_payments": recent_payments,
        "revenue_chart": revenue_chart,
        "status_distribution": status_distribution,
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
            "payment_method": p.payment_mode.value if p.payment_mode and hasattr(p.payment_mode, "value") else p.payment_mode,
            "operator": p.operator.value if p.operator and hasattr(p.operator, "value") else p.operator,
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


@router.get("/failures")
async def get_failure_breakdown(
    days: int = Query(7, ge=1, le=90),
    _=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate FAILED payments by operator failure code over the last N days.

    The code is extracted from the "[NN] ..." message stored in touchpay_data
    by the TouchPay callback handler. Lets admins spot an operator outage
    (e.g. a spike of [19]) at a glance.
    """
    from app.main import extract_failure_code

    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(Payment.touchpay_data, Payment.operator)
        .where(Payment.status == PaymentStatus.FAILED, Payment.created_at >= since)
    )
    rows = result.all()

    counts: dict = {}
    for touchpay_data, operator in rows:
        code = extract_failure_code(touchpay_data) or "unknown"
        raw_message = (touchpay_data or {}).get("message") or None
        entry = counts.setdefault(code, {
            "code": code,
            "count": 0,
            "sample_message": raw_message,
            "by_operator": {},
        })
        entry["count"] += 1
        if entry["sample_message"] is None and raw_message:
            entry["sample_message"] = raw_message
        if operator:
            op = operator.value if hasattr(operator, "value") else str(operator)
            entry["by_operator"][op] = entry["by_operator"].get(op, 0) + 1

    items = sorted(counts.values(), key=lambda e: -e["count"])
    return {"days": days, "total_failed": len(rows), "items": items}


@router.get("/overview")
async def get_platform_overview(
    days: int = Query(30, ge=1, le=365),
    _=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Real figures for the three overview panels.

    They were showing "donnees non disponibles" because nothing served
    them: the countries panel read stats.countries, which /stats has never
    returned, and the top-merchants panel sorted a merchant list on a
    total_revenue field that is not on it.

    The GMV panel was worse than empty. It took one revenue series and
    multiplied it by fixed shares — 48% Orange, 31% MTN, 14% card, 7% Wave
    — and displayed the result under a "Realtime" badge. Those proportions
    were invented. This returns what each operator actually collected.
    """
    from app.models.country import SupportedCountry
    from app.models.merchant import Merchant

    since = datetime.now(timezone.utc) - timedelta(days=days)
    collected = (
        Payment.created_at >= since,
        Payment.status == PaymentStatus.COMPLETED,
    )

    # -- GMV per operator, actually collected --------------------------
    rows = (await db.execute(
        select(
            Payment.country, Payment.operator, Payment.provider,
            func.count().label("count"),
            func.coalesce(func.sum(Payment.amount), 0).label("amount"),
        )
        .where(*collected)
        .group_by(Payment.country, Payment.operator, Payment.provider)
        .order_by(func.sum(Payment.amount).desc())
    )).all()
    gmv = [
        {
            "country": r.country,
            "operator": r.operator or "—",
            "provider": r.provider.value if hasattr(r.provider, "value") else str(r.provider),
            "count": r.count,
            "amount": float(r.amount),
        }
        for r in rows
    ]

    # -- Per country: attempts, collected, and what came in -------------
    per_country = (await db.execute(
        select(
            Payment.country,
            func.count().label("attempts"),
            func.count().filter(Payment.status == PaymentStatus.COMPLETED).label("completed"),
            func.coalesce(
                func.sum(Payment.amount).filter(Payment.status == PaymentStatus.COMPLETED), 0,
            ).label("amount"),
        )
        .where(Payment.created_at >= since, Payment.country.isnot(None))
        .group_by(Payment.country)
        .order_by(func.count().desc())
    )).all()

    names = {
        c.code: (c.name, c.flag_emoji, c.currency)
        for c in (await db.execute(select(SupportedCountry))).scalars().all()
    }
    busiest = max((r.attempts for r in per_country), default=0)
    countries = [
        {
            "code": r.country,
            "name": names.get(r.country, (r.country, "", ""))[0],
            "flag": names.get(r.country, ("", "", ""))[1],
            "currency": names.get(r.country, ("", "", ""))[2],
            "attempts": r.attempts,
            "completed": r.completed,
            "amount": float(r.amount),
            # Share of the busiest corridor, for the bar width.
            "pct": round(100.0 * r.attempts / busiest, 1) if busiest else 0.0,
        }
        for r in per_country
    ]

    # -- Merchants, ranked by what they actually collected --------------
    merchant_rows = (await db.execute(
        select(
            Merchant.id, Merchant.name,
            func.count(Payment.id).label("count"),
            func.coalesce(func.sum(Payment.amount), 0).label("amount"),
        )
        .join(Payment, Payment.merchant_id == Merchant.id)
        .where(*collected)
        .group_by(Merchant.id, Merchant.name)
        .order_by(func.sum(Payment.amount).desc())
        .limit(5)
    )).all()
    top_merchants = [
        {"id": str(r.id), "name": r.name, "count": r.count, "amount": float(r.amount)}
        for r in merchant_rows
    ]

    return {
        "days": days,
        "gmv_by_operator": gmv,
        "countries": countries,
        "top_merchants": top_merchants,
    }
