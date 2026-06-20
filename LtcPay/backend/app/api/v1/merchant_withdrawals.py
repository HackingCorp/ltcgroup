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
from app.models.country import SupportedCountry
from app.schemas.withdrawal import (
    WithdrawalCreate,
    WithdrawalResponse,
    WithdrawalListResponse,
    BalanceResponse,
    CountryBalanceResponse,
    BalanceByCountryResponse,
)

router = APIRouter(prefix="/merchant-dashboard", tags=["Merchant Withdrawals"])


async def _compute_balance(
    merchant_id, db: AsyncSession, country_code: Optional[str] = None
) -> dict:
    """Compute available balance for a merchant, optionally filtered by country."""
    # Payment filters
    payment_filters = [
        Payment.merchant_id == merchant_id,
        Payment.status == PaymentStatus.COMPLETED,
    ]
    if country_code:
        payment_filters.append(Payment.country == country_code)

    # Withdrawal filters
    def _withdrawal_filters(statuses):
        filters = [Withdrawal.merchant_id == merchant_id, Withdrawal.status.in_(statuses)]
        if country_code:
            filters.append(Withdrawal.country_code == country_code)
        return filters

    # Total earned from COMPLETED payments
    earned_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(and_(*payment_filters))
    )
    total_earned = Decimal(str(earned_q.scalar() or 0))

    # Total fees from completed payments
    fees_q = await db.execute(
        select(func.coalesce(func.sum(Payment.fee), 0)).where(and_(*payment_filters))
    )
    total_fees = Decimal(str(fees_q.scalar() or 0))

    # Total completed withdrawals
    withdrawn_q = await db.execute(
        select(func.coalesce(func.sum(Withdrawal.amount), 0)).where(
            and_(*_withdrawal_filters([WithdrawalStatus.COMPLETED]))
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
            and_(*_withdrawal_filters(pending_statuses))
        )
    )
    pending_withdrawals = Decimal(str(pending_q.scalar() or 0))

    available_balance = total_earned - total_fees - total_withdrawn - pending_withdrawals

    # Resolve currency from country if specified
    currency = "XAF"
    if country_code:
        country_q = await db.execute(
            select(SupportedCountry.currency).where(SupportedCountry.code == country_code)
        )
        currency = country_q.scalar() or "XAF"

    return {
        "total_earned": total_earned,
        "total_fees": total_fees,
        "total_withdrawn": total_withdrawn,
        "pending_withdrawals": pending_withdrawals,
        "available_balance": max(available_balance, Decimal("0.00")),
        "currency": currency,
    }


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get merchant's available balance."""
    return await _compute_balance(merchant.id, db)


@router.get("/balance/by-country", response_model=BalanceByCountryResponse)
async def get_balance_by_country(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get merchant's balance broken down by country."""
    # Find distinct countries from this merchant's payments
    countries_q = await db.execute(
        select(Payment.country).where(
            and_(
                Payment.merchant_id == merchant.id,
                Payment.country.isnot(None),
            )
        ).distinct()
    )
    country_codes = [row[0] for row in countries_q.all() if row[0]]

    # Load country info
    country_info = {}
    if country_codes:
        info_q = await db.execute(
            select(SupportedCountry).where(SupportedCountry.code.in_(country_codes))
        )
        for c in info_q.scalars().all():
            country_info[c.code] = c

    # Compute per-country balances
    by_country = []
    for code in sorted(country_codes):
        bal = await _compute_balance(merchant.id, db, country_code=code)
        info = country_info.get(code)
        by_country.append(CountryBalanceResponse(
            country_code=code,
            country_name=info.name if info else code,
            currency=info.currency if info else "XAF",
            total_earned=bal["total_earned"],
            total_fees=bal["total_fees"],
            total_withdrawn=bal["total_withdrawn"],
            pending_withdrawals=bal["pending_withdrawals"],
            available_balance=bal["available_balance"],
        ))

    # Total balance (global)
    total = await _compute_balance(merchant.id, db)

    return BalanceByCountryResponse(total=total, by_country=by_country)


@router.post("/withdrawals", response_model=WithdrawalResponse)
async def create_withdrawal(
    data: WithdrawalCreate,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Request a withdrawal."""
    balance_info = await _compute_balance(merchant.id, db, country_code=data.country_code)
    available = balance_info["available_balance"]

    if data.amount > available:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: {available} {balance_info['currency']}",
        )

    withdrawal = Withdrawal(
        merchant_id=merchant.id,
        amount=data.amount,
        currency=balance_info["currency"],
        method=data.method,
        country_code=data.country_code,
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
