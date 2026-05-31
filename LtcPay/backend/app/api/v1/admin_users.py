"""
Admin user management endpoints.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
import bcrypt as _bcrypt
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.api.v1.auth import get_current_admin

router = APIRouter(prefix="/admin/users", tags=["Admin Users"])

def _hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


# ─── Request bodies ────────────────────────────────────────────

class AdminUserCreate(BaseModel):
    email: str
    full_name: str
    role: str = "admin"
    team: Optional[str] = None
    password: str


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    team: Optional[str] = None
    mfa_enabled: Optional[bool] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None


# ─── Helpers ───────────────────────────────────────────────────

def _user_dict(u: AdminUser) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "team": getattr(u, "team", None),
        "mfa_enabled": getattr(u, "mfa_enabled", False),
        "is_active": u.is_active,
        "status": getattr(u, "status", None),
        "last_seen_at": getattr(u, "last_seen_at", None).isoformat() if getattr(u, "last_seen_at", None) else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


# ─── Endpoints ─────────────────────────────────────────────────

@router.get("/roles")
async def list_roles(
    admin: AdminUser = Depends(get_current_admin),
):
    """Return static roles matrix."""
    return {
        "roles": [
            {"role": "super_admin", "label": "Super Admin", "permissions": ["all"]},
            {"role": "admin", "label": "Admin", "permissions": ["merchants.manage", "payments.view", "withdrawals.manage", "disputes.manage"]},
            {"role": "finance", "label": "Finance", "permissions": ["payments.view", "withdrawals.manage", "finance.view"]},
            {"role": "support", "label": "Support", "permissions": ["merchants.view", "payments.view", "disputes.manage"]},
            {"role": "viewer", "label": "Viewer", "permissions": ["merchants.view", "payments.view"]},
        ]
    }


@router.get("/")
async def list_admin_users(
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List admin users (paginated)."""
    filters = []
    if role:
        filters.append(AdminUser.role == role)
    if status:
        if hasattr(AdminUser, "status"):
            filters.append(AdminUser.status == status)

    where_clause = and_(*filters) if filters else True

    count_q = await db.execute(
        select(func.count(AdminUser.id)).where(where_clause)
    )
    total = count_q.scalar() or 0

    offset = (page - 1) * page_size
    items_q = await db.execute(
        select(AdminUser)
        .where(where_clause)
        .order_by(AdminUser.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = items_q.scalars().all()

    return {
        "items": [_user_dict(u) for u in items],
        "total": total,
        "page": page,
        "per_page": page_size,
    }


@router.post("/")
async def create_admin_user(
    body: AdminUserCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new admin user."""
    # Check email not taken
    existing = await db.execute(
        select(AdminUser).where(AdminUser.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already taken")

    user = AdminUser(
        email=body.email,
        full_name=body.full_name,
        role=body.role,
        password_hash=_hash_password(body.password),
    )
    if hasattr(user, "team") and body.team is not None:
        user.team = body.team

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_dict(user)


@router.get("/{user_id}")
async def get_admin_user(
    user_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get admin user detail."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Admin user not found")
    return _user_dict(user)


@router.patch("/{user_id}")
async def update_admin_user(
    user_id: str,
    body: AdminUserUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update an admin user."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Admin user not found")

    # Cannot deactivate yourself
    data = body.model_dump(exclude_unset=True)
    if "is_active" in data and data["is_active"] is False and str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    for field, value in data.items():
        if hasattr(user, field):
            setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return _user_dict(user)


@router.delete("/{user_id}")
async def delete_admin_user(
    user_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft deactivate an admin user."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Admin user not found")

    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user.is_active = False
    if hasattr(user, "status"):
        user.status = "deactivated"

    await db.commit()
    await db.refresh(user)
    return {"detail": "Admin user deactivated", "id": str(user.id)}
