"""
LtcPay - Transaction Endpoints
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.cache import cached
from app.models.transaction import Transaction, TransactionStatus
from app.schemas.payment import TransactionStatusResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=list[TransactionStatusResponse])
async def list_transactions(
    status: Optional[TransactionStatus] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List transactions with optional status filter."""
    query = select(Transaction).order_by(Transaction.created_at.desc())

    if status:
        query = query.where(Transaction.status == status)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    transactions = result.scalars().all()

    return [
        TransactionStatusResponse(
            reference=t.reference,
            external_ref=t.external_ref,
            amount=t.amount,
            currency=t.currency,
            fee=t.fee,
            net_amount=t.net_amount,
            status=t.status,
            status_message=t.status_message,
            payment_method=t.payment_method,
            payer_phone=t.payer_phone,
            payer_name=t.payer_name,
            created_at=t.created_at,
            completed_at=t.completed_at,
        )
        for t in transactions
    ]


@router.get("/stats")
@cached(ttl=60, key_prefix="transaction_stats")
async def transaction_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    Get transaction statistics.

    Results are cached for 60 seconds to improve performance.
    """
    # Total count by status
    stats = {}
    for status in TransactionStatus:
        result = await db.execute(
            select(func.count(Transaction.id)).where(
                Transaction.status == status
            )
        )
        stats[status.value] = result.scalar() or 0

    # Total amounts
    result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.status == TransactionStatus.COMPLETED
        )
    )
    total_completed_amount = result.scalar() or 0

    result = await db.execute(
        select(func.count(Transaction.id))
    )
    total_transactions = result.scalar() or 0

    return {
        "total_transactions": total_transactions,
        "total_completed_amount": total_completed_amount,
        "by_status": stats,
    }
