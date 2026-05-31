"""Merchant team management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.team_member import MerchantTeamMember
from app.api.v1.merchant_auth import get_current_merchant_jwt

router = APIRouter(prefix="/merchant-dashboard/team", tags=["Merchant Team"])

TEAM_ROLES = [
    {
        "role": "Owner",
        "description": "Full access to all features and settings.",
        "permissions": ["all"],
    },
    {
        "role": "Admin",
        "description": "Manage team, settings, and view all data.",
        "permissions": ["team.manage", "settings.manage", "payments.view", "reports.view", "billing.view"],
    },
    {
        "role": "Finance",
        "description": "View payments, billing, reports, and request withdrawals.",
        "permissions": ["payments.view", "billing.view", "reports.view", "withdrawals.request"],
    },
    {
        "role": "Developer",
        "description": "Manage API keys and integrations.",
        "permissions": ["api_keys.manage", "webhooks.manage", "payments.view"],
    },
    {
        "role": "Support",
        "description": "View payments and process refunds.",
        "permissions": ["payments.view", "refunds.manage", "customers.view"],
    },
    {
        "role": "Viewer",
        "description": "Read-only access to dashboard data.",
        "permissions": ["payments.view", "reports.view"],
    },
]


class InviteMemberRequest(BaseModel):
    name: str
    email: str
    role: str = "Viewer"


class UpdateMemberRequest(BaseModel):
    role: str | None = None
    permissions: dict | None = None


def _serialize_member(m: MerchantTeamMember) -> dict:
    return {
        "id": str(m.id),
        "name": m.name,
        "email": m.email,
        "role": m.role,
        "permissions": m.permissions,
        "status": m.status,
        "last_seen_at": m.last_seen_at.isoformat() if m.last_seen_at else None,
        "invited_at": m.invited_at.isoformat(),
        "created_at": m.created_at.isoformat(),
    }


@router.get("/roles")
async def list_roles():
    """Return the available team roles with their descriptions and permissions."""
    return TEAM_ROLES


@router.get("/members")
async def list_members(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """List team members for the current merchant."""
    result = await db.execute(
        select(MerchantTeamMember)
        .where(MerchantTeamMember.merchant_id == merchant.id)
        .order_by(MerchantTeamMember.created_at.asc())
    )
    members = result.scalars().all()
    return {"members": [_serialize_member(m) for m in members]}


@router.post("/members")
async def invite_member(
    body: InviteMemberRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Invite a new team member."""
    # Check if email already exists for this merchant
    existing_q = await db.execute(
        select(MerchantTeamMember).where(
            and_(
                MerchantTeamMember.merchant_id == merchant.id,
                MerchantTeamMember.email == body.email,
            )
        )
    )
    existing = existing_q.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="A team member with this email already exists")

    member = MerchantTeamMember(
        merchant_id=merchant.id,
        name=body.name,
        email=body.email,
        role=body.role,
        status="pending",
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return _serialize_member(member)


@router.patch("/members/{member_id}")
async def update_member(
    member_id: str,
    body: UpdateMemberRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Update a team member's role or permissions."""
    result = await db.execute(
        select(MerchantTeamMember).where(
            and_(
                MerchantTeamMember.id == member_id,
                MerchantTeamMember.merchant_id == merchant.id,
            )
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    if body.role is not None:
        member.role = body.role
    if body.permissions is not None:
        member.permissions = body.permissions

    await db.commit()
    await db.refresh(member)
    return _serialize_member(member)


@router.delete("/members/{member_id}")
async def deactivate_member(
    member_id: str,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a team member."""
    result = await db.execute(
        select(MerchantTeamMember).where(
            and_(
                MerchantTeamMember.id == member_id,
                MerchantTeamMember.merchant_id == merchant.id,
            )
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    member.status = "deactivated"
    await db.commit()
    return {"detail": "Team member deactivated"}
