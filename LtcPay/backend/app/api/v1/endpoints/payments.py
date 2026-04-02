"""
LtcPay - Payment Endpoints
"""
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import generate_transaction_ref, generate_payment_token
from app.models.transaction import Transaction, TransactionStatus
from app.schemas.payment import PaymentInitRequest, PaymentInitResponse, TransactionStatusResponse
from app.services.touchpay_service import touchpay_service

logger = logging.getLogger(__name__)
router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.post("/init", response_model=PaymentInitResponse)
async def init_payment(
    request: PaymentInitRequest,
    db: AsyncSession = Depends(get_db),
):
    """Initialize a new payment transaction."""
    # Validate amount
    if request.amount < settings.MIN_PAYMENT_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum payment amount is {settings.MIN_PAYMENT_AMOUNT} {request.currency}",
        )
    if request.amount > settings.MAX_PAYMENT_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum payment amount is {settings.MAX_PAYMENT_AMOUNT} {request.currency}",
        )

    reference = generate_transaction_ref()

    transaction = Transaction(
        reference=reference,
        amount=request.amount,
        currency=request.currency or "XAF",
        payer_phone=request.payer_phone,
        payer_email=request.payer_email,
        payer_name=request.payer_name,
        payment_method=request.payment_method,
        description=request.description,
        callback_url=request.callback_url,
        return_url=request.return_url,
        metadata_json=json.dumps(request.metadata) if request.metadata else None,
        status=TransactionStatus.PENDING,
    )

    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    payment_token = generate_payment_token(reference, request.amount)
    payment_url = f"{settings.base_url}/api/v1/payments/checkout/{reference}?token={payment_token}"

    return PaymentInitResponse(
        reference=reference,
        amount=transaction.amount,
        currency=transaction.currency,
        status=transaction.status,
        payment_url=payment_url,
        payment_token=payment_token,
        created_at=transaction.created_at,
    )


@router.get("/checkout/{reference}", response_class=HTMLResponse)
async def payment_checkout(
    reference: str,
    request: Request,
    token: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Render the payment checkout page with TouchPay SDK."""
    result = await db.execute(
        select(Transaction).where(Transaction.reference == reference)
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if transaction.status != TransactionStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Transaction is {transaction.status.value}",
        )

    # Split payer name for TouchPay SDK
    first_name = ""
    last_name = ""
    if transaction.payer_name:
        parts = transaction.payer_name.strip().split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

    sdk_config = touchpay_service.get_sdk_config(
        payment_token=token or transaction.reference,
        amount=float(transaction.amount),
        customer_email=transaction.payer_email or "",
        customer_first_name=first_name,
        customer_last_name=last_name,
        customer_phone=transaction.payer_phone or "",
        success_url=transaction.return_url or None,
        failed_url=None,
    )

    return templates.TemplateResponse(
        "checkout.html",
        {
            "request": request,
            "payment": transaction,
            "sdk_config": sdk_config,
        },
    )


@router.get("/status/{reference}", response_model=TransactionStatusResponse)
async def get_payment_status(
    reference: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the status of a payment transaction."""
    result = await db.execute(
        select(Transaction).where(Transaction.reference == reference)
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return TransactionStatusResponse(
        reference=transaction.reference,
        external_ref=transaction.external_ref,
        amount=transaction.amount,
        currency=transaction.currency,
        fee=transaction.fee,
        net_amount=transaction.net_amount,
        status=transaction.status,
        status_message=transaction.status_message,
        payment_method=transaction.payment_method,
        payer_phone=transaction.payer_phone,
        payer_name=transaction.payer_name,
        created_at=transaction.created_at,
        completed_at=transaction.completed_at,
    )
