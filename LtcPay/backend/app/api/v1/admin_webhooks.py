"""
Admin webhook monitoring endpoints.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.webhook_log import WebhookLog
from app.api.v1.auth import get_current_admin

router = APIRouter(prefix="/admin/webhooks", tags=["Admin Webhooks"])


@router.get("/stats")
async def webhook_stats(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Webhook KPIs (last 24 hours)."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)

    # Total 24h
    total_q = await db.execute(
        select(func.count(WebhookLog.id)).where(
            WebhookLog.created_at >= since
        )
    )
    total_24h = total_q.scalar() or 0

    # Successful 24h (2xx status)
    success_q = await db.execute(
        select(func.count(WebhookLog.id)).where(
            and_(
                WebhookLog.created_at >= since,
                WebhookLog.http_status >= 200,
                WebhookLog.http_status < 300,
            )
        )
    )
    success_24h = success_q.scalar() or 0

    success_rate = (success_24h / total_24h * 100) if total_24h > 0 else 0

    # Average latency
    latency_q = await db.execute(
        select(func.avg(WebhookLog.latency_ms)).where(
            WebhookLog.created_at >= since
        )
    )
    avg_latency = latency_q.scalar()
    avg_latency = round(float(avg_latency), 1) if avg_latency else 0

    # Retry queue: retried but not successful
    retry_q = await db.execute(
        select(func.count(WebhookLog.id)).where(
            and_(
                WebhookLog.retry_count > 0,
                or_(
                    WebhookLog.http_status < 200,
                    WebhookLog.http_status >= 300,
                    WebhookLog.http_status.is_(None),
                ),
            )
        )
    )
    retry_queue = retry_q.scalar() or 0

    return {
        "total_24h": total_24h,
        "success_24h": success_24h,
        "success_rate": round(success_rate, 1),
        "avg_latency": avg_latency,
        "retry_queue": retry_queue,
    }


@router.get("/logs")
async def list_webhook_logs(
    direction: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List webhook logs (paginated)."""
    filters = []
    if direction:
        filters.append(WebhookLog.direction == direction)

    where_clause = and_(*filters) if filters else True

    count_q = await db.execute(
        select(func.count(WebhookLog.id)).where(where_clause)
    )
    total = count_q.scalar() or 0

    offset = (page - 1) * page_size
    items_q = await db.execute(
        select(WebhookLog)
        .where(where_clause)
        .order_by(WebhookLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = items_q.scalars().all()

    return {
        "items": [
            {
                "id": str(log.id),
                "direction": log.direction,
                "payment_reference": log.payment_reference,
                "merchant_id": str(log.merchant_id) if log.merchant_id else None,
                "method": log.method,
                "url": log.url,
                "http_status": log.http_status,
                "latency_ms": log.latency_ms,
                "hmac_valid": log.hmac_valid,
                "error_message": log.error_message,
                "retry_count": log.retry_count,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in items
        ],
        "total": total,
        "page": page,
        "per_page": page_size,
    }


@router.get("/logs/{log_id}")
async def get_webhook_log(
    log_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get single webhook log detail."""
    result = await db.execute(
        select(WebhookLog).where(WebhookLog.id == log_id)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Webhook log not found")

    return {
        "id": str(log.id),
        "direction": log.direction,
        "payment_reference": log.payment_reference,
        "merchant_id": str(log.merchant_id) if log.merchant_id else None,
        "method": log.method,
        "url": log.url,
        "http_status": log.http_status,
        "latency_ms": log.latency_ms,
        "request_body": log.request_body,
        "response_body": log.response_body,
        "hmac_valid": log.hmac_valid,
        "error_message": log.error_message,
        "retry_count": log.retry_count,
        "max_retries": log.max_retries,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


@router.get("/method-breakdown")
async def method_breakdown(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Webhook counts grouped by direction."""
    q = await db.execute(
        select(
            WebhookLog.direction,
            func.count(WebhookLog.id).label("count"),
        ).group_by(WebhookLog.direction)
    )
    rows = q.all()
    return {
        "breakdown": [
            {"direction": r.direction, "count": r.count}
            for r in rows
        ]
    }


@router.get("/errors")
async def recent_errors(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List recent webhook errors (last 50)."""
    q = await db.execute(
        select(WebhookLog)
        .where(
            and_(
                or_(
                    WebhookLog.http_status < 200,
                    WebhookLog.http_status >= 300,
                    WebhookLog.http_status.is_(None),
                ),
                WebhookLog.error_message.isnot(None),
            )
        )
        .order_by(WebhookLog.created_at.desc())
        .limit(50)
    )
    items = q.scalars().all()

    return {
        "errors": [
            {
                "id": str(log.id),
                "direction": log.direction,
                "payment_reference": log.payment_reference,
                "url": log.url,
                "http_status": log.http_status,
                "error_message": log.error_message,
                "retry_count": log.retry_count,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in items
        ]
    }
