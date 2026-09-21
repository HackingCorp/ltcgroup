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
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update as sa_update

from app.core.database import get_db
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import (
    get_current_merchant, get_optional_merchant, get_verified_merchant,
    generate_payment_token,
)
from app.models.country import (
    CountryOperator, MerchantOperatorRate, SupportedCountry,
)
from app.models.merchant import Merchant, FeeBearer
from app.models.payment import Payment, PaymentStatus, PaymentMode, PaymentMethod, PaymentProvider
from app.schemas.payment import (
    PaymentInitiate,
    PaymentInitiateResponse,
    PaymentResponse,
    PaymentListResponse,
)
from app.schemas.country import PublicCountryInfo, PublicOperatorInfo
from app.core.velocity import (
    PaymentVelocityError, record_payment_failure, velocity_lockout_message,
)
from app.services.touchpay_direct_service import (
    touchpay_direct_service, TouchPayDirectError, OperatorMismatchError,
    friendly_initiation_error, is_customer_error, duplicate_retry_after,
)
from app.services.stripe_service import stripe_service, StripeServiceError
from app.services.country_service import country_service
from app.services.provider_service import ProviderRoutingError, provider_service
from app.services.payment_router import initiate_mobile_payment, extract_transaction_ids
from app.services.enkap_service import enkap_service, EnkapError
from app.services.failure_reasons import classify_failure, extract_operator_reference

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Merchant Payments"])


def _generate_reference() -> str:
    """Generate a unique payment reference."""
    return f"PAY-{uuid.uuid4().hex[:16].upper()}"


# Card payments cost more at the PSPs (E-nkap/flocash ~4.3%): platform-wide
# minimum fee rate for BANK_CARD, applied on top of the merchant's own rate.
CARD_MIN_FEE_RATE = Decimal("5")


def effective_card_rate(merchant) -> Decimal:
    """Card fee rate for a merchant: their card rate (or base rate), floored
    at the platform card minimum."""
    base = getattr(merchant, "fee_rate_card", None) or merchant.fee_rate
    return max(Decimal(base), CARD_MIN_FEE_RATE)


def effective_mobile_rate(merchant, floor: Decimal | None = None) -> Decimal:
    """Mobile Money rate for a merchant, floored at the operator's minimum.

    Mobile costs are not one rate: TouchPay takes 1.5% in Cameroon but 4% on
    Congo Airtel, while a merchant carries a single rate. Without the floor,
    every country above the merchant's rate is sold at a loss — measured at
    -10 070 XAF over 30 days in Congo alone. The floor comes from the
    operator row: its `min_fee_rate`, or failing that the `provider_fee_rate`
    it costs us, so a known cost is never undersold for want of a setting.
    """
    base = Decimal(merchant.fee_rate)
    return max(base, Decimal(floor)) if floor is not None else base


#: Floor billed for an operator: the rate set for it, and failing that what
#: the provider charges us — so an operator whose cost is known is never
#: sold below it just because nobody set a rate. Null on both = no floor.
_OPERATOR_FLOOR = func.coalesce(
    CountryOperator.min_fee_rate, CountryOperator.provider_fee_rate,
)


async def merchant_negotiated_rate(
    db: AsyncSession, merchant, country_code: str | None, operator_code: str | None,
) -> Decimal | None:
    """Rate agreed with this merchant for a country, or None if there is none.

    A row naming the operator wins over a country-wide one. The rate is used
    as agreed, floor included: it is an explicit commercial decision, so it
    must be what gets billed rather than something the platform overrides —
    the admin screen flags one set below the provider's own cost.
    """
    if not country_code:
        return None
    rows = (await db.execute(
        select(
            MerchantOperatorRate.operator_code,
            MerchantOperatorRate.fee_rate,
        ).where(
            MerchantOperatorRate.merchant_id == merchant.id,
            MerchantOperatorRate.country_code == country_code.upper(),
            or_(
                MerchantOperatorRate.operator_code.is_(None),
                MerchantOperatorRate.operator_code == (
                    operator_code.upper() if operator_code else None
                ),
            ),
        )
    )).all()
    if not rows:
        return None
    # Operator-specific first, country-wide as the fallback.
    by_specificity = sorted(rows, key=lambda r: r[0] is None)
    return Decimal(by_specificity[0][1])


async def mobile_rate_floor(
    db: AsyncSession, country_code: str | None, operator_code: str | None,
) -> Decimal | None:
    """Billing floor for a country/operator pair, or None when unknown.

    With no operator — the customer has not chosen one yet on the checkout —
    the highest floor in the country is used: the payment is priced before
    that choice, and pricing it below the dearest operator would sell that
    operator at a loss. The checkout narrows it down once the customer picks.
    """
    if not country_code:
        return None
    query = select(func.max(_OPERATOR_FLOOR)).where(
        CountryOperator.country_code == country_code.upper(),
        CountryOperator.is_active == True,  # noqa: E712
        _OPERATOR_FLOOR.isnot(None),
    )
    if operator_code:
        query = query.where(CountryOperator.operator_code == operator_code.upper())
    return (await db.execute(query)).scalar()


async def _negotiated_rates(
    db: AsyncSession, merchant,
) -> dict[tuple[str, str | None], Decimal]:
    """Every rate agreed with this merchant, keyed by (country, operator).

    One query, for the listings that price a whole catalogue at once.
    """
    return {
        (cc, oc): Decimal(rate)
        for cc, oc, rate in (await db.execute(
            select(
                MerchantOperatorRate.country_code,
                MerchantOperatorRate.operator_code,
                MerchantOperatorRate.fee_rate,
            ).where(MerchantOperatorRate.merchant_id == merchant.id)
        )).all()
    }


async def resolve_mobile_rate(
    db: AsyncSession, merchant, country_code: str | None, operator_code: str | None,
) -> Decimal:
    """The Mobile Money rate actually billed, all rules applied.

    A rate negotiated for this merchant on this country (and possibly this
    operator) wins outright. Otherwise the merchant's own rate applies,
    lifted to the operator's floor. Every path that prices a Mobile Money
    payment goes through here so they cannot drift apart.
    """
    agreed = await merchant_negotiated_rate(db, merchant, country_code, operator_code)
    if agreed is not None:
        return agreed
    return effective_mobile_rate(
        merchant, await mobile_rate_floor(db, country_code, operator_code),
    )


# Currencies with no minor unit (ISO 4217 exponent 0). Every currency LtcPay
# settles in Central and West Africa is one of these; only EUR/USD, reachable
# through Stripe, have cents.
ZERO_DECIMAL_CURRENCIES = {
    "XAF", "XOF", "XPF", "GNF", "UGX", "CDF", "BIF", "DJF", "KMF", "RWF",
    "CLP", "ISK", "JPY", "KRW", "PYG", "VND", "VUV",
}


def money_step(currency: str | None) -> Decimal:
    """Smallest real unit of a currency: 1 XAF, 0.01 EUR."""
    return Decimal("1") if (currency or "XAF").upper() in ZERO_DECIMAL_CURRENCIES else Decimal("0.01")


def _compute_fee(amount: Decimal, fee_rate: Decimal, currency: str | None = None) -> Decimal:
    """Compute merchant fee, rounded to a unit the currency actually has.

    XAF has no centimes: a 34.12 fee produced a 1984.12 total that we then
    sent to TouchPay as int(1984.12) = 1984. The customer paid 1984 while our
    books — and the merchant balance computed from them — recorded 1984.12.
    """
    raw = amount * fee_rate / Decimal("100")
    return raw.quantize(money_step(currency), rounding=ROUND_HALF_UP)


async def record_initiation_outcome(
    db: AsyncSession,
    payment: Payment,
    *,
    status_if_pending: PaymentStatus,
    values: dict | None = None,
) -> bool:
    """Write an initiation result without ever overwriting a callback verdict.

    TouchPay can call back while the initiation request is still running —
    on 2026-08-24 the callback landed at 14:26:42 with the failover still in
    flight at 14:26:43. Assigning onto the ORM object and committing, as this
    endpoint used to, would then push a settled payment back to PROCESSING
    (or mark FAILED one the operator had just confirmed). The callback
    handler updates atomically on the expected status; so does this now.

    Returns True when this call is the one that decided the status.
    """
    result = await db.execute(
        sa_update(Payment)
        .where(Payment.id == payment.id, Payment.status == PaymentStatus.PENDING)
        .values(status=status_if_pending, **(values or {}))
        .returning(Payment.id)
    )
    decided = result.first() is not None

    if not decided:
        # A callback got there first: its verdict is the operator's, ours is
        # only what our own request saw. Keep theirs, backfill the provider.
        logger.warning(
            "Initiation outcome %s for %s dropped: already settled by a callback",
            status_if_pending.value, payment.reference,
        )
        if (values or {}).get("provider"):
            await db.execute(
                sa_update(Payment)
                .where(Payment.id == payment.id, Payment.provider.is_(None))
                .values(provider=values["provider"])
            )

    await db.commit()
    await db.refresh(payment)
    return decided


def reprice_for_method(
    payment, merchant, method: str, mobile_rate: Decimal | None = None,
) -> tuple[Decimal, Decimal]:
    """Recompute (amount, fee) for the method the customer actually picked.

    A payment is created before the customer chooses mobile or card on the
    checkout, so its fee reflects the mobile rate. Rates differ per method:
    when the customer switches, the fee — and, for CLIENT-borne fees, the
    total charged — must follow. Derives the net base from the stored
    values, so calling it repeatedly or switching back and forth is stable.

    `mobile_rate` is the rate resolved for the operator the customer chose
    (see resolve_mobile_rate) and is used as given — a rate negotiated below
    the merchant's own must not be lifted back up. Without it, the mobile
    rate is the merchant's own.
    """
    amount = Decimal(payment.amount)
    fee = Decimal(payment.fee or 0)
    client_borne = str(getattr(merchant.fee_bearer, "value", merchant.fee_bearer)) == "CLIENT"
    base = (amount - fee) if client_borne else amount
    if base <= 0:
        base = amount
    if method == "CARD":
        rate = effective_card_rate(merchant)
    elif mobile_rate is not None:
        rate = Decimal(mobile_rate)
    else:
        rate = Decimal(merchant.fee_rate)
    new_fee = _compute_fee(base, rate, payment.currency)
    new_amount = (base + new_fee) if client_borne else base
    step = money_step(payment.currency)
    return new_amount.quantize(step, rounding=ROUND_HALF_UP), new_fee


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

    # Billed rate per operator, in one query: the floor is per country and
    # operator, so quoting the merchant's base rate everywhere would
    # understate what Congo or Mali actually cost them.
    floors: dict[tuple[str, str], Decimal] = {}
    agreed: dict[tuple[str, str | None], Decimal] = {}
    if merchant is not None:
        floors = {
            (cc, oc): floor
            for cc, oc, floor in (await db.execute(
                select(
                    CountryOperator.country_code,
                    CountryOperator.operator_code,
                    func.max(_OPERATOR_FLOOR),
                )
                .where(CountryOperator.is_active == True)  # noqa: E712
                .group_by(CountryOperator.country_code, CountryOperator.operator_code)
            )).all()
            if floor is not None
        }
        agreed = await _negotiated_rates(db, merchant)

    def _billed_rate(country_code: str, operator_code: str) -> float:
        negotiated = (
            agreed.get((country_code, operator_code))
            or agreed.get((country_code, None))
        )
        if negotiated is not None:
            return float(negotiated)
        return float(effective_mobile_rate(
            merchant, floors.get((country_code, operator_code)),
        ))

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
                fee_rate=(
                    _billed_rate(c.code, op.operator_code)
                    if merchant is not None else None
                ),
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
    db: AsyncSession = Depends(get_db),
):
    """Return the authenticated merchant's public configuration (fee rate, fee bearer, etc.).

    fee_rates gives the EFFECTIVE rate per payment method for this merchant:
    card payments carry a platform-wide minimum (card_min_fee_rate), so
    fee_rates.BANK_CARD = max(fee_rate, card_min_fee_rate) while
    fee_rates.MOBILE_MONEY is the merchant's own rate. Use these to display
    fees to your customer before creating the payment.

    mobile_rates_by_country lists the countries where Mobile Money costs more
    than that base rate — the provider charges more there, so a floor applies.
    A country absent from it bills at fee_rates.MOBILE_MONEY.
    """
    base_rate = float(merchant.fee_rate)
    floors = (await db.execute(
        select(
            CountryOperator.country_code,
            CountryOperator.operator_code,
            _OPERATOR_FLOOR,
        ).where(
            CountryOperator.is_active == True,  # noqa: E712
            _OPERATOR_FLOOR > Decimal(merchant.fee_rate),
        )
    )).all()
    by_country: dict[str, dict[str, float]] = {}
    for country_code, operator_code, floor in floors:
        by_country.setdefault(country_code, {})[operator_code] = float(floor)

    return {
        "merchant_id": str(merchant.id),
        "name": merchant.name,
        "email": merchant.email,
        "fee_rate": base_rate,
        "fee_rates": {
            "MOBILE_MONEY": base_rate,
            "BANK_CARD": float(effective_card_rate(merchant)),
        },
        "mobile_rates_by_country": by_country,
        "card_min_fee_rate": float(CARD_MIN_FEE_RATE),
        "fee_bearer": merchant.fee_bearer.value if hasattr(merchant.fee_bearer, "value") else str(merchant.fee_bearer),
        "default_payment_mode": merchant.default_payment_mode.value if hasattr(merchant.default_payment_mode, "value") else str(merchant.default_payment_mode),
        "is_active": merchant.is_active,
    }


@router.get("/fees")
async def get_fee_schedule(
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    """The exact percentage billed on every operator, for this merchant.

    Mobile Money does not cost the same everywhere — the provider charges
    more in some countries and on some operators — so one rate cannot
    describe what a payment will cost. This lists every active operator
    with the rate that will actually be applied, which is what to quote to
    a customer before creating the payment.

    `fee_bearer` says who pays it: CLIENT means the fee is added on top and
    the customer pays amount + fee, MERCHANT that it is deducted from the
    amount and the customer pays exactly what you asked for.
    """
    rows = (await db.execute(
        select(
            CountryOperator.country_code,
            CountryOperator.operator_code,
            func.max(_OPERATOR_FLOOR),
        )
        .join(
            SupportedCountry,
            SupportedCountry.code == CountryOperator.country_code,
        )
        .where(
            CountryOperator.is_active == True,  # noqa: E712
            SupportedCountry.is_active == True,  # noqa: E712
        )
        .group_by(CountryOperator.country_code, CountryOperator.operator_code)
        .order_by(CountryOperator.country_code, CountryOperator.operator_code)
    )).all()

    agreed = await _negotiated_rates(db, merchant)
    allowed = {
        c.code for c in
        await country_service.get_available_countries(db, merchant_id=merchant.id)
    }
    mobile: dict[str, dict[str, float]] = {}
    for country_code, operator_code, floor in rows:
        if country_code not in allowed:
            continue
        negotiated = (
            agreed.get((country_code, operator_code))
            or agreed.get((country_code, None))
        )
        mobile.setdefault(country_code, {})[operator_code] = float(
            negotiated if negotiated is not None
            else effective_mobile_rate(merchant, floor)
        )

    bearer = getattr(merchant.fee_bearer, "value", merchant.fee_bearer)
    return {
        "fee_bearer": str(bearer),
        "base_rate": float(merchant.fee_rate),
        "mobile_money": mobile,
        "bank_card": float(effective_card_rate(merchant)),
        "card_min_fee_rate": float(CARD_MIN_FEE_RATE),
    }


@router.post("", response_model=PaymentInitiateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def create_payment(
    request: Request,
    payload: PaymentInitiate,
    merchant: Merchant = Depends(get_verified_merchant),
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
    #   BANK_CARD names the rail, not what the customer ends up paying with:
    #   E-nkap's hosted page also collects Mobile Money.
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

    # Currency: use explicit value, else country default, else global default.
    # Resolved before the fee so both can be rounded to a unit the currency
    # actually has — XAF has no centimes.
    currency = payload.currency
    if not currency and country_obj:
        currency = country_obj.currency
    currency = currency or settings.default_currency

    base_amount = payload.amount
    if payload.payment_method == PaymentMethod.BANK_CARD:
        effective_fee_rate = effective_card_rate(merchant)
    else:
        effective_fee_rate = await resolve_mobile_rate(
            db, merchant, country_code, payload.operator,
        )
    fee = _compute_fee(base_amount, effective_fee_rate, currency)

    # If customer bears the fee, add it to the amount they pay
    step = money_step(currency)
    if merchant.fee_bearer == FeeBearer.CLIENT:
        customer_amount = (base_amount + fee).quantize(step, rounding=ROUND_HALF_UP)
    else:
        customer_amount = base_amount.quantize(step, rounding=ROUND_HALF_UP)

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

    # The currency has to be one the provider that will handle this payment
    # can actually settle. LtcPay converts nothing: mobile providers take a
    # bare integer read in the country's own currency, and E-nkap only knows
    # XAF — so an unchecked "EUR" would collect that many XAF instead of
    # failing, losing ~99% of the payment in silence.
    provider_row = (
        await provider_service.get_provider(db, provider.value) if provider else None
    )
    allowed_currencies = provider_service.supported_currencies(
        provider.value if provider else "TOUCHPAY",
        country_obj.currency if country_obj else None,
        provider_row,
    )
    if allowed_currencies and currency not in allowed_currencies:
        supported = sorted(allowed_currencies)
        where = f" pour le pays '{country_code}'" if country_code else ""
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "detail": (
                    f"Le fournisseur {provider.value if provider else 'mobile'} "
                    f"n'accepte que {', '.join(supported)}{where}. "
                    f"Convertissez le montant en {supported[0]} avant l'envoi : "
                    "LtcPay n'effectue aucune conversion de devise."
                ),
                "failure_code": "CURRENCY_NOT_SUPPORTED",
                "supported_currencies": supported,
            },
        )

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
        display_amount=payload.display_amount,
        display_currency=payload.display_currency,
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

    # For E-nkap, create the order and hand the merchant the redirect URL as
    # payment_url. The page is not card-only: the customer picks a card or a
    # Mobile Money wallet, and their country, there — which is why nothing
    # below varies by method. On E-nkap failure, fail over to Stripe when it
    # is configured (Stripe IS card-only, so that failover narrows what the
    # customer can pay with).
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
            await record_initiation_outcome(
                db, payment,
                status_if_pending=PaymentStatus.PROCESSING,
                values={
                    "provider": PaymentProvider(provider_used),
                    "direct_api_data": direct_response,
                    **extract_transaction_ids(direct_response),
                },
            )
        except ProviderRoutingError as exc:
            logger.warning("No provider for %s: %s", reference, exc)
            await record_initiation_outcome(
                db, payment, status_if_pending=PaymentStatus.FAILED,
                values={"direct_api_data": {"error": "no_provider_available", "detail": str(exc)}},
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            )
        except OperatorMismatchError as exc:
            logger.info("Operator mismatch on creation for %s: %s", reference, exc)
            await record_initiation_outcome(
                db, payment, status_if_pending=PaymentStatus.FAILED,
                values={"direct_api_data": {"error": "operator_mismatch", "detail": str(exc)}},
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            )
        except PaymentVelocityError as exc:
            logger.warning("Velocity limit on creation for %s: %s", reference, exc)
            await record_initiation_outcome(
                db, payment, status_if_pending=PaymentStatus.FAILED,
                values={"direct_api_data": {"error": "velocity_limit", "detail": str(exc)}},
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=velocity_lockout_message(exc.retry_after),
                headers={"Retry-After": str(exc.retry_after)},
            )
        except TouchPayDirectError as exc:
            customer_caused = is_customer_error(exc)
            logger.log(
                logging.INFO if customer_caused else logging.ERROR,
                "Direct API initiation %s for %s: %s",
                "rejected" if customer_caused else "failed", reference, exc,
            )
            # Keep the operator's own reference reachable: it is what Orange
            # support needs, and it would otherwise stay buried in the blob.
            await record_initiation_outcome(
                db, payment, status_if_pending=PaymentStatus.FAILED,
                values={
                    "direct_api_data": {"error": str(exc), "raw": exc.raw_response},
                    "operator_transaction_id": extract_operator_reference(str(exc)),
                },
            )
            if not customer_caused:
                record_payment_failure(reference)
            # Blocked by the 5-minute duplicate window: the merchant should
            # back off and retry, not treat it as a gateway outage.
            retry_after = duplicate_retry_after(exc)
            if retry_after:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=friendly_initiation_error(exc),
                    headers={"Retry-After": str(retry_after)},
                )
            # 502 says the provider is broken. When it answered perfectly and
            # the answer was "this customer has no money", that is wrong twice
            # over: the merchant reads an outage where there is none, and most
            # HTTP clients retry 5xx automatically — re-sending a payin the
            # operator already refused, straight into its duplicate window.
            failure_code, _ = classify_failure(str(exc))
            # JSONResponse rather than HTTPException so failure_code sits
            # beside detail instead of nested inside it: detail stays the
            # plain string every existing integration already reads.
            return JSONResponse(
                status_code=(
                    status.HTTP_402_PAYMENT_REQUIRED if customer_caused
                    else status.HTTP_502_BAD_GATEWAY
                ),
                content={
                    "detail": friendly_initiation_error(exc),
                    "failure_code": failure_code,
                    "operator_reference": extract_operator_reference(str(exc)),
                },
            )

    return PaymentInitiateResponse(
        payment_id=payment.id,
        reference=payment.reference,
        payment_token=payment.payment_token,
        amount=payment.amount,
        fee=payment.fee,
        fee_bearer=merchant.fee_bearer.value if hasattr(merchant.fee_bearer, "value") else str(merchant.fee_bearer),
        currency=payment.currency,
        display_amount=payment.display_amount,
        display_currency=payment.display_currency,
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
