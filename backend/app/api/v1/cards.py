from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User, KYCStatus
from app.models.card import Card, CardStatus
from app.schemas.card import CardPurchase, CardResponse, CardListResponse, CardRevealResponse
from app.services.auth import get_current_user, verify_token
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


def _reveal_rate_key(request: Request) -> str:
    """Rate-limit card reveal per user (JWT sub) instead of per IP."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            token_data = verify_token(auth[7:])
            if token_data and token_data.user_id:
                return f"user:{token_data.user_id}"
        except Exception:
            pass
    return request.client.host if request.client else "unknown"

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

    # Get or create AccountPE user ID
    provider_user_id = current_user.accountpe_user_id
    if not provider_user_id:
        try:
            create_resp = await accountpe_client.create_user(
                email=current_user.email,
                name=f"{current_user.first_name} {current_user.last_name}",
                country="CM",
            )
            # New user created → extract user_id from response
            provider_user_id = (
                create_resp.get("data", {}).get("user_id")
                or create_resp.get("data", {}).get("id")
                or create_resp.get("user_id")
            )
            # If "Email id already exist", look up by email
            if not provider_user_id and "already exist" in create_resp.get("message", ""):
                provider_user_id = await accountpe_client.find_user_by_email(current_user.email)

            if provider_user_id:
                current_user.accountpe_user_id = str(provider_user_id)
                await db.commit()
                await db.refresh(current_user)
                logger.info(f"Stored AccountPE user_id={provider_user_id} for user {current_user.id}")
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Failed to resolve provider account",
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"AccountPE create_user failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Card provider is temporarily unavailable",
            )

    # Call AccountPE to purchase card
    try:
        purchase_resp = await accountpe_client.purchase_card(
            user_id=provider_user_id,
            card_type=card_data.card_type.value.lower(),
            amount=float(card_data.initial_balance),
        )
    except Exception as e:
        logger.error(f"AccountPE purchase_card failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Card provider is temporarily unavailable",
        )

    # Check for business errors from AccountPE (e.g. "Insufficient Wallet Balance")
    ape_status = purchase_resp.get("status", 200)
    if ape_status != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=purchase_resp.get("message", "Card purchase failed"),
        )

    provider_card_id = str(purchase_resp.get("card_id", ""))

    # Fetch full card details from AccountPE
    # POST /get_virtual_card_details {card_id}
    # Returns: {encrypted_cardnumber, masked_pan, encrypted_cvv, expiry, ...}
    card_number_full = ""
    card_number_masked = "****0000"
    expiry_date = "12/29"
    cvv = "000"
    balance_from_provider = card_data.initial_balance
    currency = "USD"

    if provider_card_id:
        try:
            details_resp = await accountpe_client.get_card_details(provider_card_id)
            vcard = details_resp.get("data", details_resp)
            card_number_full = vcard.get("encrypted_cardnumber", "")
            masked = vcard.get("masked_pan", "")
            card_number_masked = masked if masked else (f"****{card_number_full[-4:]}" if len(card_number_full) >= 4 else "****0000")
            cvv = vcard.get("encrypted_cvv", "000")
            expiry_date = vcard.get("expiry", "12/29")
            currency = vcard.get("currency", "USD")
            if vcard.get("balance"):
                try:
                    balance_from_provider = Decimal(str(vcard["balance"]))
                except (ValueError, TypeError):
                    pass
        except Exception as e:
            logger.warning(f"Failed to fetch card details from AccountPE: {e}")

    # Store card in database with encrypted sensitive fields
    new_card = Card(
        user_id=current_user.id,
        card_type=card_data.card_type,
        card_number_masked=card_number_masked,
        card_number_full_encrypted=encrypt_field(card_number_full),
        status=CardStatus.ACTIVE,
        balance=balance_from_provider,
        currency=currency,
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
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all cards owned by the current user.
    """
    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(Card).where(Card.user_id == current_user.id)
    )
    total = count_result.scalar()

    # Get paginated cards
    result = await db.execute(
        select(Card)
        .where(Card.user_id == current_user.id)
        .order_by(Card.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    cards = result.scalars().all()

    return CardListResponse(
        cards=[CardResponse.model_validate(card) for card in cards],
        total=total,
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
            detail="Card provider is temporarily unavailable",
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
            detail="Card provider is temporarily unavailable",
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
            detail="Card provider is temporarily unavailable",
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
@limiter.limit("5/minute", key_func=_reveal_rate_key)
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

    await log_audit_event(
        db=db,
        user_id=current_user.id,
        action="card_reveal",
        resource_type="card",
        resource_id=str(card_id),
        details={},
        ip_address=request.client.host if request.client else None,
    )

    return CardRevealResponse(
        card_number_full=card_number_full,
        cvv=cvv,
        expiry_date=card.expiry_date,
    )
