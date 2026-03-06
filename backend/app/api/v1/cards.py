import asyncio
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.config import settings
from app.database import get_db
from app.models.user import User, KYCStatus
from app.models.card import Card, CardStatus, CardTier
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.schemas.card import CardPurchase, CardResponse, CardListResponse, CardRevealResponse, CardUpdateLimit
from app.services.auth import get_current_user, verify_token
from app.services.accountpe import accountpe_client, AccountPEError
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


async def _refund_wallet(db: AsyncSession, user_id, amount: Decimal) -> None:
    """Refund wallet balance atomically and commit."""
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(wallet_balance=User.wallet_balance + amount)
    )
    await db.commit()


def _map_accountpe_error(error: AccountPEError) -> HTTPException:
    """Map AccountPE business errors to appropriate HTTP status codes."""
    msg = str(error).lower()
    if "insufficient" in msg or "balance" in msg or "not enough" in msg:
        return HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(error))
    if "invalid" in msg or "not valid" in msg or "bad request" in msg:
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    if "not found" in msg or "no card" in msg or "no user" in msg:
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    if "unauthorized" in msg or "auth" in msg or "token" in msg:
        return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Card provider authentication failed")
    # Default: map to 400 — never forward 401/403 from provider (reserved for our auth)
    if "required" in msg or "field" in msg:
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    if 400 <= error.status_code < 500 and error.status_code not in (401, 403):
        return HTTPException(status_code=error.status_code, detail=str(error))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.post("/purchase", response_model=CardResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
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

    # Card tier pricing + configurable fee on initial balance
    CARD_OPERATION_FEE_RATE = Decimal(str(settings.card_operation_fee_rate))
    tier_prices = {
        CardTier.STANDARD: Decimal(str(settings.card_tier_standard_price)),
        CardTier.PREMIUM: Decimal(str(settings.card_tier_premium_price)),
        CardTier.GOLD: Decimal(str(settings.card_tier_gold_price)),
    }
    card_price = tier_prices[card_data.card_tier]
    recharge_fee = (card_data.initial_balance * CARD_OPERATION_FEE_RATE).quantize(Decimal("0.01"))
    total_cost = card_data.initial_balance + card_price + recharge_fee

    # Lock user row to prevent concurrent wallet modifications
    result = await db.execute(
        select(User).where(User.id == current_user.id).with_for_update()
    )
    user = result.scalar_one()

    if user.wallet_balance < total_cost:
        logger.info(f"Insufficient balance for card purchase: user={current_user.id}, required={total_cost}, available={user.wallet_balance}")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Solde insuffisant. Il vous faut ${total_cost:.2f} pour cette operation.",
        )

    # Debit wallet atomically
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(wallet_balance=User.wallet_balance - total_cost)
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

    # Call AccountPE to purchase card — route by tier
    try:
        card_type_lower = card_data.card_type.value.lower()
        amount = float(card_data.initial_balance)
        if card_data.card_tier == CardTier.PREMIUM:
            purchase_resp = await accountpe_client.purchase_credit_card(
                user_id=provider_user_id,
                card_type=card_type_lower,
                amount=amount,
            )
        elif card_data.card_tier == CardTier.GOLD:
            purchase_resp = await accountpe_client.purchase_contactless_card(
                user_id=provider_user_id,
                card_type=card_type_lower,
                amount=amount,
            )
        else:
            purchase_resp = await accountpe_client.purchase_card(
                user_id=provider_user_id,
                card_type=card_type_lower,
                amount=amount,
            )
    except AccountPEError as e:
        logger.warning(f"AccountPE purchase_card business error: {e}")
        await _refund_wallet(db, current_user.id, total_cost)
        raise _map_accountpe_error(e)
    except Exception as e:
        logger.error(f"AccountPE purchase_card failed: {e}")
        await _refund_wallet(db, current_user.id, total_cost)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Card provider is temporarily unavailable. Votre solde a ete recredite.",
        )

    # Extract card_id from purchase response (may be nested in data)
    provider_card_id = (
        purchase_resp.get("card_id")
        or (purchase_resp.get("data", {}) or {}).get("card_id")
        or (purchase_resp.get("data", {}) or {}).get("id")
        or (purchase_resp.get("vcard", {}) or {}).get("card_id")
        or ""
    )
    provider_card_id = str(provider_card_id)
    logger.info(f"AccountPE purchase response card_id={provider_card_id}, status={purchase_resp.get('status')}")

    # If card_id not found, try fetching user's cards to find the newest one
    if not provider_card_id:
        try:
            all_cards = await accountpe_client.get_all_cards(provider_user_id)
            card_list = all_cards.get("card_list", [])
            if card_list:
                # Take the card with the highest id (newest) — list order varies
                newest = max(card_list, key=lambda c: c.get("id", 0))
                provider_card_id = str(newest.get("card_id", ""))
                logger.info(f"Resolved card_id from get_all_cards: {provider_card_id}")
        except Exception as e:
            logger.warning(f"Failed to fetch cards list as fallback: {e}")

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
            vcard = details_resp.get("data") or details_resp.get("card_list") or details_resp
            card_number_full = vcard.get("encrypted_cardnumber", "")
            if not card_number_full:
                raise ValueError("Card number not returned by provider")
            masked = vcard.get("masked_pan", "")
            card_number_masked = masked if masked else (f"****{card_number_full[-4:]}" if len(card_number_full) >= 4 else "****0000")
            cvv = vcard.get("encrypted_cvv", "")
            if not cvv:
                raise ValueError("CVV not returned by provider")
            raw_expiry = vcard.get("expiry", "")
            if not raw_expiry:
                raise ValueError("Expiry not returned by provider")
            # AccountPE returns "MMYY" (e.g. "0329"), convert to "MM/YY"
            if len(raw_expiry) == 4 and "/" not in raw_expiry:
                expiry_date = f"{raw_expiry[:2]}/{raw_expiry[2:]}"
            else:
                expiry_date = raw_expiry
            currency = vcard.get("currency", "USD")
            if vcard.get("balance"):
                try:
                    balance_from_provider = Decimal(str(vcard["balance"]))
                except (ValueError, TypeError):
                    pass
        except Exception as e:
            logger.error(f"Failed to fetch card details from AccountPE: {e}")
            await _refund_wallet(db, current_user.id, total_cost)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Impossible de recuperer les details de la carte. Votre solde a ete recredite.",
            )
    else:
        # No card_id from provider — refund and fail
        await _refund_wallet(db, current_user.id, total_cost)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Le fournisseur n'a pas retourne d'identifiant de carte. Votre solde a ete recredite.",
        )

    # Store card in database with encrypted sensitive fields
    new_card = Card(
        user_id=current_user.id,
        card_type=card_data.card_type,
        card_tier=card_data.card_tier,
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

    # Create PURCHASE transaction so it appears in the user's history
    tier_label = card_data.card_tier.value.capitalize()
    purchase_tx = Transaction(
        card_id=new_card.id,
        user_id=current_user.id,
        amount=total_cost,
        fee=recharge_fee,
        currency="USD",
        type=TransactionType.PURCHASE,
        status=TransactionStatus.COMPLETED,
        description=(
            f"Achat carte {card_data.card_type.value} {tier_label} "
            f"(carte ${card_price}, solde ${card_data.initial_balance}, frais ${recharge_fee})"
        ),
    )
    db.add(purchase_tx)

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
            "card_tier": card_data.card_tier.value,
            "initial_balance": str(card_data.initial_balance),
        },
        ip_address=request.client.host if request.client else None,
    )

    return CardResponse.model_validate(new_card)


async def _sync_card_with_provider(card: Card, db: AsyncSession) -> None:
    """Sync a card's balance and status with AccountPE. Updates DB in place (caller must commit)."""
    if not card.provider_card_id:
        return
    try:
        details = await accountpe_client.get_card_details(str(card.provider_card_id))
        vcard = details.get("card_list", details.get("data", {}))
        if not vcard:
            return

        # Sync balance
        provider_balance = vcard.get("balance")
        if provider_balance is not None:
            card.balance = Decimal(str(provider_balance))

        # Sync status (AccountPE: Active, Frozen, Blocked, Terminated, Deactivated)
        provider_status = (vcard.get("status") or "").lower()
        if provider_status in ("terminated", "blocked", "deactivated"):
            card.status = CardStatus.BLOCKED
        elif provider_status == "frozen":
            card.status = CardStatus.FROZEN
        elif provider_status == "active":
            card.status = CardStatus.ACTIVE
    except Exception as e:
        logger.warning(f"Failed to sync card {card.id} with AccountPE: {e}")


@router.get("/", response_model=CardListResponse)
async def list_user_cards(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all cards owned by the current user.
    Balance and status are synced with AccountPE on each call.
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

    # Sync all cards with AccountPE in parallel (15s timeout)
    if cards:
        try:
            results = await asyncio.wait_for(
                asyncio.gather(
                    *[_sync_card_with_provider(card, db) for card in cards],
                    return_exceptions=True,
                ),
                timeout=15.0,
            )
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.warning(f"Failed to sync card {cards[i].id}: {result}")
        except asyncio.TimeoutError:
            logger.warning("Card sync timed out after 15s, returning cached data")
    await db.commit()

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
    Get details of a specific card. Balance and status synced with AccountPE.
    """
    result = await db.execute(select(Card).where(Card.id == card_id))
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(card_id)

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    await _sync_card_with_provider(card, db)
    await db.commit()

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
    except AccountPEError as e:
        raise _map_accountpe_error(e)
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
    except AccountPEError as e:
        raise _map_accountpe_error(e)
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
    except AccountPEError as e:
        raise _map_accountpe_error(e)
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


@router.post("/{card_id}/replace", response_model=CardResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def replace_card(
    request: Request,
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Replace a card via AccountPE. The old card is blocked and a new one is issued
    with the same type and tier. Remaining balance is transferred to the new card.
    """
    result = await db.execute(select(Card).where(Card.id == card_id))
    old_card = result.scalar_one_or_none()

    if not old_card:
        raise CardNotFoundException(card_id)

    if old_card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    if not old_card.provider_card_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Carte sans identifiant fournisseur",
        )

    # Choose the right AccountPE endpoint based on card status
    try:
        if old_card.status == CardStatus.BLOCKED:
            replace_resp = await accountpe_client.replace_terminated_card(
                old_card.provider_card_id
            )
        else:
            replace_resp = await accountpe_client.replace_card(
                old_card.provider_card_id
            )
    except AccountPEError as e:
        logger.warning(f"AccountPE replace_card error for card {card_id}: {e}")
        raise _map_accountpe_error(e)
    except Exception as e:
        logger.error(f"AccountPE replace_card failed for card {card_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Card provider is temporarily unavailable",
        )

    # Extract new card_id from response
    vcard = replace_resp.get("vcard", {}) or replace_resp.get("data", {}) or {}
    new_provider_card_id = (
        vcard.get("card_id")
        or replace_resp.get("card_id")
        or ""
    )
    new_provider_card_id = str(new_provider_card_id)

    if not new_provider_card_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Le fournisseur n'a pas retourne la nouvelle carte",
        )

    # Fetch full details of the new card
    card_number_full = ""
    card_number_masked = "****0000"
    expiry_date = "12/29"
    cvv = "000"
    balance_from_provider = old_card.balance
    currency = old_card.currency or "USD"

    try:
        details_resp = await accountpe_client.get_card_details(new_provider_card_id)
        det = details_resp.get("data") or details_resp.get("card_list") or details_resp
        card_number_full = det.get("encrypted_cardnumber", "")
        if not card_number_full:
            raise ValueError("Card number not returned")
        masked = det.get("masked_pan", "")
        card_number_masked = masked if masked else (
            f"****{card_number_full[-4:]}" if len(card_number_full) >= 4 else "****0000"
        )
        cvv = det.get("encrypted_cvv", "")
        if not cvv:
            raise ValueError("CVV not returned")
        raw_expiry = det.get("expiry", "")
        if not raw_expiry:
            raise ValueError("Expiry not returned")
        if len(raw_expiry) == 4 and "/" not in raw_expiry:
            expiry_date = f"{raw_expiry[:2]}/{raw_expiry[2:]}"
        else:
            expiry_date = raw_expiry
        currency = det.get("currency", currency)
        if det.get("balance"):
            try:
                balance_from_provider = Decimal(str(det["balance"]))
            except (ValueError, TypeError):
                pass
    except Exception as e:
        logger.error(f"Failed to fetch replacement card details: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Carte remplacee mais impossible de recuperer les details",
        )

    # Mark old card as blocked
    old_card.status = CardStatus.BLOCKED

    # Create new card record
    new_card = Card(
        user_id=current_user.id,
        card_type=old_card.card_type,
        card_tier=old_card.card_tier,
        card_number_masked=card_number_masked,
        card_number_full_encrypted=encrypt_field(card_number_full),
        status=CardStatus.ACTIVE,
        balance=balance_from_provider,
        currency=currency,
        provider="AccountPE",
        provider_card_id=new_provider_card_id,
        expiry_date=expiry_date,
        cvv_encrypted=encrypt_field(cvv),
        spending_limit=old_card.spending_limit,
    )
    db.add(new_card)

    await db.commit()
    await db.refresh(new_card)

    # Log audit event
    await log_audit_event(
        db=db,
        user_id=current_user.id,
        action="card_replace",
        resource_type="card",
        resource_id=str(new_card.id),
        details={"old_card_id": str(card_id)},
        ip_address=request.client.host if request.client else None,
    )

    return CardResponse.model_validate(new_card)


@router.patch("/{card_id}/limit", response_model=CardResponse)
async def update_card_limit(
    card_id: str,
    payload: CardUpdateLimit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the spending limit for a card.
    """
    result = await db.execute(select(Card).where(Card.id == card_id))
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(card_id)

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    card.spending_limit = payload.spending_limit
    await db.commit()
    await db.refresh(card)

    return CardResponse.model_validate(card)


@router.post("/{card_id}/reveal", response_model=CardRevealResponse)
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
    except Exception:
        logger.error(f"Card decryption failed: card_id={card_id}, user_id={current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible d'acceder aux details de la carte. Veuillez reessayer.",
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


@router.get("/{card_id}/history")
async def get_card_provider_history(
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get card transaction history from AccountPE provider.
    Returns provider-side events: CardIssuance, Authorization, CardTermination, etc.
    """
    result = await db.execute(select(Card).where(Card.id == card_id))
    card = result.scalar_one_or_none()

    if not card:
        raise CardNotFoundException(card_id)

    if card.user_id != current_user.id:
        raise UnauthorizedCardAccessException()

    if not card.provider_card_id:
        return {"transactions": []}

    try:
        resp = await accountpe_client.get_card_transactions(str(card.provider_card_id))
        raw_txns = resp.get("transactions", [])

        # Normalize AccountPE transactions to a simple format
        transactions = []
        for t in raw_txns:
            merchant = t.get("merchant", {}) or {}
            transactions.append({
                "id": str(t.get("id", "")),
                "type": t.get("transactionType", ""),
                "status": t.get("transactionStatus", ""),
                "amount": t.get("transactionAmount", 0),
                "currency": t.get("currencyCode", "USD"),
                "description": t.get("description", ""),
                "merchant_name": merchant.get("merchantName", ""),
                "merchant_country": merchant.get("merchantCountry", ""),
                "balance_after": t.get("balanceAfterTransaction", 0),
                "created_at": t.get("created_at", ""),
            })

        return {"transactions": transactions}
    except AccountPEError as e:
        logger.warning(f"AccountPE get_card_transactions error for card {card_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to fetch card history from AccountPE for card {card_id}: {e}")
        return {"transactions": [], "error": "Impossible de recuperer l'historique du fournisseur"}
