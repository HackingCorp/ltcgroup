"""Merchant notifications endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.notification import Notification, NotificationPreference
from app.api.v1.merchant_auth import get_current_merchant_jwt

router = APIRouter(prefix="/merchant-dashboard/notifications", tags=["Merchant Notifications"])


class UpdatePreferencesRequest(BaseModel):
    channels: dict | None = None
    alert_types: dict | None = None


def _serialize_notification(n: Notification) -> dict:
    return {
        "id": str(n.id),
        "title": n.title,
        "description": n.description,
        "tone": n.tone,
        "is_read": n.is_read,
        "category": n.category,
        "related_reference": n.related_reference,
        "created_at": n.created_at.isoformat(),
    }


@router.get("/")
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """List notifications for the current merchant, newest first."""
    filters = [Notification.merchant_id == merchant.id]

    count_q = await db.execute(
        select(func.count(Notification.id)).where(and_(*filters))
    )
    total = count_q.scalar() or 0

    offset = (page - 1) * page_size
    items_q = await db.execute(
        select(Notification)
        .where(and_(*filters))
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = items_q.scalars().all()

    return {
        "items": [_serialize_notification(n) for n in items],
        "total": total,
        "page": page,
        "per_page": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


@router.patch("/read-all")
async def mark_all_read(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    await db.execute(
        update(Notification)
        .where(
            and_(
                Notification.merchant_id == merchant.id,
                Notification.is_read == False,
            )
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"detail": "All notifications marked as read"}


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.merchant_id == merchant.id,
            )
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    await db.commit()
    return {"detail": "Notification marked as read"}


@router.get("/unread-count")
async def get_unread_count(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Return the count of unread notifications."""
    count_q = await db.execute(
        select(func.count(Notification.id)).where(
            and_(
                Notification.merchant_id == merchant.id,
                Notification.is_read == False,
            )
        )
    )
    count = count_q.scalar() or 0
    return {"count": count}


@router.get("/preferences")
async def get_preferences(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get or create notification preferences for the merchant."""
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.merchant_id == merchant.id
        )
    )
    pref = result.scalar_one_or_none()

    if not pref:
        pref = NotificationPreference(
            merchant_id=merchant.id,
            channels={"email": True, "sms": False, "push": True},
            alert_types={
                "payment_received": True,
                "payment_failed": True,
                "withdrawal_completed": True,
                "security_alert": True,
            },
        )
        db.add(pref)
        await db.commit()
        await db.refresh(pref)

    return {
        "id": str(pref.id),
        "channels": pref.channels,
        "alert_types": pref.alert_types,
        "updated_at": pref.updated_at.isoformat(),
    }


@router.put("/preferences")
async def update_preferences(
    body: UpdatePreferencesRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Update notification preferences."""
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.merchant_id == merchant.id
        )
    )
    pref = result.scalar_one_or_none()

    if not pref:
        pref = NotificationPreference(merchant_id=merchant.id)
        db.add(pref)

    if body.channels is not None:
        pref.channels = body.channels
    if body.alert_types is not None:
        pref.alert_types = body.alert_types

    await db.commit()
    await db.refresh(pref)

    return {
        "id": str(pref.id),
        "channels": pref.channels,
        "alert_types": pref.alert_types,
        "updated_at": pref.updated_at.isoformat(),
    }
