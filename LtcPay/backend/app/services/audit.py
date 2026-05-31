"""Audit logging service."""
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog


async def log_audit(
    db: AsyncSession,
    severity: str,
    action: str,
    actor_name: str | None = None,
    target: str | None = None,
    ip_address: str | None = None,
    reason: str | None = None,
    metadata: dict | None = None,
    actor_id=None,
):
    """Insert an audit log entry."""
    entry = AuditLog(
        severity=severity,
        action=action,
        actor_id=actor_id,
        actor_name=actor_name,
        target=target,
        ip_address=ip_address,
        reason=reason,
        metadata_json=metadata,
    )
    db.add(entry)
    await db.flush()
    return entry
