import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel, UUID4

from app.database import get_db
from app.models.user import User
from app.models.notification import Notification, NotificationType
from app.services.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# Schemas
class NotificationItem(BaseModel):
    """Schema for notification item."""
    id: UUID4
    user_id: UUID4
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Schema for paginated notification list."""
    notifications: list[NotificationItem]
    total: int
    unread_count: int
    page: int
    page_size: int


class UnreadCountResponse(BaseModel):
    """Schema for unread notification count."""
    count: int


class MarkReadResponse(BaseModel):
    """Schema for mark as read response."""
    message: str
    marked_count: int


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List user notifications (paginated, newest first).

    Args:
        page: Page number (starting from 1)
        page_size: Number of items per page
        unread_only: If True, only return unread notifications
        current_user: Current authenticated user
        db: Database session

    Returns:
        NotificationListResponse with paginated notifications
    """
    # Build query
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)

    # Get total count
    count_query = select(func.count()).select_from(Notification).where(
        Notification.user_id == current_user.id
    )
    if unread_only:
        count_query = count_query.where(Notification.is_read == False)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Get unread count
    unread_query = select(func.count()).select_from(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    unread_result = await db.execute(unread_query)
    unread_count = unread_result.scalar_one()

    # Paginate and order by newest first
    query = query.order_by(desc(Notification.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    notifications = result.scalars().all()

    return NotificationListResponse(
        notifications=[NotificationItem.model_validate(n) for n in notifications],
        total=total,
        unread_count=unread_count,
        page=page,
        page_size=page_size,
    )


@router.post("/{notification_id}/read", response_model=MarkReadResponse)
async def mark_notification_read(
    notification_id: UUID4,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a notification as read.

    Args:
        notification_id: ID of the notification to mark as read
        current_user: Current authenticated user
        db: Database session

    Returns:
        MarkReadResponse with success message
    """
    # Get notification
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    # Mark as read if not already
    if not notification.is_read:
        notification.is_read = True
        await db.commit()
        logger.info(f"Notification {notification_id} marked as read by user {current_user.id}")

    return MarkReadResponse(
        message="Notification marked as read",
        marked_count=1,
    )


@router.post("/read-all", response_model=MarkReadResponse)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark all notifications as read for the current user.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        MarkReadResponse with count of marked notifications
    """
    # Get all unread notifications
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    unread_notifications = result.scalars().all()

    # Mark all as read
    marked_count = 0
    for notification in unread_notifications:
        notification.is_read = True
        marked_count += 1

    if marked_count > 0:
        await db.commit()
        logger.info(f"Marked {marked_count} notifications as read for user {current_user.id}")

    return MarkReadResponse(
        message=f"Marked {marked_count} notifications as read",
        marked_count=marked_count,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get count of unread notifications for the current user.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        UnreadCountResponse with count
    """
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    count = result.scalar_one()

    return UnreadCountResponse(count=count)
