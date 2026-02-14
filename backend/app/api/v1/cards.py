from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, KYCStatus
from app.models.card import Card, CardStatus
from app.schemas.card import CardPurchase, CardResponse, CardListResponse, CardRevealResponse
from app.services.auth import get_current_user
from app.services.accountpe import accountpe_client
from app.utils.exceptions import (
    CardNotFoundException,
    UnauthorizedCardAccessException,
    CardAlreadyBlockedException,
)
from app.utils.encryption import encrypt_field, decrypt_field
from app.utils.audit import log_audit_event
from app.middleware.rate_limit import limiter
from app.utils.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/cards", tags=["Cards"])


@router.post("/purchase", response_model=CardResponse, status_code=status.HTTP_201_CREATED)
async def purchase_card(
    request: Request,
    card_data: CardPurchase,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Purchase a new virtual card (Visa or Mastercard).
    """
    # Check KYC status
    if current_user.kyc_status != KYCStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KYC approval required to purchase cards",
        )

    # Call AccountPE to create card
    try:
        accountpe_response = await accountpe_client.purchase_card(
            user_id=str(current_user.id),
            card_type=card_data.card_type.value,
            initial_balance=float(card_data.initial_balance),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Card provider error: {str(e)}",
        )

    # Extract card details from AccountPE response
    provider_card_id = accountpe_response.get("card_id", "")
    card_number_full = accountpe_response.get("card_number", "")
    card_number_masked = f"****{card_number_full[-4:]}" if card_number_full else "****0000"
    expiry_date = accountpe_response.get("expiry_date", "12/29")
    cvv = accountpe_response.get("cvv", "000")

    # Store card in database with encrypted sensitive fields
    new_card = Card(
        user_id=current_user.id,
        card_type=card_data.card_type,
        card_number_masked=card_number_masked,
        card_number_full_encrypted=encrypt_field(card_number_full),
        status=CardStatus.ACTIVE,
        balance=card_data.initial_balance,
        currency="USD",
        provider="AccountPE",
        provider_card_id=provider_card_id,
        expiry_date=expiry_date,
        cvv_encrypted=encrypt_field(cvv),
    )
    db.add(new_card)
    await db.commit()
    await db.refresh(new_card)

    # Log audit event
    await log_audit_event(
        db=db,
        user_id=current_user.id,
        action="card_purchase",
        resource_type="card",
        resource_id=str(new_card.id),
        details={
            "card_type": card_data.card_type.value,
            "initial_balance": str(card_data.initial_balance),
        },
        ip_address=request.client.host if request.client else None,
    )

    return CardResponse.model_validate(new_card)


@router.get("/", response_model=CardListResponse)
async def list_user_cards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all cards owned by the current user.
    """
    result = await db.execute(select(Card).where(Card.user_id == current_user.id))
    cards = result.scalars().all()

    return CardListResponse(
        cards=[CardResponse.model_validate(card) for card in cards],
        total=len(cards),
    )


@router.get("/{card_id}", response_model=CardResponse)
async def get_card_details(
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get details of a specific card.
    """
    result = await db.execute(select(Card).where(Card.id == card_id))
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(card_id)

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    return CardResponse.model_validate(card)


@router.post("/{card_id}/freeze", response_model=CardResponse)
async def freeze_card(
    request: Request,
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Freeze a card temporarily.
    """
    result = await db.execute(select(Card).where(Card.id == card_id))
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(card_id)

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    if card.status == CardStatus.BLOCKED:
        raise CardAlreadyBlockedException()

    # Call AccountPE to freeze card
    try:
        await accountpe_client.freeze_card(card.provider_card_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Card provider error: {str(e)}",
        )

    # Update local status
    card.status = CardStatus.FROZEN
    await db.commit()
    await db.refresh(card)

    # Log audit event
    await log_audit_event(
        db=db,
        user_id=current_user.id,
        action="card_freeze",
        resource_type="card",
        resource_id=str(card_id),
        details={},
        ip_address=request.client.host if request.client else None,
    )

    return CardResponse.model_validate(card)


@router.post("/{card_id}/unfreeze", response_model=CardResponse)
async def unfreeze_card(
    request: Request,
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Unfreeze a previously frozen card.
    """
    result = await db.execute(select(Card).where(Card.id == card_id))
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(card_id)

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    if card.status == CardStatus.BLOCKED:
        raise CardAlreadyBlockedException()

    if card.status != CardStatus.FROZEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card is not frozen",
        )

    # Call AccountPE to unfreeze card
    try:
        await accountpe_client.unfreeze_card(card.provider_card_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Card provider error: {str(e)}",
        )

    # Update local status
    card.status = CardStatus.ACTIVE
    await db.commit()
    await db.refresh(card)

    # Log audit event
    await log_audit_event(
        db=db,
        user_id=current_user.id,
        action="card_unfreeze",
        resource_type="card",
        resource_id=str(card_id),
        details={},
        ip_address=request.client.host if request.client else None,
    )

    return CardResponse.model_validate(card)


@router.post("/{card_id}/block", response_model=CardResponse)
async def block_card(
    request: Request,
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Block a card permanently (irreversible).
    """
    result = await db.execute(select(Card).where(Card.id == card_id))
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(card_id)

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    if card.status == CardStatus.BLOCKED:
        raise CardAlreadyBlockedException()

    # Call AccountPE to block card
    try:
        await accountpe_client.block_card(card.provider_card_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Card provider error: {str(e)}",
        )

    # Update local status
    card.status = CardStatus.BLOCKED
    await db.commit()
    await db.refresh(card)

    # Log audit event
    await log_audit_event(
        db=db,
        user_id=current_user.id,
        action="card_block",
        resource_type="card",
        resource_id=str(card_id),
        details={},
        ip_address=request.client.host if request.client else None,
    )

    return CardResponse.model_validate(card)


@router.get("/{card_id}/reveal", response_model=CardRevealResponse)
@limiter.limit("5/minute")
async def reveal_card_details(
    request: Request,
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reveal full card number and CVV (rate limited to 5 requests/minute and logged for security).
    """
    result = await db.execute(select(Card).where(Card.id == card_id))
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(card_id)

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    # Decrypt sensitive fields
    try:
        card_number_full = decrypt_field(card.card_number_full_encrypted)
        cvv = decrypt_field(card.cvv_encrypted)
    except Exception as e:
        logger.error(f"Failed to decrypt card {card_id} for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt card details",
        )

    # Log card reveal for audit
    logger.info(
        f"Card revealed",
        extra={
            "extra_fields": {
                "user_id": str(current_user.id),
                "card_id": str(card_id),
                "action": "card_reveal",
                "ip_address": request.client.host if request.client else None,
            }
        },
    )

    return CardRevealResponse(
        card_number_full=card_number_full,
        cvv=cvv,
        expiry_date=card.expiry_date,
    )
