from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.card import Card, CardStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.schemas.transaction import (
    TopupRequest,
    WithdrawRequest,
    TransactionResponse,
    TransactionListResponse,
)
from app.services.auth import get_current_user
from app.services.accountpe import accountpe_client
from app.utils.exceptions import (
    CardNotFoundException,
    UnauthorizedCardAccessException,
    InsufficientBalanceException,
    CardAlreadyBlockedException,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("/cards/{card_id}/transactions", response_model=TransactionListResponse)
async def get_card_transactions(
    card_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get transaction history for a specific card.
    """
    result = await db.execute(select(Card).where(Card.id == card_id))
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(card_id)

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(Transaction).where(Transaction.card_id == card_id)
    )
    total_count = count_result.scalar()

    # Get transactions
    transactions_result = await db.execute(
        select(Transaction)
        .where(Transaction.card_id == card_id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    transactions = transactions_result.scalars().all()

    return TransactionListResponse(
        transactions=[TransactionResponse.model_validate(tx) for tx in transactions],
        total_count=total_count,
        page=offset // limit + 1,
        page_size=limit,
    )


@router.post("/topup", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def topup_card(
    topup_data: TopupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add funds to a card.
    """
    result = await db.execute(select(Card).where(Card.id == topup_data.card_id))
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(str(topup_data.card_id))

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    if card.status == CardStatus.BLOCKED:
        raise CardAlreadyBlockedException()

    # Create pending transaction
    transaction = Transaction(
        card_id=card.id,
        user_id=current_user.id,
        amount=topup_data.amount,
        currency=topup_data.currency,
        type=TransactionType.TOPUP,
        status=TransactionStatus.PENDING,
        description=f"Top-up {topup_data.amount} {topup_data.currency}",
        provider_transaction_id="",
    )
    db.add(transaction)
    await db.flush()

    # Call AccountPE to topup
    try:
        accountpe_response = await accountpe_client.topup_card(
            card_id=card.provider_card_id,
            amount=float(topup_data.amount),
            currency=topup_data.currency,
        )
        transaction.provider_transaction_id = accountpe_response.get("transaction_id", "")
        transaction.status = TransactionStatus.COMPLETED

        # Update card balance
        card.balance += topup_data.amount

    except Exception as e:
        transaction.status = TransactionStatus.FAILED
        transaction.metadata = {"error": str(e)}
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Top-up failed: {str(e)}",
        )

    await db.commit()
    await db.refresh(transaction)

    return TransactionResponse.model_validate(transaction)


@router.post("/withdraw", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def withdraw_from_card(
    withdraw_data: WithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Withdraw funds from a card.
    """
    result = await db.execute(select(Card).where(Card.id == withdraw_data.card_id))
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(str(withdraw_data.card_id))

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    if card.status == CardStatus.BLOCKED:
        raise CardAlreadyBlockedException()

    # Check balance
    if card.balance < withdraw_data.amount:
        raise InsufficientBalanceException()

    # Create pending transaction
    transaction = Transaction(
        card_id=card.id,
        user_id=current_user.id,
        amount=withdraw_data.amount,
        currency=withdraw_data.currency,
        type=TransactionType.WITHDRAW,
        status=TransactionStatus.PENDING,
        description=f"Withdrawal {withdraw_data.amount} {withdraw_data.currency}",
        provider_transaction_id="",
    )
    db.add(transaction)
    await db.flush()

    # Call AccountPE to withdraw
    try:
        accountpe_response = await accountpe_client.withdraw_from_card(
            card_id=card.provider_card_id,
            amount=float(withdraw_data.amount),
            currency=withdraw_data.currency,
        )
        transaction.provider_transaction_id = accountpe_response.get("transaction_id", "")
        transaction.status = TransactionStatus.COMPLETED

        # Update card balance
        card.balance -= withdraw_data.amount

    except Exception as e:
        transaction.status = TransactionStatus.FAILED
        transaction.metadata = {"error": str(e)}
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Withdrawal failed: {str(e)}",
        )

    await db.commit()
    await db.refresh(transaction)

    return TransactionResponse.model_validate(transaction)
