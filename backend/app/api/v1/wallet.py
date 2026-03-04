"""
Wallet endpoints for managing user wallet balance (USD-based, multi-currency).
Supports: balance check, top-up via MoMo (local currency), transfer to card (USD),
withdraw to MoMo (USD→local).
"""

from datetime import datetime, timezone
from decimal import Decimal
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.models.user import User
from app.models.card import Card, CardStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.schemas.wallet import (
    WalletBalanceResponse,
    WalletTopupRequest,
    WalletTopupResponse,
    WalletTransferRequest,
    WalletTransferResponse,
    WalletWithdrawRequest,
    WalletWithdrawResponse,
    ExchangeRateResponse,
)
from app.config import settings
from app.services.auth import get_current_user
from app.services.accountpe import accountpe_client
from app.services.payin import payin_client, PayinError, PAYIN_COUNTRIES, get_country_fee_rate, get_country_currency, format_phone_e164
from app.services.enkap import enkap_client, EnkapError
from app.services.payout import payout_client, PayoutError
from app.services.exchange_rate import exchange_rate_service
from app.middleware.rate_limit import limiter
from app.utils.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/wallet", tags=["Wallet"])

WALLET_TRANSFER_FEE_RATE = Decimal(str(settings.wallet_transfer_fee_rate))


@router.get("/balance", response_model=WalletBalanceResponse)
async def get_wallet_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current user's wallet balance in USD."""
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    return WalletBalanceResponse(balance=user.wallet_balance, currency="USD")


@router.get("/exchange-rate", response_model=ExchangeRateResponse)
async def get_exchange_rate(
    current_user: User = Depends(get_current_user),
):
    """Get current exchange rates for the user's country."""
    country_code = current_user.country_code or "CM"
    country = PAYIN_COUNTRIES.get(country_code)
    if not country:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Country {country_code} not supported",
        )

    currency = country["currency"]
    try:
        topup_rate = await exchange_rate_service.get_topup_rate(currency)
        withdrawal_rate = await exchange_rate_service.get_rate(currency)
    except ValueError as e:
        logger.warning(f"Exchange rate unavailable for {currency}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Taux de change indisponible. Veuillez reessayer.",
        )

    fee_rate = get_country_fee_rate(country_code)

    return ExchangeRateResponse(
        topup_rate=topup_rate,
        withdrawal_rate=withdrawal_rate,
        local_currency=currency,
        fee_rate=fee_rate,
        markup_percent=Decimal("8.00"),
    )


@router.post("/topup", response_model=WalletTopupResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def topup_wallet(
    request: Request,
    data: WalletTopupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate a wallet top-up via Mobile Money or E-nkap.
    User can specify amount_usd OR amount_local. Payment is always in local currency.
    The wallet is credited in USD upon webhook confirmation.
    """
    if data.payment_method == "mobile_money" and not data.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required for mobile money payments",
        )

    # Get country info
    country_code = current_user.country_code or "CM"
    country = PAYIN_COUNTRIES.get(country_code)
    if not country:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Country {country_code} not supported",
        )

    currency = country["currency"]
    fee_rate = get_country_fee_rate(country_code)

    # Get exchange rate with 8% markup
    try:
        markup_rate = await exchange_rate_service.get_topup_rate(currency)
    except ValueError as e:
        logger.warning(f"Exchange rate unavailable for topup ({currency}): {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Taux de change indisponible. Veuillez reessayer.",
        )

    # Calculate amounts — round local amounts to integer (XAF/XOF have no cents)
    if data.amount_usd is not None:
        amount_usd = data.amount_usd
        amount_local = (amount_usd * markup_rate).quantize(Decimal("1"))
    else:
        amount_local = data.amount_local.quantize(Decimal("1"))
        amount_usd = (amount_local / markup_rate).quantize(Decimal("0.01"))

    # Calculate fees in local currency (rounded to integer)
    fee_local = (amount_local * fee_rate).quantize(Decimal("1"))
    total_local = amount_local + fee_local

    # Generate unique order reference
    order_ref = f"WALLET-{current_user.id.hex[:8]}-{uuid.uuid4().hex[:8]}"

    # Create pending transaction — amount stored in USD
    transaction = Transaction(
        card_id=None,
        user_id=current_user.id,
        amount=amount_usd,
        currency="USD",
        type=TransactionType.WALLET_TOPUP,
        status=TransactionStatus.PENDING,
        description=f"Wallet top-up ${amount_usd} USD ({amount_local} {currency})",
        provider_transaction_id=order_ref,
        extra_data={
            "payment_method": data.payment_method,
            "phone": data.phone,
            "amount_usd": str(amount_usd),
            "amount_local": str(amount_local),
            "local_currency": currency,
            "exchange_rate": str(markup_rate),
            "fee_local": str(fee_local),
            "fee_rate": str(fee_rate),
            "total_local": str(total_local),
            "country_code": country_code,
        },
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # Initiate payment with provider (amount in local currency)
    try:
        if data.payment_method == "mobile_money":
            result = await payin_client.create_payment_link(
                amount=float(total_local),
                country_code=country_code,
                order_ref=order_ref,
                customer_name=f"{current_user.first_name} {current_user.last_name}",
                customer_email=current_user.email,
                customer_phone=data.phone,
                description=f"Recharge wallet LTC - {order_ref}",
            )

            if not result.get("success"):
                raise PayinError("Erreur lors de la creation du lien de paiement")

            transaction.extra_data = {
                **transaction.extra_data,
                "payment_link_id": result.get("payment_link_id"),
                "payin_transaction_id": result.get("transaction_id"),
                "payment_link": result.get("payment_link"),
            }
            await db.commit()

            return WalletTopupResponse(
                success=True,
                transaction_id=transaction.id,
                amount_usd=amount_usd,
                amount_local=amount_local,
                local_currency=currency,
                exchange_rate=markup_rate,
                fee_local=fee_local,
                total_local=total_local,
                fee_rate=fee_rate,
                payment_reference=order_ref,
                payment_url=result.get("payment_link"),
                message="Cliquez sur le lien pour effectuer votre paiement",
            )
        else:
            # E-nkap
            result = await enkap_client.initiate_payment(
                amount=float(total_local),
                order_ref=order_ref,
                customer_name=f"{current_user.first_name} {current_user.last_name}",
                customer_email=current_user.email,
                customer_phone=data.phone or current_user.phone,
            )

            if not result.get("success"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get("error", "Payment failed"),
                )

            transaction.extra_data = {
                **transaction.extra_data,
                "order_id": result.get("order_id"),
                "transaction_id": result.get("transaction_id"),
            }
            await db.commit()

            return WalletTopupResponse(
                success=True,
                transaction_id=transaction.id,
                amount_usd=amount_usd,
                amount_local=amount_local,
                local_currency=currency,
                exchange_rate=markup_rate,
                fee_local=fee_local,
                total_local=total_local,
                fee_rate=fee_rate,
                payment_reference=result.get("order_id"),
                payment_url=result.get("payment_url"),
                message="Redirection vers la page de paiement",
            )

    except (PayinError, EnkapError) as e:
        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {**transaction.extra_data, "error": str(e)}
        await db.commit()
        logger.error(f"Wallet topup payment error for transaction {transaction.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le paiement a echoue. Veuillez reessayer.",
        )
    except HTTPException:
        raise
    except Exception as e:
        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {**transaction.extra_data, "error": str(e)}
        await db.commit()
        logger.error(f"Unexpected wallet topup error for transaction {transaction.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Une erreur inattendue est survenue",
        )


@router.post("/topup/verify/{transaction_id}")
@limiter.limit("30/minute")
async def verify_topup(
    request: Request,
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a wallet top-up payment status with Payin and credit wallet if confirmed.
    Called by the mobile app after the payment WebView closes.
    Polls Payin's /payment_link_status endpoint and updates the transaction accordingly.
    """
    # Find the pending transaction
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.WALLET_TOPUP,
        )
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction non trouvée",
        )

    # Already completed or failed — return current status
    if transaction.status == TransactionStatus.COMPLETED:
        result = await db.execute(select(User).where(User.id == current_user.id))
        user = result.scalar_one()
        return {
            "status": "COMPLETED",
            "message": "Paiement déjà confirmé",
            "wallet_balance": str(user.wallet_balance),
            "amount_usd": str(transaction.amount),
        }

    if transaction.status == TransactionStatus.FAILED:
        return {
            "status": "FAILED",
            "message": "Ce paiement a échoué",
        }

    # Check with Payin API — use Payin's own transaction_id (not our order_ref)
    payin_tx_id = (transaction.extra_data or {}).get("payin_transaction_id")
    if not payin_tx_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Référence de paiement Payin manquante",
        )

    try:
        payin_status = await payin_client.get_payment_status(payin_tx_id)
    except PayinError as e:
        logger.warning(f"Payin status check failed for {payin_tx_id}: {e}")
        return {
            "status": "PENDING",
            "message": "Vérification en cours, veuillez patienter",
        }

    status_str = payin_status.get("status", "UNKNOWN")

    if status_str == "COMPLETED":
        # Conditional UPDATE to prevent double-credit if verify_topup and webhook
        # arrive simultaneously (same pattern as webhook handlers)
        amount_usd = transaction.amount
        result = await db.execute(
            update(Transaction)
            .where(
                Transaction.id == transaction.id,
                Transaction.status == TransactionStatus.PENDING,
            )
            .values(
                status=TransactionStatus.COMPLETED,
                extra_data={
                    **transaction.extra_data,
                    "payin_status": status_str,
                    "verified_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            .returning(Transaction.id)
        )
        if result.rowcount > 0:
            # Only credit wallet if we were the ones to flip PENDING→COMPLETED
            await db.execute(
                update(User)
                .where(User.id == current_user.id)
                .values(wallet_balance=User.wallet_balance + amount_usd)
            )
        await db.commit()

        # Re-fetch updated balance
        result = await db.execute(select(User).where(User.id == current_user.id))
        updated_user = result.scalar_one()

        logger.info(
            f"Wallet topup verified: user={current_user.id}, "
            f"amount={amount_usd} USD, new_balance={updated_user.wallet_balance}"
        )

        return {
            "status": "COMPLETED",
            "message": "Paiement confirmé, wallet rechargé",
            "wallet_balance": str(updated_user.wallet_balance),
            "amount_usd": str(amount_usd),
        }

    elif status_str == "FAILED":
        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {**transaction.extra_data, "payin_status": status_str}
        await db.commit()
        return {
            "status": "FAILED",
            "message": "Le paiement a échoué",
        }

    else:
        # Still pending
        return {
            "status": "PENDING",
            "message": "Paiement en cours de traitement",
        }


@router.post("/transfer-to-card", response_model=WalletTransferResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def transfer_to_card(
    request: Request,
    data: WalletTransferRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Transfer funds from wallet to a virtual card.
    A 2% fee is applied. Everything stays in USD — no currency conversion.
    """
    fee = (data.amount * WALLET_TRANSFER_FEE_RATE).quantize(Decimal("0.01"))
    total_debit = data.amount + fee

    # Lock user row to prevent concurrent wallet modifications
    result = await db.execute(
        select(User).where(User.id == current_user.id).with_for_update()
    )
    user = result.scalar_one()

    if user.wallet_balance < total_debit:
        logger.info(f"Insufficient wallet for transfer: user={current_user.id}, required={total_debit}, available={user.wallet_balance}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Solde wallet insuffisant. Il vous faut ${total_debit} USD pour cette operation.",
        )

    # Lock card row
    result = await db.execute(
        select(Card).where(Card.id == data.card_id, Card.user_id == current_user.id).with_for_update()
    )
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Carte non trouvee",
        )

    if card.status == CardStatus.BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette carte est bloquee",
        )

    # Recharge the card on AccountPE first — fail before touching local balances
    try:
        recharge_result = await accountpe_client.recharge_card(
            card_id=str(card.provider_card_id),
            amount=float(data.amount),
        )
        if recharge_result.get("status") not in (200, "200"):
            msg = recharge_result.get("message", "Recharge failed on provider")
            logger.error(f"AccountPE recharge failed: {recharge_result}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Echec de la recharge chez le fournisseur de cartes.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AccountPE recharge error for card {card.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Erreur de communication avec le fournisseur de cartes",
        )

    # Debit wallet atomically
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(wallet_balance=User.wallet_balance - total_debit)
    )

    # Credit card locally (mirrors AccountPE)
    await db.execute(
        update(Card)
        .where(Card.id == card.id)
        .values(balance=Card.balance + data.amount)
    )

    # Create transaction record
    transaction = Transaction(
        card_id=card.id,
        user_id=current_user.id,
        amount=data.amount,
        currency="USD",
        type=TransactionType.WALLET_TO_CARD,
        status=TransactionStatus.COMPLETED,
        description=f"Transfert wallet -> carte {card.card_number_masked} (${data.amount} USD, frais: ${fee} USD)",
        extra_data={
            "fee": str(fee),
            "total_debited": str(total_debit),
        },
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # Re-fetch updated balances
    result = await db.execute(select(User).where(User.id == current_user.id))
    updated_user = result.scalar_one()
    result = await db.execute(select(Card).where(Card.id == card.id))
    updated_card = result.scalar_one()

    logger.info(
        f"Wallet->Card transfer: user={current_user.id}, card={card.id}, "
        f"amount={data.amount}, fee={fee}, new_wallet={updated_user.wallet_balance}, "
        f"new_card={updated_card.balance}"
    )

    return WalletTransferResponse(
        success=True,
        transaction_id=transaction.id,
        amount=data.amount,
        fee=fee,
        total_debited=total_debit,
        currency="USD",
        new_wallet_balance=updated_user.wallet_balance,
        new_card_balance=updated_card.balance,
        message="Transfert effectue avec succes",
    )


@router.post("/withdraw", response_model=WalletWithdrawResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def withdraw_from_wallet(
    request: Request,
    data: WalletWithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Withdraw funds from wallet to MoMo.
    Input is in USD. Conversion to local at real rate (no 8% markup).
    """
    # Get country info
    country_code = current_user.country_code or "CM"
    country = PAYIN_COUNTRIES.get(country_code)
    if not country:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Country {country_code} not supported",
        )

    currency = country["currency"]

    # Get real exchange rate (no markup)
    try:
        real_rate = await exchange_rate_service.get_rate(currency)
    except ValueError as e:
        logger.warning(f"Exchange rate unavailable for withdrawal ({currency}): {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Taux de change indisponible. Veuillez reessayer.",
        )

    amount_usd = data.amount_usd
    amount_local = (amount_usd * real_rate).quantize(Decimal("0.01"))

    # Lock user row
    result = await db.execute(
        select(User).where(User.id == current_user.id).with_for_update()
    )
    user = result.scalar_one()

    if user.wallet_balance < amount_usd:
        logger.info(f"Insufficient wallet for withdrawal: user={current_user.id}, required={amount_usd}, available={user.wallet_balance}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solde wallet insuffisant pour ce retrait.",
        )

    # Debit wallet in USD
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(wallet_balance=User.wallet_balance - amount_usd)
    )

    # Generate unique payout reference
    payout_ref = f"PAYOUT-{current_user.id.hex[:8]}-{uuid.uuid4().hex[:8]}"

    # Create transaction (PENDING until payout confirmed)
    transaction = Transaction(
        card_id=None,
        user_id=current_user.id,
        amount=amount_usd,
        currency="USD",
        type=TransactionType.WALLET_WITHDRAWAL,
        status=TransactionStatus.PENDING,
        description=f"Retrait wallet -> MoMo {data.phone} (${amount_usd} USD = {amount_local} {currency})",
        extra_data={
            "phone": data.phone,
            "payment_method": data.payment_method,
            "amount_usd": str(amount_usd),
            "amount_local": str(amount_local),
            "local_currency": currency,
            "exchange_rate": str(real_rate),
            "country_code": country_code,
            "payout_ref": payout_ref,
        },
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # Initiate payout via AccountPE Payout API
    try:
        beneficiary_name = f"{current_user.first_name} {current_user.last_name}".strip()
        phone_e164 = format_phone_e164(data.phone, country_code)

        payout_result = await payout_client.create_transaction(
            country_code=country_code,
            beneficiary_name=beneficiary_name,
            mobile_no=phone_e164,
            amount=float(amount_local),
            transaction_id=payout_ref,
            payment_method="mobile_money",
            remarks=f"Retrait LTC wallet - {payout_ref}",
        )

        # Store payout provider details
        transaction.extra_data = {
            **transaction.extra_data,
            "payout_transaction_id": payout_result.get("data", {}).get("transaction_id", payout_ref),
            "payout_provider_response": payout_result,
        }
        await db.commit()

    except PayoutError as e:
        # Refund wallet on payout failure
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(wallet_balance=User.wallet_balance + amount_usd)
        )
        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {**transaction.extra_data, "error": str(e), "refunded": True}
        await db.commit()
        logger.error(f"Payout failed for transaction {transaction.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le retrait a echoue. Votre solde a ete recredite.",
        )
    except Exception as e:
        # Refund wallet on unexpected error
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(wallet_balance=User.wallet_balance + amount_usd)
        )
        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {**transaction.extra_data, "error": str(e), "refunded": True}
        await db.commit()
        logger.error(f"Unexpected payout error for transaction {transaction.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Une erreur inattendue est survenue. Votre solde a été recrédité.",
        )

    # Re-fetch updated balance
    result = await db.execute(select(User).where(User.id == current_user.id))
    updated_user = result.scalar_one()

    logger.info(
        f"Wallet withdrawal: user={current_user.id}, amount_usd={amount_usd}, "
        f"amount_local={amount_local} {currency}, phone={data.phone}, "
        f"new_wallet={updated_user.wallet_balance}"
    )

    return WalletWithdrawResponse(
        success=True,
        transaction_id=transaction.id,
        amount_usd=amount_usd,
        amount_local=amount_local,
        local_currency=currency,
        exchange_rate=real_rate,
        new_wallet_balance=updated_user.wallet_balance,
        message="Retrait initié, vérification en cours",
    )


@router.post("/withdraw/verify/{transaction_id}")
@limiter.limit("30/minute")
async def verify_withdrawal(
    request: Request,
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a wallet withdrawal payout status with AccountPE Payout API.
    Called by the mobile app after initiating a withdrawal.
    Polls the payout /transaction_status endpoint and updates the transaction accordingly.
    """
    # Find the transaction
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.WALLET_WITHDRAWAL,
        )
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction non trouvée",
        )

    # Already completed or failed — return current status
    if transaction.status == TransactionStatus.COMPLETED:
        result = await db.execute(select(User).where(User.id == current_user.id))
        user = result.scalar_one()
        return {
            "status": "COMPLETED",
            "message": "Retrait confirmé",
            "wallet_balance": str(user.wallet_balance),
            "amount_usd": str(transaction.amount),
        }

    if transaction.status == TransactionStatus.FAILED:
        return {
            "status": "FAILED",
            "message": transaction.extra_data.get("error", "Ce retrait a échoué"),
            "refunded": transaction.extra_data.get("refunded", False),
        }

    # Get payout reference from extra_data
    payout_tx_id = (transaction.extra_data or {}).get("payout_transaction_id")
    if not payout_tx_id:
        payout_tx_id = (transaction.extra_data or {}).get("payout_ref")
    if not payout_tx_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Référence de paiement manquante",
        )

    try:
        payout_status = await payout_client.get_transaction_status(payout_tx_id)
    except PayoutError as e:
        logger.warning(f"Payout status check failed for {payout_tx_id}: {e}")
        return {
            "status": "PENDING",
            "message": "Vérification en cours, veuillez patienter",
        }

    # Extract status from provider response
    status_data = payout_status.get("data", {})
    status_str = status_data.get("status", payout_status.get("status", ""))
    if isinstance(status_str, str):
        status_str = status_str.lower()

    if status_str in ("success", "completed"):
        transaction.status = TransactionStatus.COMPLETED
        transaction.extra_data = {
            **transaction.extra_data,
            "payout_status": status_str,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.commit()

        result = await db.execute(select(User).where(User.id == current_user.id))
        updated_user = result.scalar_one()

        logger.info(
            f"Wallet withdrawal verified: user={current_user.id}, "
            f"amount={transaction.amount} USD, balance={updated_user.wallet_balance}"
        )

        return {
            "status": "COMPLETED",
            "message": "Retrait confirmé, fonds envoyés",
            "wallet_balance": str(updated_user.wallet_balance),
            "amount_usd": str(transaction.amount),
        }

    elif status_str in ("failed", "cancelled", "refunded", "rejected"):
        # Refund wallet balance
        amount_usd = transaction.amount
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(wallet_balance=User.wallet_balance + amount_usd)
        )

        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {
            **transaction.extra_data,
            "payout_status": status_str,
            "refunded": True,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.commit()

        result = await db.execute(select(User).where(User.id == current_user.id))
        updated_user = result.scalar_one()

        logger.info(
            f"Wallet withdrawal failed+refunded: user={current_user.id}, "
            f"amount={amount_usd} USD, new_balance={updated_user.wallet_balance}"
        )

        return {
            "status": "FAILED",
            "message": "Le retrait a échoué. Votre solde a été recrédité.",
            "wallet_balance": str(updated_user.wallet_balance),
            "refunded": True,
        }

    else:
        # Still pending/processing
        return {
            "status": "PENDING",
            "message": "Retrait en cours de traitement",
        }
