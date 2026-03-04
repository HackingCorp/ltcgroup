import asyncio
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.database import get_db
from app.models.user import User
from app.models.card import Card, CardStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.utils.logging_config import get_logger

logger = get_logger(__name__)
from app.schemas.transaction import (
    TopupRequest,
    WithdrawRequest,
    TransactionResponse,
    TransactionListResponse,
)
from app.services.auth import get_current_user
from app.services.accountpe import accountpe_client, AccountPEError
from app.config import settings
from app.utils.exceptions import (
    CardNotFoundException,
    UnauthorizedCardAccessException,
    InsufficientBalanceException,
    CardAlreadyBlockedException,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])

# Fee rate from config (default 1.5%)
CARD_OPERATION_FEE_RATE = Decimal(str(settings.card_operation_fee_rate))


WALLET_TYPES = [
    TransactionType.WALLET_TOPUP,
    TransactionType.WALLET_TO_CARD,
    TransactionType.WALLET_WITHDRAWAL,
]


def _accountpe_to_transaction_response(
    txn: dict,
    card_local_id: uuid.UUID,
    card_masked: str,
) -> TransactionResponse | None:
    """Convert an AccountPE card history event to a TransactionResponse."""
    txn_type = txn.get("transactionType", "")
    txn_status = txn.get("transactionStatus", "")
    amount = txn.get("transactionAmount", 0)

    # Skip card lifecycle events — we already track purchases locally
    if txn_type in ("CardIssuance", "CardTermination"):
        return None

    # Map type
    if txn_type == "Authorization":
        mapped_type = TransactionType.PURCHASE
    elif txn_type == "Refund":
        mapped_type = TransactionType.REFUND
    else:
        mapped_type = TransactionType.PURCHASE

    # Map status
    if txn_status in ("Approved", "Settled"):
        mapped_status = TransactionStatus.COMPLETED
    elif txn_status == "Declined":
        mapped_status = TransactionStatus.FAILED
    elif txn_status == "Pending":
        mapped_status = TransactionStatus.PENDING
    else:
        mapped_status = TransactionStatus.COMPLETED

    # Build description
    merchant = txn.get("merchant", {}) or {}
    merchant_name = merchant.get("merchantName", "")
    description = txn.get("description", "")
    if merchant_name and "Swychr" not in merchant_name:
        label = merchant_name
    elif description:
        label = description
    else:
        label = f"Transaction carte {card_masked}"

    # Parse date — ensure UTC timezone
    created_str = txn.get("created_at", "")
    try:
        created_at = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
    except (ValueError, AttributeError):
        created_at = datetime.now(timezone.utc)

    # Deterministic UUID from AccountPE transaction id
    provider_id = str(txn.get("id", ""))
    fake_uuid = uuid.uuid5(uuid.NAMESPACE_URL, f"accountpe:{provider_id}")

    return TransactionResponse(
        id=fake_uuid,
        card_id=card_local_id,
        amount=Decimal(str(abs(amount))).quantize(Decimal("0.01")) if amount else Decimal("0.01"),
        fee=Decimal("0"),
        currency=txn.get("currencyCode", "USD"),
        type=mapped_type,
        status=mapped_status,
        description=label,
        created_at=created_at,
    )


@router.get("", response_model=TransactionListResponse)
async def get_user_transactions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    category: str | None = Query(None, description="Filter by category: 'wallet' for wallet transactions only"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all transactions for the current user (wallet + card + AccountPE card activity)."""
    base_filter = [Transaction.user_id == current_user.id]
    if category == "wallet":
        base_filter.append(Transaction.type.in_(WALLET_TYPES))

    # Fetch local DB transactions
    transactions_result = await db.execute(
        select(Transaction)
        .where(*base_filter)
        .order_by(Transaction.created_at.desc())
    )
    db_transactions = transactions_result.scalars().all()
    all_responses = [TransactionResponse.model_validate(tx) for tx in db_transactions]

    # If not wallet-only, also fetch AccountPE card activity
    if category != "wallet":
        cards_result = await db.execute(
            select(Card).where(Card.user_id == current_user.id)
        )
        cards = cards_result.scalars().all()

        async def _fetch_card_txns(card: Card) -> list[TransactionResponse]:
            """Fetch AccountPE transactions for a single card."""
            if not card.provider_card_id:
                return []
            try:
                resp = await accountpe_client.get_card_transactions(str(card.provider_card_id))
                raw_txns = resp.get("transactions", [])
                results = []
                for t in raw_txns:
                    tx_resp = _accountpe_to_transaction_response(
                        t,
                        card_local_id=card.id,
                        card_masked=card.card_number_masked,
                    )
                    if tx_resp:
                        results.append(tx_resp)
                return results
            except Exception as e:
                logger.warning(f"Failed to fetch AccountPE history for card {card.id}: {e}")
                return []

        # Fetch all card transactions in parallel
        card_results = await asyncio.gather(
            *[_fetch_card_txns(card) for card in cards],
            return_exceptions=True,
        )
        for result in card_results:
            if isinstance(result, list):
                all_responses.extend(result)
            elif isinstance(result, Exception):
                logger.warning(f"AccountPE card history fetch error: {result}")

    # Sort all by date descending (normalize to UTC for comparison)
    def _sort_key(tx: TransactionResponse) -> datetime:
        dt = tx.created_at
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    all_responses.sort(key=_sort_key, reverse=True)
    total_count = len(all_responses)

    # Paginate
    paginated = all_responses[offset : offset + limit]

    return TransactionListResponse(
        transactions=paginated,
        total_count=total_count,
        page=offset // limit + 1,
        page_size=limit,
    )


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
    # Lock the user row first to prevent concurrent wallet modifications
    user_result = await db.execute(
        select(User).where(User.id == current_user.id).with_for_update()
    )
    locked_user = user_result.scalar_one()

    # Lock the card row to prevent concurrent balance modifications
    result = await db.execute(
        select(Card).where(Card.id == topup_data.card_id).with_for_update()
    )
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(str(topup_data.card_id))

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    if card.status == CardStatus.BLOCKED:
        raise CardAlreadyBlockedException()

    # Calculate 1.5% fee
    fee = (topup_data.amount * CARD_OPERATION_FEE_RATE).quantize(Decimal("0.01"))
    total_debit = topup_data.amount + fee

    # Check wallet balance (amount + fee) using locked row
    if locked_user.wallet_balance < total_debit:
        logger.info(f"Insufficient wallet balance for topup: user={current_user.id}, required={total_debit}, available={locked_user.wallet_balance}")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Solde wallet insuffisant. Il vous faut ${total_debit:.2f} pour cette operation.",
        )

    # Deduct from wallet atomically
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(wallet_balance=User.wallet_balance - total_debit)
    )

    # Create pending transaction
    transaction = Transaction(
        card_id=card.id,
        user_id=current_user.id,
        amount=topup_data.amount,
        fee=fee,
        currency=topup_data.currency,
        type=TransactionType.TOPUP,
        status=TransactionStatus.PENDING,
        description=f"Top-up {topup_data.amount} {topup_data.currency} (frais: {fee})",
        provider_transaction_id=None,
    )
    db.add(transaction)
    await db.flush()

    # Call AccountPE to topup
    try:
        accountpe_response = await accountpe_client.recharge_card(
            card_id=card.provider_card_id,
            amount=float(topup_data.amount),
        )
        transaction.provider_transaction_id = accountpe_response.get("transaction_id", "")
        transaction.status = TransactionStatus.COMPLETED

        # Update card balance atomically
        await db.execute(
            update(Card)
            .where(Card.id == card.id)
            .values(balance=Card.balance + topup_data.amount)
        )

    except AccountPEError as e:
        # Business error — refund wallet atomically
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(wallet_balance=User.wallet_balance + total_debit)
        )
        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {"error": str(e), "provider_status": e.status_code}
        await db.commit()
        logger.warning(f"Top-up business error for card {card.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Transient / network error — refund wallet atomically
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(wallet_balance=User.wallet_balance + total_debit)
        )
        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {"error": str(e)}
        await db.commit()
        logger.error(f"Top-up failed for card {card.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Top-up failed. Please try again later.",
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
    # Lock the card row to prevent concurrent balance modifications
    result = await db.execute(
        select(Card).where(Card.id == withdraw_data.card_id).with_for_update()
    )
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(str(withdraw_data.card_id))

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    if card.status == CardStatus.BLOCKED:
        raise CardAlreadyBlockedException()

    # Calculate 1.5% fee
    fee = (withdraw_data.amount * CARD_OPERATION_FEE_RATE).quantize(Decimal("0.01"))
    total_debit = withdraw_data.amount + fee

    # Check card balance covers amount + fee
    if card.balance < total_debit:
        logger.info(f"Insufficient card balance for withdraw: user={current_user.id}, card={card.id}, required={total_debit}, available={card.balance}")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Solde carte insuffisant. Il vous faut ${total_debit:.2f} pour cette operation.",
        )

    # Create pending transaction
    transaction = Transaction(
        card_id=card.id,
        user_id=current_user.id,
        amount=withdraw_data.amount,
        fee=fee,
        currency=withdraw_data.currency,
        type=TransactionType.WITHDRAW,
        status=TransactionStatus.PENDING,
        description=f"Retrait {withdraw_data.amount} {withdraw_data.currency} (frais: {fee})",
        provider_transaction_id=None,
    )
    db.add(transaction)
    await db.flush()

    # Call AccountPE to withdraw (full amount + fee deducted from card)
    try:
        accountpe_response = await accountpe_client.withdraw_fund(
            card_id=card.provider_card_id,
            amount=float(withdraw_data.amount),
        )
        transaction.provider_transaction_id = accountpe_response.get("transaction_id", "")
        transaction.status = TransactionStatus.COMPLETED

        # Update card balance atomically (deduct amount + fee)
        await db.execute(
            update(Card)
            .where(Card.id == card.id)
            .values(balance=Card.balance - total_debit)
        )

        # Credit wallet with the withdrawn amount (without fee) atomically
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(wallet_balance=User.wallet_balance + withdraw_data.amount)
        )

    except AccountPEError as e:
        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {"error": str(e), "provider_status": e.status_code}
        await db.commit()
        logger.warning(f"Withdrawal business error for card {card.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {"error": str(e)}
        await db.commit()
        logger.error(f"Withdrawal failed for card {card.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Withdrawal failed. Please try again later.",
        )

    await db.commit()
    await db.refresh(transaction)

    return TransactionResponse.model_validate(transaction)
