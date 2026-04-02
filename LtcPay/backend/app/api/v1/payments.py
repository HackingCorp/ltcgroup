"""
LtcPay Merchant Payment API endpoints.

Authenticated via API key + secret (X-API-Key / X-API-Secret headers).

Endpoints:
  POST   /api/v1/payments          - Create a new payment
  GET    /api/v1/payments/{ref}    - Get payment details by reference
  GET    /api/v1/payments          - List merchant payments (paginated)
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import get_current_merchant, generate_payment_token
from app.models.merchant import Merchant
from app.models.payment import Payment, PaymentStatus
from app.schemas.payment import (
    PaymentInitiate,
    PaymentInitiateResponse,
    PaymentResponse,
    PaymentListResponse,
)

router = APIRouter(prefix="/payments", tags=["Merchant Payments"])


def _generate_reference() -> str:
    """Generate a unique payment reference."""
    return f"PAY-{uuid.uuid4().hex[:16].upper()}"


def _compute_fee(amount: Decimal) -> Decimal:
    """Compute platform fee (1.5% of amount)."""
    return (amount * Decimal("0.015")).quantize(Decimal("0.01"))


@router.post("", response_model=PaymentInitiateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def create_payment(
    request: Request,
    payload: PaymentInitiate,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new payment request.

    The merchant sends payment details; LtcPay creates a pending payment
    and returns a payment URL for the customer to complete payment.

    Rate limit: 60 requests per minute per IP.
    """
    reference = _generate_reference()
    fee = _compute_fee(payload.amount)
    payment_token = generate_payment_token(reference, payload.amount)

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.payment_link_expiry_minutes
    )

    # Build customer_info JSON from the nested schema
    customer_info = None
    if payload.customer_info:
        customer_info = payload.customer_info.model_dump(exclude_none=True) or None

    payment = Payment(
        merchant_id=merchant.id,
        reference=reference,
        payment_token=payment_token,
        merchant_reference=payload.merchant_reference,
        amount=payload.amount,
        fee=fee,
        currency=payload.currency or settings.default_currency,
        status=PaymentStatus.PENDING,
        description=payload.description,
        customer_info=customer_info,
        callback_url=payload.callback_url or merchant.callback_url,
        return_url=payload.return_url,
        payment_metadata=payload.metadata,
        expires_at=expires_at,
        payment_url=f"{settings.webhook_base_url}/pay/{reference}",
    )

    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return PaymentInitiateResponse(
        payment_id=payment.id,
        reference=payment.reference,
        payment_token=payment.payment_token,
        amount=payment.amount,
        currency=payment.currency,
        status=payment.status,
        payment_url=payment.payment_url,
        created_at=payment.created_at,
    )


@router.get("/{payment_ref}", response_model=PaymentResponse)
async def get_payment(
    payment_ref: str,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    """
    Get details of a specific payment by reference.

    Merchants can only access their own payments.
    """
    result = await db.execute(
        select(Payment).where(
            Payment.reference == payment_ref,
            Payment.merchant_id == merchant.id,
        )
    )
    payment = result.scalar_one_or_none()

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    return PaymentResponse.model_validate(payment)


@router.get("", response_model=PaymentListResponse)
async def list_payments(
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    payment_status: PaymentStatus | None = Query(default=None, alias="status"),
):
    """
    List all payments for the authenticated merchant.

    Supports pagination and optional status filtering.
    """
    base_query = select(Payment).where(Payment.merchant_id == merchant.id)

    if payment_status is not None:
        base_query = base_query.where(Payment.status == payment_status)

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Fetch page
    offset = (page - 1) * page_size
    result = await db.execute(
        base_query.order_by(Payment.created_at.desc()).offset(offset).limit(page_size)
    )
    payments = result.scalars().all()

    return PaymentListResponse(
        payments=[PaymentResponse.model_validate(p) for p in payments],
        total_count=total,
        page=page,
        page_size=page_size,
    )
