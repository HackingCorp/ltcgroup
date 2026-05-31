"""
Admin dispute management endpoints.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.dispute import Dispute, DisputeStatus
from app.models.payment import Payment
from app.models.merchant import Merchant
from app.api.v1.auth import get_current_admin

router = APIRouter(prefix="/admin/disputes", tags=["Admin Disputes"])


# ─── Request bodies ────────────────────────────────────────────

class DisputeCreate(BaseModel):
    merchant_id: str
    payment_id: str
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    amount: float
    currency: str = "XAF"
    reason: Optional[str] = None
    priority: bool = False


class DisputeUpdate(BaseModel):
    status: Optional[str] = None
    admin_note: Optional[str] = None
    assigned_to: Optional[str] = None
    evidence_data: Optional[dict] = None
    priority: Optional[bool] = None


# ─── Endpoints ─────────────────────────────────────────────────

@router.get("/stats")
async def dispute_stats(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Dispute KPIs."""
    active_statuses = [
        DisputeStatus.evidence_required,
        DisputeStatus.evidence_received,
        DisputeStatus.under_review,
        DisputeStatus.escalated,
    ]

    # Active disputes count and exposure
    active_q = await db.execute(
        select(
            func.count(Dispute.id).label("active_count"),
            func.coalesce(func.sum(Dispute.amount), 0).label("total_exposure"),
        ).where(Dispute.status.in_(active_statuses))
    )
    active_row = active_q.one()

    # Won/lost counts for win rate
    won_q = await db.execute(
        select(func.count(Dispute.id)).where(Dispute.status == DisputeStatus.won)
    )
    won_count = won_q.scalar() or 0

    lost_q = await db.execute(
        select(func.count(Dispute.id)).where(Dispute.status == DisputeStatus.lost)
    )
    lost_count = lost_q.scalar() or 0

    total_resolved = won_count + lost_count
    win_rate = (won_count / total_resolved * 100) if total_resolved > 0 else 0

    # Average resolution days
    avg_q = await db.execute(
        select(
            func.avg(
                func.extract("epoch", Dispute.resolved_at) -
                func.extract("epoch", Dispute.created_at)
            ).label("avg_seconds")
        ).where(Dispute.resolved_at.isnot(None))
    )
    avg_seconds = avg_q.scalar()
    avg_resolution_days = round(avg_seconds / 86400, 1) if avg_seconds else 0

    return {
        "active_count": active_row.active_count,
        "total_exposure": float(active_row.total_exposure),
        "win_rate": round(win_rate, 1),
        "avg_resolution_days": avg_resolution_days,
    }


@router.get("/")
async def list_disputes(
    status: Optional[str] = Query(None),
    priority: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List disputes (paginated)."""
    filters = []
    if status:
        try:
            ds = DisputeStatus(status)
            filters.append(Dispute.status == ds)
        except ValueError:
            pass
    if priority is not None:
        filters.append(Dispute.priority == priority)

    where_clause = and_(*filters) if filters else True

    count_q = await db.execute(
        select(func.count(Dispute.id)).where(where_clause)
    )
    total = count_q.scalar() or 0

    offset = (page - 1) * page_size
    items_q = await db.execute(
        select(Dispute, Merchant.name.label("merchant_name"))
        .outerjoin(Merchant, Dispute.merchant_id == Merchant.id)
        .where(where_clause)
        .order_by(Dispute.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    rows = items_q.all()

    return {
        "items": [
            {
                "id": str(d.id),
                "reference": d.reference,
                "merchant_id": str(d.merchant_id),
                "merchant_name": mn,
                "payment_id": str(d.payment_id),
                "customer_name": d.customer_name,
                "customer_contact": d.customer_contact,
                "amount": float(d.amount),
                "currency": d.currency,
                "reason": d.reason,
                "status": d.status.value if hasattr(d.status, "value") else str(d.status),
                "priority": d.priority,
                "admin_note": d.admin_note,
                "assigned_to": str(d.assigned_to) if d.assigned_to else None,
                "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d, mn in rows
        ],
        "total": total,
        "page": page,
        "per_page": page_size,
    }


@router.get("/{dispute_id}")
async def get_dispute(
    dispute_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get dispute detail."""
    q = await db.execute(
        select(Dispute, Merchant.name.label("merchant_name"))
        .outerjoin(Merchant, Dispute.merchant_id == Merchant.id)
        .where(Dispute.id == dispute_id)
    )
    row = q.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Dispute not found")

    d, mn = row
    return {
        "id": str(d.id),
        "reference": d.reference,
        "merchant_id": str(d.merchant_id),
        "merchant_name": mn,
        "payment_id": str(d.payment_id),
        "customer_name": d.customer_name,
        "customer_contact": d.customer_contact,
        "amount": float(d.amount),
        "currency": d.currency,
        "reason": d.reason,
        "status": d.status.value if hasattr(d.status, "value") else str(d.status),
        "priority": d.priority,
        "evidence_data": d.evidence_data,
        "deadline_at": d.deadline_at.isoformat() if d.deadline_at else None,
        "admin_note": d.admin_note,
        "assigned_to": str(d.assigned_to) if d.assigned_to else None,
        "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "updated_at": d.updated_at.isoformat() if d.updated_at else None,
    }


@router.post("/")
async def create_dispute(
    body: DisputeCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new dispute."""
    reference = f"DSP-{uuid.uuid4().hex[:8].upper()}"

    dispute = Dispute(
        reference=reference,
        merchant_id=uuid.UUID(body.merchant_id),
        payment_id=uuid.UUID(body.payment_id),
        customer_name=body.customer_name,
        customer_contact=body.customer_contact,
        amount=body.amount,
        currency=body.currency,
        reason=body.reason,
        priority=body.priority,
        status=DisputeStatus.evidence_required,
    )
    db.add(dispute)
    await db.commit()
    await db.refresh(dispute)

    return {
        "id": str(dispute.id),
        "reference": dispute.reference,
        "merchant_id": str(dispute.merchant_id),
        "payment_id": str(dispute.payment_id),
        "amount": float(dispute.amount),
        "currency": dispute.currency,
        "status": dispute.status.value if hasattr(dispute.status, "value") else str(dispute.status),
        "priority": dispute.priority,
        "created_at": dispute.created_at.isoformat() if dispute.created_at else None,
    }


@router.patch("/{dispute_id}")
async def update_dispute(
    dispute_id: str,
    body: DisputeUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a dispute."""
    result = await db.execute(
        select(Dispute).where(Dispute.id == dispute_id)
    )
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    data = body.model_dump(exclude_unset=True)

    if "status" in data and data["status"] is not None:
        try:
            new_status = DisputeStatus(data["status"])
            dispute.status = new_status
            if new_status in (DisputeStatus.won, DisputeStatus.lost):
                dispute.resolved_at = datetime.now(timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {data['status']}")

    if "admin_note" in data:
        dispute.admin_note = data["admin_note"]
    if "assigned_to" in data:
        dispute.assigned_to = uuid.UUID(data["assigned_to"]) if data["assigned_to"] else None
    if "evidence_data" in data:
        dispute.evidence_data = data["evidence_data"]
    if "priority" in data:
        dispute.priority = data["priority"]

    await db.commit()
    await db.refresh(dispute)

    return {
        "id": str(dispute.id),
        "reference": dispute.reference,
        "status": dispute.status.value if hasattr(dispute.status, "value") else str(dispute.status),
        "admin_note": dispute.admin_note,
        "assigned_to": str(dispute.assigned_to) if dispute.assigned_to else None,
        "priority": dispute.priority,
        "resolved_at": dispute.resolved_at.isoformat() if dispute.resolved_at else None,
        "updated_at": dispute.updated_at.isoformat() if dispute.updated_at else None,
    }
