"""
Merchant withdrawal endpoints — balance checking and withdrawal requests.
"""
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.payment import Payment, PaymentStatus
from app.models.withdrawal import Withdrawal, WithdrawalStatus
from app.api.v1.merchant_auth import get_current_merchant_jwt
from app.schemas.withdrawal import (
    WithdrawalCreate,
    WithdrawalResponse,
    WithdrawalListResponse,
    BalanceResponse,
)

router = APIRouter(prefix="/merchant-dashboard", tags=["Merchant Withdrawals"])


async def _compute_balance(merchant_id, db: AsyncSession) -> dict:
    """Compute available balance for a merchant."""
    # Total earned from COMPLETED payments
    earned_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            and_(
                Payment.merchant_id == merchant_id,
                Payment.status == PaymentStatus.COMPLETED,
            )
        )
    )
    total_earned = Decimal(str(earned_q.scalar() or 0))

    # Total fees from completed payments
    fees_q = await db.execute(
        select(func.coalesce(func.sum(Payment.fee), 0)).where(
            and_(
                Payment.merchant_id == merchant_id,
                Payment.status == PaymentStatus.COMPLETED,
            )
        )
    )
    total_fees = Decimal(str(fees_q.scalar() or 0))

    # Total completed withdrawals
    withdrawn_q = await db.execute(
        select(func.coalesce(func.sum(Withdrawal.amount), 0)).where(
            and_(
                Withdrawal.merchant_id == merchant_id,
                Withdrawal.status == WithdrawalStatus.COMPLETED,
            )
        )
    )
    total_withdrawn = Decimal(str(withdrawn_q.scalar() or 0))

    # Total pending/approved/processing withdrawals (money reserved)
    pending_statuses = [
        WithdrawalStatus.PENDING,
        WithdrawalStatus.APPROVED,
        WithdrawalStatus.PROCESSING,
    ]
    pending_q = await db.execute(
        select(func.coalesce(func.sum(Withdrawal.amount), 0)).where(
            and_(
                Withdrawal.merchant_id == merchant_id,
                Withdrawal.status.in_(pending_statuses),
            )
        )
    )
    pending_withdrawals = Decimal(str(pending_q.scalar() or 0))

    available_balance = total_earned - total_fees - total_withdrawn - pending_withdrawals

    return {
        "total_earned": total_earned,
        "total_fees": total_fees,
        "total_withdrawn": total_withdrawn,
        "pending_withdrawals": pending_withdrawals,
        "available_balance": max(available_balance, Decimal("0.00")),
        "currency": "XAF",
    }


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get merchant's available balance."""
    return await _compute_balance(merchant.id, db)


@router.post("/withdrawals", response_model=WithdrawalResponse)
async def create_withdrawal(
    data: WithdrawalCreate,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Request a withdrawal."""
    balance_info = await _compute_balance(merchant.id, db)
    available = balance_info["available_balance"]

    if data.amount > available:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: {available} {data.currency}",
        )

    withdrawal = Withdrawal(
        merchant_id=merchant.id,
        amount=data.amount,
        currency=data.currency,
        method=data.method,
        mobile_money_number=data.mobile_money_number,
        mobile_money_operator=data.mobile_money_operator,
        bank_name=data.bank_name,
        bank_account_number=data.bank_account_number,
        bank_account_name=data.bank_account_name,
    )

    db.add(withdrawal)
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal


@router.get("/withdrawals", response_model=WithdrawalListResponse)
async def list_withdrawals(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """List merchant's withdrawals."""
    base_filter = Withdrawal.merchant_id == merchant.id
    filters = [base_filter]

    if status:
        try:
            ws = WithdrawalStatus(status)
            filters.append(Withdrawal.status == ws)
        except ValueError:
            pass

    count_q = await db.execute(
        select(func.count(Withdrawal.id)).where(and_(*filters))
    )
    total_count = count_q.scalar() or 0

    offset = (page - 1) * page_size
    items_q = await db.execute(
        select(Withdrawal)
        .where(and_(*filters))
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


@router.get("/withdrawals/{withdrawal_id}", response_model=WithdrawalResponse)
async def get_withdrawal(
    withdrawal_id: str,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get a single withdrawal detail."""
    result = await db.execute(
        select(Withdrawal).where(
            and_(Withdrawal.id == withdrawal_id, Withdrawal.merchant_id == merchant.id)
        )
    )
    withdrawal = result.scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    return withdrawal
