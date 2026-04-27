"""
Admin withdrawal management endpoints.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.withdrawal import Withdrawal, WithdrawalStatus
from app.api.v1.auth import get_current_admin
from app.schemas.withdrawal import (
    WithdrawalResponse,
    WithdrawalListResponse,
    AdminWithdrawalAction,
)

router = APIRouter(prefix="/withdrawals", tags=["Admin Withdrawals"])


@router.get("", response_model=WithdrawalListResponse)
async def list_all_withdrawals(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all withdrawal requests (admin)."""
    filters = []
    if status:
        try:
            ws = WithdrawalStatus(status)
            filters.append(Withdrawal.status == ws)
        except ValueError:
            pass

    where_clause = and_(*filters) if filters else True

    count_q = await db.execute(
        select(func.count(Withdrawal.id)).where(where_clause)
    )
    total_count = count_q.scalar() or 0

    offset = (page - 1) * page_size
    items_q = await db.execute(
        select(Withdrawal)
        .where(where_clause)
        .order_by(Withdrawal.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = items_q.scalars().all()

    return WithdrawalListResponse(
        withdrawals=items,
        total_count=total_count,
        page=page,
        page_size=page_size,
    )


@router.get("/{withdrawal_id}", response_model=WithdrawalResponse)
async def get_withdrawal_detail(
    withdrawal_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get withdrawal detail (admin)."""
    result = await db.execute(
        select(Withdrawal).where(Withdrawal.id == withdrawal_id)
    )
    withdrawal = result.scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    return withdrawal


@router.patch("/{withdrawal_id}/approve", response_model=WithdrawalResponse)
async def approve_withdrawal(
    withdrawal_id: str,
    data: AdminWithdrawalAction = None,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve a pending withdrawal."""
    result = await db.execute(
        select(Withdrawal).where(Withdrawal.id == withdrawal_id)
    )
    withdrawal = result.scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")

    if withdrawal.status != WithdrawalStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve withdrawal with status {withdrawal.status.value}",
        )

    withdrawal.status = WithdrawalStatus.APPROVED
    if data and data.admin_note:
        withdrawal.admin_note = data.admin_note
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal


@router.patch("/{withdrawal_id}/reject", response_model=WithdrawalResponse)
async def reject_withdrawal(
    withdrawal_id: str,
    data: AdminWithdrawalAction = None,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reject a pending withdrawal."""
    result = await db.execute(
        select(Withdrawal).where(Withdrawal.id == withdrawal_id)
    )
    withdrawal = result.scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")

    if withdrawal.status != WithdrawalStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject withdrawal with status {withdrawal.status.value}",
        )

    withdrawal.status = WithdrawalStatus.REJECTED
    if data and data.admin_note:
        withdrawal.admin_note = data.admin_note
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal


@router.patch("/{withdrawal_id}/complete", response_model=WithdrawalResponse)
async def complete_withdrawal(
    withdrawal_id: str,
    data: AdminWithdrawalAction = None,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Mark an approved withdrawal as completed."""
    result = await db.execute(
        select(Withdrawal).where(Withdrawal.id == withdrawal_id)
    )
    withdrawal = result.scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")

    if withdrawal.status != WithdrawalStatus.APPROVED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot complete withdrawal with status {withdrawal.status.value}. Must be APPROVED first.",
        )

    withdrawal.status = WithdrawalStatus.COMPLETED
    withdrawal.processed_at = datetime.now(timezone.utc)
    if data and data.admin_note:
        withdrawal.admin_note = data.admin_note
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal
