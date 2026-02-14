"""
Payment endpoints for card top-ups using S3P Mobile Money and E-nkap
"""

from decimal import Decimal
from typing import Literal, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.user import User
from app.models.card import Card
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.services.auth import get_current_user
from app.services.s3p import s3p_client, S3PError
from app.services.enkap import enkap_client, EnkapError, verify_webhook_signature
from app.utils.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/payments", tags=["Payments"])


# Request/Response Models
class InitiatePaymentRequest(BaseModel):
    method: Literal["mobile_money", "enkap"]
    amount: float = Field(gt=0, description="Amount to pay in XAF")
    card_id: uuid.UUID
    phone: Optional[str] = None  # Required for mobile_money
    customer_name: Optional[str] = None  # Required for enkap
    customer_email: Optional[EmailStr] = None  # Required for enkap


class InitiatePaymentResponse(BaseModel):
    success: bool
    transaction_id: uuid.UUID
    payment_reference: str
    payment_url: Optional[str] = None  # For enkap redirect
    message: str


class PaymentStatusResponse(BaseModel):
    transaction_id: uuid.UUID
    status: TransactionStatus
    amount: Decimal
    currency: str
    payment_reference: str
    message: Optional[str] = None


@router.post("/initiate", response_model=InitiatePaymentResponse, status_code=status.HTTP_201_CREATED)
async def initiate_payment(
    payment_data: InitiatePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate a payment for card top-up using Mobile Money (S3P) or E-nkap
    """
    # Validate card ownership
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
    if payment_data.method == "mobile_money" and not payment_data.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is required for mobile money payments"
        )

    if payment_data.method == "enkap":
        if not payment_data.customer_name or not payment_data.customer_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer name and email are required for E-nkap payments",
            )

    # Generate unique order reference
    order_ref = f"CARD-{card.id.hex[:8]}-{uuid.uuid4().hex[:8]}"

    # Create pending transaction record
    transaction = Transaction(
        card_id=card.id,
        user_id=current_user.id,
        amount=Decimal(str(payment_data.amount)),
        currency="XAF",
        type=TransactionType.TOPUP,
        status=TransactionStatus.PENDING,
        description=f"Top-up via {payment_data.method}",
        provider_transaction_id=order_ref,
        metadata={
            "payment_method": payment_data.method,
            "phone": payment_data.phone if payment_data.method == "mobile_money" else None,
        },
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # Initiate payment based on method
    try:
        if payment_data.method == "mobile_money":
            # S3P Mobile Money
            result = await s3p_client.initiate_payment(
                amount=payment_data.amount,
                phone=payment_data.phone,
                order_ref=order_ref,
                customer_name=payment_data.customer_name or f"{current_user.first_name} {current_user.last_name}",
            )

            if not result.get("success"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error", "Payment failed"))

            # Update transaction with PTN
            transaction.metadata = {
                **transaction.metadata,
                "ptn": result.get("ptn"),
                "trid": result.get("trid"),
            }
            await db.commit()

            return InitiatePaymentResponse(
                success=True,
                transaction_id=transaction.id,
                payment_reference=result.get("ptn") or result.get("trid"),
                message=result.get("message", "Please confirm payment on your phone"),
            )

        else:  # enkap
            result = await enkap_client.initiate_payment(
                amount=payment_data.amount,
                order_ref=order_ref,
                customer_name=payment_data.customer_name,
                customer_email=payment_data.customer_email,
                customer_phone=payment_data.phone or current_user.phone,
            )

            if not result.get("success"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error", "Payment failed"))

            # Update transaction with order info
            transaction.metadata = {
                **transaction.metadata,
                "order_id": result.get("order_id"),
                "transaction_id": result.get("transaction_id"),
            }
            await db.commit()

            return InitiatePaymentResponse(
                success=True,
                transaction_id=transaction.id,
                payment_reference=result.get("order_id"),
                payment_url=result.get("payment_url"),
                message="Redirect to payment page to complete payment",
            )

    except (S3PError, EnkapError) as e:
        # Update transaction status to failed
        transaction.status = TransactionStatus.FAILED
        transaction.metadata = {**transaction.metadata, "error": str(e)}
        await db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        transaction.status = TransactionStatus.FAILED
        transaction.metadata = {**transaction.metadata, "error": str(e)}
        await db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Payment error: {str(e)}")


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
        payment_method = transaction.metadata.get("payment_method")

        try:
            if payment_method == "mobile_money":
                # Check S3P status
                trid = transaction.metadata.get("trid")
                ptn = transaction.metadata.get("ptn")
                ref = ptn or trid

                if ref:
                    verify_result = await s3p_client.verify_transaction(ref)

                    if verify_result.get("status") == "SUCCESS":
                        # Update transaction and card balance
                        transaction.status = TransactionStatus.COMPLETED
                        transaction.metadata = {**transaction.metadata, "verification": verify_result}

                        # Update card balance
                        card_result = await db.execute(select(Card).where(Card.id == transaction.card_id))
                        card = card_result.scalar_one()
                        card.balance += transaction.amount
                        await db.commit()

                    elif verify_result.get("status") in ["FAILED", "ERRORED"]:
                        transaction.status = TransactionStatus.FAILED
                        transaction.metadata = {
                            **transaction.metadata,
                            "error": verify_result.get("errorMessage"),
                        }
                        await db.commit()

            elif payment_method == "enkap":
                # Check E-nkap status
                order_id = transaction.metadata.get("order_id")

                if order_id:
                    order_status = await enkap_client.get_order_status(order_id)

                    if order_status.get("status") == "COMPLETED":
                        transaction.status = TransactionStatus.COMPLETED
                        transaction.metadata = {**transaction.metadata, "verification": order_status}

                        # Update card balance
                        card_result = await db.execute(select(Card).where(Card.id == transaction.card_id))
                        card = card_result.scalar_one()
                        card.balance += transaction.amount
                        await db.commit()

                    elif order_status.get("status") in ["FAILED", "CANCELLED"]:
                        transaction.status = TransactionStatus.FAILED
                        await db.commit()

        except Exception as e:
            # Log error but don't fail the status check
            logger.error(f"Error verifying payment status for transaction {transaction_id}: {str(e)}")

    return PaymentStatusResponse(
        transaction_id=transaction.id,
        status=transaction.status,
        amount=transaction.amount,
        currency=transaction.currency,
        payment_reference=transaction.provider_transaction_id,
        message=transaction.metadata.get("error") if transaction.status == TransactionStatus.FAILED else None,
    )


@router.post("/webhook/s3p", status_code=status.HTTP_200_OK)
async def s3p_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    S3P webhook for payment notifications (idempotent)
    Expected payload: {ptn, status, amount, trid, ...}
    """
    try:
        payload = await request.json()
        ptn = payload.get("ptn")
        trid = payload.get("trid")
        payment_status = payload.get("status")

        logger.info(f"S3P webhook received: ptn={ptn}, trid={trid}, status={payment_status}")

        # Find transaction by trid or ptn
        query = select(Transaction).where(
            (Transaction.provider_transaction_id == trid)
            | (Transaction.metadata["trid"].astext == trid)
            | (Transaction.metadata["ptn"].astext == ptn)
        )
        result = await db.execute(query)
        transaction = result.scalar_one_or_none()

        if not transaction:
            logger.warning(f"S3P webhook: Transaction not found for ptn={ptn}, trid={trid}")
            return {"status": "error", "message": "Transaction not found"}

        # Idempotency check: if already processed, return success
        if transaction.status in [TransactionStatus.COMPLETED, TransactionStatus.FAILED]:
            logger.info(f"S3P webhook: Transaction {transaction.id} already processed with status {transaction.status}")
            return {"status": "success", "message": "Transaction already processed"}

        # Update transaction status
        if payment_status == "SUCCESS":
            transaction.status = TransactionStatus.COMPLETED
            transaction.metadata = {**transaction.metadata, "webhook_data": payload}

            # Update card balance
            card_result = await db.execute(select(Card).where(Card.id == transaction.card_id))
            card = card_result.scalar_one()
            card.balance += transaction.amount
            await db.commit()

            logger.info(f"S3P webhook: Transaction {transaction.id} marked as COMPLETED, card balance updated")
            return {"status": "success", "message": "Payment processed"}

        elif payment_status in ["FAILED", "ERRORED"]:
            transaction.status = TransactionStatus.FAILED
            transaction.metadata = {**transaction.metadata, "webhook_data": payload}
            await db.commit()

            logger.info(f"S3P webhook: Transaction {transaction.id} marked as FAILED")
            return {"status": "success", "message": "Payment marked as failed"}

        return {"status": "success", "message": "Webhook received"}

    except Exception as e:
        logger.error(f"S3P webhook error: {str(e)}", exc_info=e)
        return {"status": "error", "message": str(e)}


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

        # Verify signature if present
        if signature and not verify_webhook_signature(body.decode("utf-8"), signature):
            logger.warning("E-nkap webhook: Invalid signature")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

        payload = await request.json()
        order_id = payload.get("order_id")
        merchant_ref = payload.get("merchant_reference")
        payment_status = payload.get("status")

        logger.info(f"E-nkap webhook received: order_id={order_id}, merchant_ref={merchant_ref}, status={payment_status}")

        # Find transaction
        query = select(Transaction).where(
            (Transaction.provider_transaction_id == merchant_ref) | (Transaction.metadata["order_id"].astext == order_id)
        )
        result = await db.execute(query)
        transaction = result.scalar_one_or_none()

        if not transaction:
            logger.warning(f"E-nkap webhook: Transaction not found for order_id={order_id}, merchant_ref={merchant_ref}")
            return {"status": "error", "message": "Transaction not found"}

        # Idempotency check: if already processed, return success
        if transaction.status in [TransactionStatus.COMPLETED, TransactionStatus.FAILED]:
            logger.info(f"E-nkap webhook: Transaction {transaction.id} already processed with status {transaction.status}")
            return {"status": "success", "message": "Transaction already processed"}

        # Update transaction status
        if payment_status == "COMPLETED":
            transaction.status = TransactionStatus.COMPLETED
            transaction.metadata = {**transaction.metadata, "webhook_data": payload}

            # Update card balance
            card_result = await db.execute(select(Card).where(Card.id == transaction.card_id))
            card = card_result.scalar_one()
            card.balance += transaction.amount
            await db.commit()

            logger.info(f"E-nkap webhook: Transaction {transaction.id} marked as COMPLETED, card balance updated")
            return {"status": "success", "message": "Payment processed"}

        elif payment_status in ["FAILED", "CANCELLED"]:
            transaction.status = TransactionStatus.FAILED
            transaction.metadata = {**transaction.metadata, "webhook_data": payload}
            await db.commit()

            logger.info(f"E-nkap webhook: Transaction {transaction.id} marked as FAILED")
            return {"status": "success", "message": "Payment marked as failed"}

        return {"status": "success", "message": "Webhook received"}

    except Exception as e:
        logger.error(f"E-nkap webhook error: {str(e)}", exc_info=e)
        return {"status": "error", "message": str(e)}
