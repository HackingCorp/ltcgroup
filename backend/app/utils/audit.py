"""
Audit logging utilities for tracking sensitive operations.
"""
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def log_audit_event(
    db: AsyncSession,
    user_id: Optional[UUID],
    action: str,
    resource_type: str,
    resource_id: str,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    """
    Log an audit event to the database.

    Args:
        db: Database session
        user_id: ID of user performing the action
        action: Action performed (e.g., "card_purchase", "card_freeze", "kyc_approve")
        resource_type: Type of resource affected (e.g., "card", "user", "transaction")
        resource_id: ID of the affected resource
        details: Additional context as JSON
        ip_address: IP address of the client
    """
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        details=details or {},
        ip_address=ip_address,
    )
    db.add(audit_log)
    await db.commit()
