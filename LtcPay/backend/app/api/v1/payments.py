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
from app.core.security import get_current_merchant, get_optional_merchant, generate_payment_token
from app.models.merchant import Merchant, FeeBearer
from app.models.payment import Payment, PaymentStatus, PaymentMode, PaymentMethod, PaymentProvider
from app.schemas.payment import (
    PaymentInitiate,
    PaymentInitiateResponse,
    PaymentResponse,
    PaymentListResponse,
)
from app.schemas.country import PublicCountryInfo, PublicOperatorInfo
from app.core.velocity import PaymentVelocityError, record_payment_failure
from app.services.touchpay_direct_service import (
    touchpay_direct_service, TouchPayDirectError, OperatorMismatchError,
    friendly_initiation_error, is_customer_error,
)
from app.services.stripe_service import stripe_service, StripeServiceError
from app.services.country_service import country_service
from app.services.provider_service import ProviderRoutingError, provider_service
from app.services.payment_router import initiate_mobile_payment
from app.services.enkap_service import enkap_service, EnkapError

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
    include_unavailable: bool = False,
    db: AsyncSession = Depends(get_db),
    merchant: Merchant | None = Depends(get_optional_merchant),
):
    """List countries available for payments.

    If authenticated with merchant API keys, filters by merchant restrictions.
    Returns active countries with their active operators. With
    include_unavailable=true, temporarily disabled operators are included
    too, flagged with available=false, so partner UIs can grey them out
    instead of hiding them.
    """
    merchant_id = merchant.id if merchant else None
    countries = await country_service.get_available_countries(db, merchant_id=merchant_id)

    result = []
    for c in countries:
        # The same operator may exist once per provider (e.g. MTN via
        # TouchPay and via AccountPE). Merchants see one entry per operator:
        # available if ANY provider serves it; display fields from the
        # first active row.
        by_code: dict[str, PublicOperatorInfo] = {}
        for op in (c.operators or []):
            existing = by_code.get(op.operator_code)
            if existing is not None and (existing.available or not op.is_active):
                continue
            by_code[op.operator_code] = PublicOperatorInfo(
                code=op.operator_code,
                name=op.operator_name,
                color=op.color,
                logo_url=op.logo_url or "",
                min_amount=op.min_amount,
                max_amount=op.max_amount,
                ussd_code=op.ussd_code,
                phone_prefixes=list(op.phone_prefixes or []),
                available=bool(op.is_active),
            )
        ops = [
            o for o in sorted(by_code.values(), key=lambda o: o.code)
            if (o.available or include_unavailable)
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
            enforce_phone_prefix_check=bool(getattr(c, "enforce_phone_prefix_check", True)),
            operators=ops,
        ))
    return result


@router.get("/me")
async def get_merchant_info(
    merchant: Merchant = Depends(get_current_merchant),
):
    """Return the authenticated merchant's public configuration (fee rate, fee bearer, etc.)."""
    return {
        "merchant_id": str(merchant.id),
        "name": merchant.name,
        "email": merchant.email,
        "fee_rate": float(merchant.fee_rate),
        "fee_bearer": merchant.fee_bearer.value if hasattr(merchant.fee_bearer, "value") else str(merchant.fee_bearer),
        "default_payment_mode": merchant.default_payment_mode.value if hasattr(merchant.default_payment_mode, "value") else str(merchant.default_payment_mode),
        "is_active": merchant.is_active,
    }


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
    # - payment_method == BANK_CARD -> CARD-group routing per country
    #   (country_providers priority; legacy fallback: Stripe), REDIRECT mode
    #   for hosted-page providers (E-nkap), STRIPE mode for PaymentIntents.
    # - Otherwise -> mobile money (SDK or DIRECT_API), provider decided by
    #   the mobile routing at initiation time.
    provider = PaymentProvider.TOUCHPAY
    if payload.payment_method == PaymentMethod.BANK_CARD:
        card_candidates = await provider_service.resolve_card_providers(
            db, payload.country,
        )
        card_candidates = provider_service.apply_merchant_prefs(
            card_candidates, merchant, "CARD", payload.country,
        )
        provider = None
        for candidate in card_candidates:
            if candidate.code == "ENKAP":
                cfg = provider_service.decrypted_config(candidate)
                if cfg.get("consumer_key") and cfg.get("consumer_secret"):
                    provider = PaymentProvider.ENKAP
                    payment_mode = PaymentMode.REDIRECT
                    break
            elif candidate.code == "STRIPE" and stripe_service.is_configured:
                provider = PaymentProvider.STRIPE
                payment_mode = PaymentMode.STRIPE
                break
        if provider is None:
            if stripe_service.is_configured:
                provider = PaymentProvider.STRIPE
                payment_mode = PaymentMode.STRIPE
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Aucun fournisseur de paiement par carte disponible"
                           + (f" pour le pays '{payload.country}'." if payload.country else "."),
                )
    elif payload.payment_mode:
        payment_mode = payload.payment_mode
    elif payload.operator and payload.customer_phone:
        payment_mode = PaymentMode.DIRECT_API
    else:
        payment_mode = PaymentMode.SDK

    # --- Resolve country ---
    country_code = None
    country_obj = None

    if provider == PaymentProvider.ENKAP and payload.country:
        # Card routing already picked E-nkap from this country's providers.
        country_code = payload.country.upper()
        country_obj = await country_service.get_active_country(db, country_code)

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

        # `is not None`, not truthiness: an operator limit set to 0 (no
        # minimum / no cap) must win over the country limit, not fall back
        max_amount = op_max if op_max is not None else country_obj.max_amount
        min_amount = op_min if op_min is not None else country_obj.min_amount
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

    # Currency: use explicit value, else country default, else global default
    currency = payload.currency
    if not currency and country_obj:
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

    # For E-nkap provider (hosted card page), create the order and hand the
    # merchant the redirect URL as payment_url. On E-nkap failure, fail over
    # to Stripe when it is configured.
    if provider == PaymentProvider.ENKAP:
        enkap_provider = await provider_service.get_provider(db, "ENKAP")
        info = customer_info or {}
        try:
            order = await enkap_service.create_order(
                enkap_provider,
                payment_reference=reference,
                amount=int(customer_amount),
                currency=currency,
                customer_name=info.get("name"),
                customer_email=info.get("email"),
                customer_phone=info.get("phone"),
                description=payload.description,
                # ALWAYS our status page: E-nkap redirects to returnUrl even
                # on FAILURE, so the merchant success page must never be it.
                return_url=f"{settings.webhook_base_url}/pay/{reference}/return",
                notification_url=f"{settings.webhook_base_url}/api/v1/callbacks/enkap",
                country_phone_prefix=country_obj.phone_prefix if country_obj else "237",
            )
            payment.provider_transaction_id = order["txid"]
            payment.payment_url = order["redirect_url"]
            payment.direct_api_data = {
                "provider": "ENKAP",
                "txid": order["txid"],
                "redirect_url": order["redirect_url"],
                "raw": order["raw"],
            }
            await db.commit()
            await db.refresh(payment)
        except EnkapError as exc:
            if stripe_service.is_configured:
                logger.warning(
                    "E-nkap failed for %s (%s) — failing over to Stripe", reference, exc,
                )
                provider = PaymentProvider.STRIPE
                payment.provider = provider
                payment.payment_mode = PaymentMode.STRIPE
                payment.direct_api_data = {
                    "failover_trail": [{"provider": "ENKAP", "error": str(exc)}],
                }
                await db.commit()
            else:
                logger.error("E-nkap initiation failed for %s: %s", reference, exc)
                payment.status = PaymentStatus.FAILED
                payment.direct_api_data = {"error": str(exc), "raw": exc.raw_response}
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"E-nkap payment creation failed: {exc}",
                )

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
        try:
            provider_used, direct_response = await initiate_mobile_payment(
                db=db,
                payment=payment,
                reference=reference,
                amount=int(customer_amount),
                phone_number=payload.customer_phone,
                operator_code=payload.operator,
                country_code=country_code,
                customer_info=customer_info,
                description=payload.description,
                merchant=merchant,
            )
            payment.provider = PaymentProvider(provider_used)
            payment.direct_api_data = direct_response
            payment.status = PaymentStatus.PROCESSING
            await db.commit()
            await db.refresh(payment)
        except ProviderRoutingError as exc:
            logger.warning("No provider for %s: %s", reference, exc)
            payment.status = PaymentStatus.FAILED
            payment.direct_api_data = {"error": "no_provider_available", "detail": str(exc)}
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            )
        except OperatorMismatchError as exc:
            logger.info("Operator mismatch on creation for %s: %s", reference, exc)
            payment.status = PaymentStatus.FAILED
            payment.direct_api_data = {"error": "operator_mismatch", "detail": str(exc)}
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            )
        except PaymentVelocityError as exc:
            logger.warning("Velocity limit on creation for %s: %s", reference, exc)
            payment.status = PaymentStatus.FAILED
            payment.direct_api_data = {"error": "velocity_limit", "detail": str(exc)}
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Trop de tentatives pour ce numero. Reessayez dans 30 minutes.",
            )
        except TouchPayDirectError as exc:
            customer_caused = is_customer_error(exc)
            logger.log(
                logging.INFO if customer_caused else logging.ERROR,
                "Direct API initiation %s for %s: %s",
                "rejected" if customer_caused else "failed", reference, exc,
            )
            payment.status = PaymentStatus.FAILED
            payment.direct_api_data = {"error": str(exc), "raw": exc.raw_response}
            await db.commit()
            if not customer_caused:
                record_payment_failure(reference)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=friendly_initiation_error(exc),
            )

    return PaymentInitiateResponse(
        payment_id=payment.id,
        reference=payment.reference,
        payment_token=payment.payment_token,
        amount=payment.amount,
        fee=payment.fee,
        fee_bearer=merchant.fee_bearer.value if hasattr(merchant.fee_bearer, "value") else str(merchant.fee_bearer),
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

    # E-nkap has no trustworthy webhook: merchants poll this endpoint, so a
    # pending hosted-page payment is re-verified live against the E-nkap
    # status API (the guide's recommended reconciliation path).
    if (
        payment.provider == PaymentProvider.ENKAP
        and payment.status in (PaymentStatus.PENDING, PaymentStatus.PROCESSING)
    ):
        from app.api.v1.endpoints.enkap_callbacks import verify_and_settle
        await verify_and_settle(db, payment)

    resp = PaymentResponse.model_validate(payment)
    resp.fee_bearer = merchant.fee_bearer.value if hasattr(merchant.fee_bearer, "value") else str(merchant.fee_bearer)
    return resp


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
