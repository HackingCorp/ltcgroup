"""
Payment endpoints for card top-ups using Payin (Mobile Money) and E-nkap (Bank Cards)
"""

import hmac
from decimal import Decimal
from typing import Literal, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.models.user import User
from app.models.card import Card
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.services.auth import get_current_user
from app.services.payin import payin_client, PayinError, PAYIN_COUNTRIES, get_country_fee_rate
from app.services.enkap import enkap_client, EnkapError, verify_webhook_signature
from app.config import settings
from app.middleware.rate_limit import limiter
from app.utils.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/payments", tags=["Payments"])


# Request/Response Models
class InitiatePaymentRequest(BaseModel):
    method: Literal["mobile_money", "enkap"]
    amount: Decimal = Field(gt=0, le=5000000, description="Amount to pay")
    card_id: Optional[uuid.UUID] = None  # Optional for wallet topups
    phone: Optional[str] = None  # Required for mobile_money
    customer_name: Optional[str] = None  # Required for enkap
    customer_email: Optional[EmailStr] = None  # Required for enkap
    country_code: Optional[str] = None  # Required for mobile_money (ISO 2-letter)


class InitiatePaymentResponse(BaseModel):
    success: bool
    transaction_id: uuid.UUID
    payment_reference: str
    payment_url: Optional[str] = None  # For Payin and E-nkap redirect
    amount: Decimal
    fee: Decimal
    total: Decimal
    message: str


class PaymentStatusResponse(BaseModel):
    transaction_id: uuid.UUID
    status: TransactionStatus
    amount: Decimal
    currency: str
    payment_reference: str
    message: Optional[str] = None


class PayinCountryInfo(BaseModel):
    code: str
    name: str
    provider_fee: float
    total_fee: float
    currency: str


@router.get("/countries", response_model=list[PayinCountryInfo])
async def list_supported_countries():
    """List all countries supported by Payin for Mobile Money payments."""
    return [
        PayinCountryInfo(
            code=code,
            name=info["name"],
            provider_fee=info["provider_fee"],
            total_fee=info["provider_fee"] + 0.5,  # provider + 0.5% LTC margin
            currency=info["currency"],
        )
        for code, info in PAYIN_COUNTRIES.items()
    ]


@router.post("/initiate", response_model=InitiatePaymentResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def initiate_payment(
    request: Request,
    payment_data: InitiatePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate a payment for card top-up using Mobile Money (Payin) or E-nkap
    """
    # Validate card ownership (optional — card_id may be None for PURCHASE)
    card = None
    if payment_data.card_id:
        result = await db.execute(
            select(Card).where(Card.id == payment_data.card_id, Card.user_id == current_user.id)
        )
        card = result.scalar_one_or_none()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Card not found or you don't have permission to access it",
            )

    # Validate payment method requirements
    if payment_data.method == "mobile_money":
        if not payment_data.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number is required for mobile money payments",
            )
        if not payment_data.country_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Country code is required for mobile money payments",
            )
        if payment_data.country_code.upper() not in PAYIN_COUNTRIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Country '{payment_data.country_code}' is not supported. Use GET /payments/countries for the list.",
            )

    if payment_data.method == "enkap":
        if not payment_data.customer_name or not payment_data.customer_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer name and email are required for E-nkap payments",
            )

    # Generate unique order reference
    if card:
        order_ref = f"CARD-{card.id.hex[:8]}-{uuid.uuid4().hex[:8]}"
    else:
        order_ref = f"PURCHASE-{current_user.id.hex[:8]}-{uuid.uuid4().hex[:8]}"

    # Determine currency and compute fee server-side based on country
    currency = "XAF"
    fee = Decimal("0")
    if payment_data.method == "mobile_money" and payment_data.country_code:
        country_info = PAYIN_COUNTRIES.get(payment_data.country_code.upper(), {})
        currency = country_info.get("currency", "XAF")
        fee_rate = get_country_fee_rate(payment_data.country_code)
        fee = (payment_data.amount * fee_rate).quantize(Decimal("0.01"))
    elif payment_data.method == "enkap":
        # E-nkap: apply a flat 0.5% platform fee
        fee = (payment_data.amount * Decimal("0.005")).quantize(Decimal("0.01"))

    total_charged = payment_data.amount + fee

    # Create pending transaction record
    transaction = Transaction(
        card_id=card.id if card else None,
        user_id=current_user.id,
        amount=payment_data.amount,
        fee=fee,
        currency=currency,
        type=TransactionType.TOPUP if card else TransactionType.PURCHASE,
        status=TransactionStatus.PENDING,
        description=f"{'Top-up' if card else 'Card purchase'} via {payment_data.method}",
        provider_transaction_id=order_ref,
        extra_data={
            "payment_method": payment_data.method,
            "phone": payment_data.phone if payment_data.method == "mobile_money" else None,
            "country_code": payment_data.country_code if payment_data.method == "mobile_money" else None,
            "fee": str(fee),
            "total_charged": str(total_charged),
        },
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # Initiate payment based on method
    try:
        if payment_data.method == "mobile_money":
            # Payin Mobile Money (payment link) — send total_charged (amount + fee)
            result = await payin_client.create_payment_link(
                amount=float(total_charged),
                country_code=payment_data.country_code,
                order_ref=order_ref,
                customer_name=payment_data.customer_name or f"{current_user.first_name} {current_user.last_name}",
                customer_email=payment_data.customer_email or current_user.email,
                customer_phone=payment_data.phone,
                description=f"Recharge carte LTC - {order_ref}",
            )

            if not result.get("success"):
                raise PayinError("Erreur lors de la creation du lien de paiement")

            # Update transaction with Payin IDs
            transaction.extra_data = {
                **transaction.extra_data,
                "payment_link_id": result.get("payment_link_id"),
                "payin_transaction_id": result.get("transaction_id"),
                "payment_link": result.get("payment_link"),
                "fees": result.get("fees"),
            }
            await db.commit()

            return InitiatePaymentResponse(
                success=True,
                transaction_id=transaction.id,
                payment_reference=order_ref,
                payment_url=result.get("payment_link"),
                amount=payment_data.amount,
                fee=fee,
                total=total_charged,
                message="Cliquez sur le lien pour effectuer votre paiement Mobile Money",
            )

        else:  # enkap — send total_charged (amount + fee)
            result = await enkap_client.initiate_payment(
                amount=float(total_charged),
                order_ref=order_ref,
                customer_name=payment_data.customer_name,
                customer_email=payment_data.customer_email,
                customer_phone=payment_data.phone or current_user.phone,
            )

            if not result.get("success"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error", "Payment failed"))

            # Update transaction with order info
            transaction.extra_data = {
                **transaction.extra_data,
                "order_id": result.get("order_id"),
                "transaction_id": result.get("transaction_id"),
            }
            await db.commit()

            return InitiatePaymentResponse(
                success=True,
                transaction_id=transaction.id,
                payment_reference=result.get("order_id"),
                payment_url=result.get("payment_url"),
                amount=payment_data.amount,
                fee=fee,
                total=total_charged,
                message="Redirect to payment page to complete payment",
            )

    except (PayinError, EnkapError) as e:
        # Update transaction status to failed
        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {**transaction.extra_data, "error": str(e)}
        await db.commit()
        logger.error(f"Payment provider error for transaction {transaction.id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment failed. Please try again.")
    except Exception as e:
        transaction.status = TransactionStatus.FAILED
        transaction.extra_data = {**transaction.extra_data, "error": str(e)}
        await db.commit()
        logger.error(f"Unexpected payment error for transaction {transaction.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected payment error occurred")


@router.get("/status/{transaction_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the status of a payment transaction
    """
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    # If still pending, check with provider
    if transaction.status == TransactionStatus.PENDING:
        payment_method = transaction.extra_data.get("payment_method")

        try:
            if payment_method == "mobile_money":
                # Check Payin status
                payin_tx_id = transaction.extra_data.get("payin_transaction_id")

                if payin_tx_id:
                    verify_result = await payin_client.get_payment_status(payin_tx_id)

                    if verify_result.get("status") == "COMPLETED":
                        # Conditional UPDATE to prevent double-credit
                        result = await db.execute(
                            update(Transaction)
                            .where(
                                Transaction.id == transaction.id,
                                Transaction.status == TransactionStatus.PENDING,
                            )
                            .values(
                                status=TransactionStatus.COMPLETED,
                                extra_data={**transaction.extra_data, "verification": verify_result},
                            )
                            .returning(Transaction.id)
                        )
                        if result.rowcount > 0:
                            if transaction.type == TransactionType.WALLET_TOPUP:
                                await db.execute(
                                    update(User)
                                    .where(User.id == transaction.user_id)
                                    .values(wallet_balance=User.wallet_balance + transaction.amount)
                                )
                            elif transaction.card_id:
                                await db.execute(
                                    update(Card)
                                    .where(Card.id == transaction.card_id)
                                    .values(balance=Card.balance + transaction.amount)
                                )
                            # PURCHASE without card_id: nothing to credit yet
                            transaction.status = TransactionStatus.COMPLETED
                        await db.commit()

                    elif verify_result.get("status") in ["FAILED", "REFUNDED"]:
                        transaction.status = TransactionStatus.FAILED
                        transaction.extra_data = {
                            **transaction.extra_data,
                            "error": f"Payment {verify_result.get('status').lower()}",
                        }
                        await db.commit()

            elif payment_method == "enkap":
                # Check E-nkap status
                order_id = transaction.extra_data.get("order_id")

                if order_id:
                    order_status = await enkap_client.get_order_status(order_id)

                    if order_status.get("status") == "COMPLETED":
                        result = await db.execute(
                            update(Transaction)
                            .where(
                                Transaction.id == transaction.id,
                                Transaction.status == TransactionStatus.PENDING,
                            )
                            .values(
                                status=TransactionStatus.COMPLETED,
                                extra_data={**transaction.extra_data, "verification": order_status},
                            )
                            .returning(Transaction.id)
                        )
                        if result.rowcount > 0:
                            if transaction.type == TransactionType.WALLET_TOPUP:
                                await db.execute(
                                    update(User)
                                    .where(User.id == transaction.user_id)
                                    .values(wallet_balance=User.wallet_balance + transaction.amount)
                                )
                            elif transaction.card_id:
                                await db.execute(
                                    update(Card)
                                    .where(Card.id == transaction.card_id)
                                    .values(balance=Card.balance + transaction.amount)
                                )
                            # PURCHASE without card_id: nothing to credit yet
                            transaction.status = TransactionStatus.COMPLETED
                        await db.commit()

                    elif order_status.get("status") in ["FAILED", "CANCELLED"]:
                        transaction.status = TransactionStatus.FAILED
                        await db.commit()

        except Exception as e:
            logger.error(f"Error verifying payment status for transaction {transaction_id}: {str(e)}")

    return PaymentStatusResponse(
        transaction_id=transaction.id,
        status=transaction.status,
        amount=transaction.amount,
        currency=transaction.currency,
        payment_reference=transaction.provider_transaction_id,
        message=transaction.extra_data.get("error") if transaction.status == TransactionStatus.FAILED else None,
    )


@router.post("/webhook/payin", status_code=status.HTTP_200_OK)
async def payin_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Payin webhook for Mobile Money payment notifications (idempotent).
    Payload contains data.data.attributes with status codes:
    0=PENDING, 1=COMPLETED, 2=FAILED, 3=REFUNDED
    """
    try:
        # Verify webhook signature if secret is configured
        if settings.payin_webhook_secret:
            body = await request.body()
            signature = request.headers.get("X-Payin-Signature", "")
            if not signature:
                logger.warning("Payin webhook: Missing signature")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing webhook signature")
            expected_sig = hmac.new(
                settings.payin_webhook_secret.encode("utf-8"),
                body,
                "sha256",
            ).hexdigest()
            if not hmac.compare_digest(signature, expected_sig):
                logger.warning("Payin webhook: Invalid signature")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

        payload = await request.json()

        logger.info(f"Payin webhook received: {payload}")

        # Navigate nested structure: data.data.attributes
        outer_data = payload.get("data", {})
        inner_data = outer_data.get("data", {}) if isinstance(outer_data, dict) else {}
        attributes = inner_data.get("attributes", {}) if isinstance(inner_data, dict) else {}

        status_code = attributes.get("status")
        order_id = attributes.get("order_id", "")
        payin_tx_id = attributes.get("transaction_id", "")

        # Map status codes
        status_map = {0: "PENDING", 1: "COMPLETED", 2: "FAILED", 3: "REFUNDED"}
        payment_status = status_map.get(status_code, "UNKNOWN")

        # Build a unique webhook reference for idempotency
        webhook_ref = f"payin:{payin_tx_id or order_id}:{payment_status}"

        logger.info(f"Payin webhook: order_id={order_id}, tx_id={payin_tx_id}, status={payment_status}")

        # Check if this exact webhook was already processed (belt-and-suspenders)
        existing = await db.execute(
            select(Transaction.id).where(Transaction.webhook_reference == webhook_ref)
        )
        if existing.scalar_one_or_none():
            logger.info(f"Payin webhook: Duplicate webhook_ref={webhook_ref}, skipping")
            return {"status": "success", "message": "Already processed"}

        # Find transaction by order_ref or payin_transaction_id
        query = select(Transaction).where(
            (Transaction.provider_transaction_id == order_id)
            | (Transaction.extra_data["payin_transaction_id"].astext == payin_tx_id)
        )
        result = await db.execute(query)
        transaction = result.scalar_one_or_none()

        if not transaction:
            logger.warning(f"Payin webhook: Transaction not found for order_id={order_id}, tx_id={payin_tx_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

        # Idempotency check
        if transaction.status in [TransactionStatus.COMPLETED, TransactionStatus.FAILED]:
            logger.info(f"Payin webhook: Transaction {transaction.id} already processed with status {transaction.status}")
            return {"status": "success", "message": "Transaction already processed"}

        if payment_status == "COMPLETED":
            # Conditional UPDATE to prevent double-credit, store webhook_reference
            result = await db.execute(
                update(Transaction)
                .where(
                    Transaction.id == transaction.id,
                    Transaction.status == TransactionStatus.PENDING,
                )
                .values(
                    status=TransactionStatus.COMPLETED,
                    webhook_reference=webhook_ref,
                    extra_data={**transaction.extra_data, "webhook_data": payload},
                )
                .returning(Transaction.id)
            )
            if result.rowcount > 0:
                if transaction.type == TransactionType.WALLET_TOPUP:
                    await db.execute(
                        update(User)
                        .where(User.id == transaction.user_id)
                        .values(wallet_balance=User.wallet_balance + transaction.amount)
                    )
                    logger.info(f"Payin webhook: Wallet credited {transaction.amount} for user {transaction.user_id}")
                elif transaction.card_id:
                    await db.execute(
                        update(Card)
                        .where(Card.id == transaction.card_id)
                        .values(balance=Card.balance + transaction.amount)
                    )
                # PURCHASE without card_id: nothing to credit yet
            await db.commit()

            logger.info(f"Payin webhook: Transaction {transaction.id} marked as COMPLETED")
            return {"status": "success", "message": "Payment processed"}

        elif payment_status in ["FAILED", "REFUNDED"]:
            transaction.status = TransactionStatus.FAILED
            transaction.webhook_reference = webhook_ref
            transaction.extra_data = {**transaction.extra_data, "webhook_data": payload}
            await db.commit()

            logger.info(f"Payin webhook: Transaction {transaction.id} marked as FAILED")
            return {"status": "success", "message": "Payment marked as failed"}

        return {"status": "success", "message": "Webhook received"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payin webhook error: {str(e)}", exc_info=e)
        return {"status": "error", "message": "Internal error"}


@router.post("/webhook/enkap", status_code=status.HTTP_200_OK)
async def enkap_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    E-nkap webhook for payment notifications (idempotent)
    Expected payload: {order_id, status, amount, merchant_reference, ...}
    """
    try:
        # Get raw body for signature verification
        body = await request.body()
        signature = request.headers.get("X-Enkap-Signature", "")

        # Verify signature (mandatory)
        if not signature:
            logger.warning("E-nkap webhook: Missing signature")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing webhook signature")
        if not verify_webhook_signature(body.decode("utf-8"), signature):
            logger.warning("E-nkap webhook: Invalid signature")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

        payload = await request.json()
        order_id = payload.get("order_id")
        merchant_ref = payload.get("merchant_reference")
        payment_status = payload.get("status")

        # Build a unique webhook reference for idempotency
        webhook_ref = f"enkap:{order_id or merchant_ref}:{payment_status}"

        logger.info(f"E-nkap webhook received: order_id={order_id}, merchant_ref={merchant_ref}, status={payment_status}")

        # Check if this exact webhook was already processed (belt-and-suspenders)
        existing = await db.execute(
            select(Transaction.id).where(Transaction.webhook_reference == webhook_ref)
        )
        if existing.scalar_one_or_none():
            logger.info(f"E-nkap webhook: Duplicate webhook_ref={webhook_ref}, skipping")
            return {"status": "success", "message": "Already processed"}

        # Find transaction
        query = select(Transaction).where(
            (Transaction.provider_transaction_id == merchant_ref) | (Transaction.extra_data["order_id"].astext == order_id)
        )
        result = await db.execute(query)
        transaction = result.scalar_one_or_none()

        if not transaction:
            logger.warning(f"E-nkap webhook: Transaction not found for order_id={order_id}, merchant_ref={merchant_ref}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

        # Validate webhook amount vs expected amount — reject on mismatch
        webhook_amount = payload.get("amount")
        if webhook_amount is not None:
            try:
                if Decimal(str(webhook_amount)) != transaction.amount:
                    logger.error(
                        f"E-nkap webhook: Amount mismatch for transaction {transaction.id}: "
                        f"webhook={webhook_amount}, expected={transaction.amount}"
                    )
                    transaction.status = TransactionStatus.FAILED
                    transaction.extra_data = {
                        **transaction.extra_data,
                        "error": f"Amount mismatch: webhook={webhook_amount}, expected={transaction.amount}",
                        "webhook_data": payload,
                    }
                    await db.commit()
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Amount mismatch",
                    )
            except (ValueError, TypeError):
                logger.error(f"E-nkap webhook: Invalid amount in payload: {webhook_amount}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid amount in webhook payload",
                )

        # Idempotency check
        if transaction.status in [TransactionStatus.COMPLETED, TransactionStatus.FAILED]:
            logger.info(f"E-nkap webhook: Transaction {transaction.id} already processed with status {transaction.status}")
            return {"status": "success", "message": "Transaction already processed"}

        if payment_status == "COMPLETED":
            result = await db.execute(
                update(Transaction)
                .where(
                    Transaction.id == transaction.id,
                    Transaction.status == TransactionStatus.PENDING,
                )
                .values(
                    status=TransactionStatus.COMPLETED,
                    webhook_reference=webhook_ref,
                    extra_data={**transaction.extra_data, "webhook_data": payload},
                )
                .returning(Transaction.id)
            )
            if result.rowcount > 0:
                if transaction.type == TransactionType.WALLET_TOPUP:
                    await db.execute(
                        update(User)
                        .where(User.id == transaction.user_id)
                        .values(wallet_balance=User.wallet_balance + transaction.amount)
                    )
                    logger.info(f"E-nkap webhook: Wallet credited {transaction.amount} for user {transaction.user_id}")
                elif transaction.card_id:
                    await db.execute(
                        update(Card)
                        .where(Card.id == transaction.card_id)
                        .values(balance=Card.balance + transaction.amount)
                    )
                # PURCHASE without card_id: nothing to credit yet
            await db.commit()

            logger.info(f"E-nkap webhook: Transaction {transaction.id} marked as COMPLETED")
            return {"status": "success", "message": "Payment processed"}

        elif payment_status in ["FAILED", "CANCELLED"]:
            transaction.status = TransactionStatus.FAILED
            transaction.webhook_reference = webhook_ref
            transaction.extra_data = {**transaction.extra_data, "webhook_data": payload}
            await db.commit()

            logger.info(f"E-nkap webhook: Transaction {transaction.id} marked as FAILED")
            return {"status": "success", "message": "Payment marked as failed"}

        return {"status": "success", "message": "Webhook received"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"E-nkap webhook error: {str(e)}", exc_info=e)
        return {"status": "error", "message": "Internal error"}
