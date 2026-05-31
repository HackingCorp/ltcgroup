"""
Admin security endpoints — audit logs and KPIs.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.audit_log import AuditLog
from app.api.v1.auth import get_current_admin

router = APIRouter(prefix="/admin/security", tags=["Admin Security"])


@router.get("/stats")
async def security_stats(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Security KPIs."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)

    # Events in last 24h
    events_q = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.created_at >= since)
    )
    events_24h = events_q.scalar() or 0

    # High severity in last 24h
    high_q = await db.execute(
        select(func.count(AuditLog.id)).where(
            and_(
                AuditLog.created_at >= since,
                AuditLog.severity == "high",
            )
        )
    )
    high_severity_24h = high_q.scalar() or 0

    # Medium severity in last 24h
    medium_q = await db.execute(
        select(func.count(AuditLog.id)).where(
            and_(
                AuditLog.created_at >= since,
                AuditLog.severity == "medium",
            )
        )
    )
    medium_severity_24h = medium_q.scalar() or 0

    # Total events
    total_q = await db.execute(
        select(func.count(AuditLog.id))
    )
    total_events = total_q.scalar() or 0

    return {
        "events_24h": events_24h,
        "high_severity_24h": high_severity_24h,
        "medium_severity_24h": medium_severity_24h,
        "total_events": total_events,
    }


@router.get("/audit-logs")
async def list_audit_logs(
    severity: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List audit logs (paginated)."""
    filters = []
    if severity:
        filters.append(AuditLog.severity == severity)
    if action:
        filters.append(AuditLog.action == action)

    where_clause = and_(*filters) if filters else True

    count_q = await db.execute(
        select(func.count(AuditLog.id)).where(where_clause)
    )
    total = count_q.scalar() or 0

    offset = (page - 1) * page_size
    items_q = await db.execute(
        select(AuditLog)
        .where(where_clause)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = items_q.scalars().all()

    return {
        "items": [
            {
                "id": str(log.id),
                "severity": log.severity,
                "action": log.action,
                "actor_id": str(log.actor_id) if log.actor_id else None,
                "actor_name": log.actor_name,
                "target": log.target,
                "ip_address": log.ip_address,
                "reason": log.reason,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in items
        ],
        "total": total,
        "page": page,
        "per_page": page_size,
    }


@router.get("/audit-logs/{log_id}")
async def get_audit_log(
    log_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get single audit log detail."""
    result = await db.execute(
        select(AuditLog).where(AuditLog.id == log_id)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")

    return {
        "id": str(log.id),
        "severity": log.severity,
        "action": log.action,
        "actor_id": str(log.actor_id) if log.actor_id else None,
        "actor_name": log.actor_name,
        "target": log.target,
        "ip_address": log.ip_address,
        "reason": log.reason,
        "metadata": log.metadata_json,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }
