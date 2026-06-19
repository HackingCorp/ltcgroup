"""
LtcPay Merchant Payment API endpoints.

Authenticated via API key + secret (X-API-Key / X-API-Secret headers).

Endpoints:
  POST   /api/v1/payments          - Create a new payment
  GET    /api/v1/payments/{ref}    - Get payment details by reference
  GET    /api/v1/payments          - List merchant payments (paginated)
  GET    /api/v1/payments/countries - List available countries for payments
"""

import logging
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
from app.models.merchant import Merchant, FeeBearer
from app.models.payment import Payment, PaymentStatus, PaymentMode, PaymentMethod, PaymentProvider
from app.schemas.payment import (
    PaymentInitiate,
    PaymentInitiateResponse,
    PaymentResponse,
    PaymentListResponse,
)
from app.schemas.country import PublicCountryInfo, PublicOperatorInfo
from app.services.touchpay_direct_service import touchpay_direct_service, TouchPayDirectError
from app.services.stripe_service import stripe_service, StripeServiceError
from app.services.country_service import country_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Merchant Payments"])


def _generate_reference() -> str:
    """Generate a unique payment reference."""
    return f"PAY-{uuid.uuid4().hex[:16].upper()}"


def _compute_fee(amount: Decimal, fee_rate: Decimal) -> Decimal:
    """Compute merchant fee based on their configured rate."""
    return (amount * fee_rate / Decimal("100")).quantize(Decimal("0.01"))


@router.get("/countries", response_model=list[PublicCountryInfo])
async def list_available_countries(
    request: Request,
    db: AsyncSession = Depends(get_db),
    merchant: Merchant | None = Depends(get_current_merchant),
):
    """List countries available for payments.

    If authenticated with merchant API keys, filters by merchant restrictions.
    Returns active countries with their active operators.
    """
    merchant_id = merchant.id if merchant else None
    countries = await country_service.get_available_countries(db, merchant_id=merchant_id)

    result = []
    for c in countries:
        ops = [
            PublicOperatorInfo(
                code=op.operator_code,
                name=op.operator_name,
                color=op.color,
                logo_url=op.logo_url or "",
                min_amount=op.min_amount,
                max_amount=op.max_amount,
                ussd_code=op.ussd_code,
            )
            for op in (c.operators or []) if op.is_active
        ]
        result.append(PublicCountryInfo(
            code=c.code,
            name=c.name,
            currency=c.currency,
            phone_prefix=c.phone_prefix,
            phone_digits=c.phone_digits,
            phone_pattern=c.phone_pattern,
            flag_emoji=c.flag_emoji,
            min_amount=c.min_amount,
            max_amount=c.max_amount,
            operators=ops,
        ))
    return result


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

    ## Two Integration Modes:

    ### SDK Mode (Web Integration)
    - Use for web applications or when you want customers to choose operator
    - Payment stays PENDING until customer completes on payment page
    - Return payment_url to customer for browser redirect
    - TouchPay SDK handles the payment flow with redirections

    **Example:**
    ```json
    POST /api/v1/payments
    {
      "amount": 5000,
      "currency": "XAF",
      "payment_mode": "SDK"
    }
    ```
    **Response:** Returns `payment_url` - redirect customer to this URL

    ### Direct API Mode (Mobile Integration - Recommended for Apps)
    - Use for mobile apps to avoid browser redirections
    - **IMPORTANT:** Merchant must provide `operator` and `customer_phone`
    - Payment initiated immediately via TouchPay Direct API
    - Customer receives push notification on their mobile money app
    - Poll `/api/v1/payments/{reference}` to check status
    - **NO browser/WebView needed** - pure API integration

    **Example:**
    ```json
    POST /api/v1/payments
    {
      "amount": 5000,
      "currency": "XAF",
      "country": "CM",
      "payment_mode": "DIRECT_API",
      "operator": "MTN",
      "customer_phone": "237670000000"
    }
    ```
    **Response:** Payment immediately in PROCESSING status

    ## Country Detection
    Country is resolved in order: `country` field > auto-detect from `customer_phone` prefix > error.

    Rate limit: 60 requests per minute per IP.
    """
    # Determine provider and payment mode:
    # - payment_method == BANK_CARD -> Stripe provider
    # - Otherwise -> TouchPay provider (SDK or DIRECT_API)
    provider = PaymentProvider.TOUCHPAY
    if payload.payment_method == PaymentMethod.BANK_CARD and stripe_service.is_configured:
        provider = PaymentProvider.STRIPE
        payment_mode = PaymentMode.STRIPE
    elif payload.payment_mode:
        payment_mode = payload.payment_mode
    elif payload.operator and payload.customer_phone:
        payment_mode = PaymentMode.DIRECT_API
    else:
        payment_mode = PaymentMode.SDK

    # --- Resolve country ---
    country_code = None
    country_obj = None

    if provider == PaymentProvider.TOUCHPAY:
        if payload.country:
            country_code = payload.country.upper()
        elif payload.customer_phone:
            detected = await country_service.detect_country_by_phone(db, payload.customer_phone)
            if detected:
                country_code = detected.code
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Impossible de detecter le pays depuis le numero de telephone. Veuillez fournir le champ 'country'.",
                )
        else:
            # SDK mode without phone -- try to get the only available country
            available = await country_service.get_available_countries(db, merchant_id=merchant.id)
            if len(available) == 1:
                country_code = available[0].code
            elif not available:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Aucun pays actif disponible pour ce marchand.",
                )
            # If multiple countries, country will be resolved at checkout

        # Validate country availability for this merchant
        if country_code:
            if not await country_service.is_country_available(db, country_code, merchant.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Le pays '{country_code}' n'est pas disponible pour ce marchand.",
                )
            country_obj = await country_service.get_active_country(db, country_code)

            # Validate operator if provided
            if payload.operator:
                if not await country_service.is_operator_available(
                    db, country_code, payload.operator, merchant.id,
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"L'operateur '{payload.operator}' n'est pas disponible pour le pays '{country_code}'.",
                    )

    reference = _generate_reference()
    base_amount = payload.amount
    fee = _compute_fee(base_amount, merchant.fee_rate)

    # If customer bears the fee, add it to the amount they pay
    if merchant.fee_bearer == FeeBearer.CLIENT:
        customer_amount = base_amount + fee
    else:
        customer_amount = base_amount

    # Transaction limit: use operator-specific limits, fallback to country
    if provider == PaymentProvider.TOUCHPAY and country_obj:
        op_min = None
        op_max = None
        if payload.operator and country_code:
            operators = await country_service.get_active_operators(db, country_code)
            op_obj = next((o for o in operators if o.operator_code == payload.operator.upper()), None)
            if op_obj:
                op_min = op_obj.min_amount
                op_max = op_obj.max_amount

        max_amount = op_max or country_obj.max_amount
        min_amount = op_min or country_obj.min_amount
        op_label = payload.operator or "Mobile Money"

        if customer_amount < Decimal(str(min_amount)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Le montant minimum par transaction {op_label} est de {min_amount:,} {country_obj.currency}.",
            )
        if customer_amount > Decimal(str(max_amount)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Le montant maximum par transaction {op_label} pour {country_obj.name} est de {max_amount:,} {country_obj.currency} (frais compris). Utilisez payment_method: BANK_CARD pour les montants superieurs.",
            )

    # Currency: use country currency if not explicitly provided
    currency = payload.currency
    if country_obj and not payload.currency:
        currency = country_obj.currency
    currency = currency or settings.default_currency

    payment_token = generate_payment_token(reference, customer_amount)

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.payment_link_expiry_minutes
    )

    # Build customer_info JSON from the nested schema
    customer_info = None
    if payload.customer_info:
        customer_info = payload.customer_info.model_dump(exclude_none=True) or None
    # If Direct API provides customer_phone, ensure it's in customer_info
    if payload.customer_phone:
        customer_info = customer_info or {}
        customer_info.setdefault("phone", payload.customer_phone)

    payment = Payment(
        merchant_id=merchant.id,
        reference=reference,
        payment_token=payment_token,
        merchant_reference=payload.merchant_reference,
        amount=customer_amount,
        fee=fee,
        currency=currency,
        country=country_code,
        status=PaymentStatus.PENDING,
        payment_mode=payment_mode,
        provider=provider,
        method=payload.payment_method,
        operator=payload.operator,
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

    # For Stripe provider, create a PaymentIntent
    if provider == PaymentProvider.STRIPE:
        try:
            customer_email = (customer_info or {}).get("email")
            intent_result = await stripe_service.create_payment_intent(
                amount=int(customer_amount),
                currency=currency,
                payment_reference=reference,
                customer_email=customer_email,
                description=payload.description,
            )
            payment.stripe_payment_intent_id = intent_result["id"]
            payment.stripe_client_secret = intent_result["client_secret"]
            payment.stripe_data = intent_result
            await db.commit()
            await db.refresh(payment)
        except StripeServiceError as exc:
            logger.error("Stripe PaymentIntent creation failed for %s: %s", reference, exc)
            payment.status = PaymentStatus.FAILED
            payment.stripe_data = {"error": str(exc)}
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Stripe payment creation failed: {exc}",
            )

    # For Direct API mode, initiate payment with TouchPay immediately
    # ONLY if operator, phone, AND country are provided
    if (
        payment_mode == PaymentMode.DIRECT_API
        and payload.operator
        and payload.customer_phone
        and country_code
    ):
        callback_url = (
            f"{settings.webhook_base_url}/api/v1/callbacks/touchpay-direct"
        )
        try:
            direct_response = await touchpay_direct_service.initiate_payment(
                db=db,
                payment_reference=reference,
                amount=int(customer_amount),
                phone_number=payload.customer_phone,
                operator_code=payload.operator,
                country_code=country_code,
                callback_url=callback_url,
            )
            # Store response and update status to PROCESSING
            payment.direct_api_data = direct_response
            payment.status = PaymentStatus.PROCESSING
            await db.commit()
            await db.refresh(payment)
        except TouchPayDirectError as exc:
            logger.error(
                "Direct API initiation failed for %s: %s", reference, exc
            )
            payment.status = PaymentStatus.FAILED
            payment.direct_api_data = {"error": str(exc), "raw": exc.raw_response}
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Payment initiation failed: {exc}",
            )

    return PaymentInitiateResponse(
        payment_id=payment.id,
        reference=payment.reference,
        payment_token=payment.payment_token,
        amount=payment.amount,
        currency=payment.currency,
        status=payment.status,
        payment_mode=payment.payment_mode,
        country=payment.country,
        payment_url=payment.payment_url,
        stripe_client_secret=payment.stripe_client_secret,
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
