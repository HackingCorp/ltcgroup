"""
LtcPay - Payment Gateway Application
"""
import logging
import re
from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import init_models, async_session
from app.core.rate_limit import limiter
from app.api.v1.router import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Sentry if DSN is configured
if hasattr(settings, 'sentry_dsn') and settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.1 if settings.environment == "production" else 1.0,
        profiles_sample_rate=0.1 if settings.environment == "production" else 1.0,
    )
    logger.info("Sentry monitoring initialized")

BASE_DIR = Path(__file__).resolve().parent


async def create_default_admin():
    """Create a default admin user if none exists."""
    from app.models.admin_user import AdminUser
    from app.api.v1.auth import hash_password

    async with async_session() as db:
        result = await db.execute(select(AdminUser).limit(1))
        if result.scalar_one_or_none() is None:
            admin = AdminUser(
                email="lontsi05@gmail.com",
                password_hash=hash_password("Lontsi05"),
                full_name="Admin LTC",
                role="admin",
            )
            db.add(admin)
            await db.commit()
            logger.info("Default admin account created: lontsi05@gmail.com")


async def seed_payment_providers():
    """Ensure the provider registry has its baseline rows (idempotent).

    Alembic migration 012 seeds existing databases; this covers fresh
    installs bootstrapped via create_all. Every country without provider
    links gets TouchPay as its default so behavior stays unchanged.
    """
    from app.models.provider import CountryProvider, ProviderConfig, ProviderGroup
    from app.models.country import SupportedCountry

    baseline = [
        ("TOUCHPAY", "TouchPay (InTouch)", ProviderGroup.MOBILE, True),
        ("STRIPE", "Stripe", ProviderGroup.CARD, True),
        ("ACCOUNTPE", "AccountPE (Swychr)", ProviderGroup.MOBILE, False),
        ("ENKAP", "E-nkap (Maviance)", ProviderGroup.CARD, False),
    ]
    async with async_session() as db:
        existing = {
            p.code for p in (await db.execute(select(ProviderConfig))).scalars().all()
        }
        for code, name, group, active in baseline:
            if code not in existing:
                db.add(ProviderConfig(
                    code=code, name=name, provider_group=group,
                    is_active=active, config={},
                ))

        linked = {
            cp.country_code
            for cp in (await db.execute(select(CountryProvider))).scalars().all()
            if cp.provider_code == "TOUCHPAY"
        }
        countries = (await db.execute(select(SupportedCountry))).scalars().all()
        for country in countries:
            if country.code not in linked:
                db.add(CountryProvider(
                    country_code=country.code, provider_code="TOUCHPAY",
                    priority=1, is_active=True,
                ))
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    import asyncio as _asyncio

    logger.info("Starting LtcPay...")
    await init_models()
    logger.info("Database tables created")
    await create_default_admin()
    try:
        await seed_payment_providers()
    except Exception as exc:
        logger.warning("Provider seed skipped: %s", exc)
    from app.services.enkap_reconciler import reconciliation_loop
    sweep_task = _asyncio.create_task(reconciliation_loop())
    yield
    sweep_task.cancel()
    logger.info("Shutting down LtcPay...")


# Interactive docs stay on outside production; in production they are served
# only when ENABLE_API_DOCS is explicitly set (partners use the public docs
# site, so the OpenAPI schema is just a map of the API for scanners).
_docs_enabled = settings.environment != "production" or settings.enable_api_docs

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="LtcPay - Payment Gateway with TouchPay Integration",
    lifespan=lifespan,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Global 500 handler — ensures CORS headers are present on unhandled errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s %s — %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# CORS - parse origins from JSON array or comma-separated string
import json
try:
    cors_origins = json.loads(settings.CORS_ORIGINS)
except (json.JSONDecodeError, TypeError):
    cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files with cross-origin headers (needed for logos loaded from other domains)
class CORSStaticFiles(StaticFiles):
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            original_send = send
            async def send_with_cors(message):
                if message["type"] == "http.response.start":
                    headers = list(message.get("headers", []))
                    headers.append((b"access-control-allow-origin", b"*"))
                    headers.append((b"cross-origin-resource-policy", b"cross-origin"))
                    message["headers"] = headers
                await original_send(message)
            await super().__call__(scope, receive, send_with_cors)
        else:
            await super().__call__(scope, receive, send)

app.mount("/static", CORSStaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# API routes
app.include_router(api_router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Payment checkout page -- GET /pay/{reference}
# Serves the HTML page with native form for both SDK and Direct API modes.
# All payments now use TouchPay Direct API with a unified native interface.
# ---------------------------------------------------------------------------
@app.get("/pay/return", response_class=HTMLResponse)
async def payment_return_generic(request: Request, status: str = "", txid: str = ""):
    """Static landing page for hosted payment pages (account-level fallback).

    Used when the PSP portal needs one fixed return URL. Per-payment
    returns go to /pay/{reference}/return; nothing is ever credited here.
    """
    failed = status.upper() in ("FAILED", "CANCELED", "CANCELLED", "EXPIRED")
    return templates.TemplateResponse("payment_return.html", {
        "request": request,
        "variant": "fail" if failed else "success",
        "title": "Paiement non abouti" if failed else "Paiement traité",
        "message": (
            "Le paiement n'a pas abouti (échec, annulation ou session expirée). "
            "Vous pouvez retourner sur la boutique et réessayer."
            if failed else
            "Votre paiement a été transmis. La confirmation définitive vous sera "
            "communiquée par le marchand."
        ),
        "badge_bg": "var(--rose-soft)" if failed else "var(--success-soft)",
        "refresh": False,
        "amount": None, "currency": "", "merchant_name": "", "description": "",
        "reference": "", "merchant_url": "", "retry_url": "",
    })


@app.get("/pay/{reference}", response_class=HTMLResponse)
async def payment_page(reference: str, request: Request):
    """Render the unified payment checkout page.

    Both SDK and Direct API modes now use the same native form with:
    - Operator selection (MTN/Orange)
    - Phone number input
    - Direct API initiation + polling

    The only difference is when operator/phone are provided:
    - Direct API: merchant provides at payment creation → immediate initiation
    - SDK: customer provides on checkout page → initiation on submit
    """
    from app.models.payment import Payment, PaymentStatus, PaymentMode
    from app.models.merchant import Merchant
    from sqlalchemy.orm import selectinload

    async with async_session() as db:
        result = await db.execute(
            select(Payment)
            .options(selectinload(Payment.merchant))
            .where(Payment.reference == reference)
        )
        payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Allow PENDING (new payment) and PROCESSING (Direct API awaiting confirmation)
    if payment.status not in (PaymentStatus.PENDING, PaymentStatus.PROCESSING):
        return templates.TemplateResponse(
            "payment_status.html",
            {
                "request": request,
                "payment": payment,
                "status": payment.status.value,
            },
        )

    from app.services.stripe_service import stripe_service
    from app.services.country_service import country_service

    # Determine which payment tabs to show
    payment_method = payment.method.value if payment.method else None
    stripe_enabled = stripe_service.is_configured

    # Load country context for multi-country checkout
    country_code = payment.country or "CM"
    country_context = {
        "code": country_code,
        "phone_prefix": "237",
        "phone_pattern": "6XX XX XX XX",
        "phone_digits": 9,
        "flag_emoji": "\U0001F1E8\U0001F1F2",
        "currency": payment.currency,
        "enforce_phone_prefix_check": True,
        "operators": [],
    }
    try:
        async with async_session() as db2:
            country = await country_service.get_active_country(db2, country_code)
            # All operators, including disabled ones: the checkout greys
            # them out with an "unavailable" note instead of hiding them.
            # The same operator exists once per provider (TouchPay,
            # AccountPE, ...) — show ONE button per operator_code, counted
            # available if any provider row is active.
            raw_operators = await country_service.get_operators(db2, country_code)
            by_code = {}
            for op in raw_operators:
                existing = by_code.get(op.operator_code)
                if existing is not None and (existing.is_active or not op.is_active):
                    continue
                by_code[op.operator_code] = op
            operators = sorted(by_code.values(), key=lambda o: o.operator_code)
            country_context = {
                "code": country.code,
                "phone_prefix": country.phone_prefix,
                "phone_pattern": country.phone_pattern,
                "phone_digits": country.phone_digits,
                "flag_emoji": country.flag_emoji,
                "currency": country.currency,
                "enforce_phone_prefix_check": bool(getattr(country, "enforce_phone_prefix_check", True)),
                "operators": [
                    {
                        "code": op.operator_code,
                        "name": op.operator_name,
                        "color": op.color,
                        "logo_url": op.logo_url or "",
                        "ussd_code": op.ussd_code,
                        "phone_prefixes": list(op.phone_prefixes or []),
                        "is_active": bool(op.is_active),
                    }
                    for op in operators
                ],
            }
    except Exception as exc:
        logger.warning("Failed to load country context for %s: %s", country_code, exc)

    return templates.TemplateResponse(
        "checkout.html",
        {
            "request": request,
            "payment": payment,
            "merchant": payment.merchant,
            "payment_mode": payment.payment_mode.value,
            "payment_method": payment_method,
            "stripe_enabled": stripe_enabled,
            "stripe_publishable_key": settings.STRIPE_PUBLISHABLE_KEY if stripe_enabled else "",
            "stripe_client_secret": payment.stripe_client_secret or "",
            "country": country_context,
        },
    )


@app.post("/pay/{reference}/create-intent")
async def create_stripe_intent(reference: str, request: Request):
    """Create a Stripe PaymentIntent for the checkout page (lazy creation).

    Called by the JS when the customer switches to the card payment tab,
    if no PaymentIntent exists yet. Creates the intent, updates the payment
    record, and returns the client_secret + publishable_key.
    """
    from app.models.payment import Payment, PaymentStatus, PaymentMode, PaymentProvider
    from app.services.stripe_service import stripe_service, StripeServiceError
    from app.services.provider_service import provider_service
    from app.services.enkap_service import enkap_service, EnkapError
    from sqlalchemy import update as sa_update

    async with async_session() as db:
        result = await db.execute(
            select(Payment).where(Payment.reference == reference)
        )
        payment = result.scalar_one_or_none()

        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        if payment.status not in (PaymentStatus.PENDING,):
            raise HTTPException(
                status_code=400,
                detail=f"Payment is {payment.status.value}, cannot create intent",
            )

        # The customer picked CARD: reprice for the card rate. Fee always
        # follows; for CLIENT-borne fees the charged total follows too
        # (base + card fee) — otherwise the card PSP would collect the
        # mobile-rate total.
        from decimal import Decimal as _Dec
        from app.api.v1.payments import reprice_for_method
        from app.models.merchant import Merchant as _Merchant
        _m = (await db.execute(
            select(_Merchant).where(_Merchant.id == payment.merchant_id)
        )).scalar_one_or_none()
        amount_changed = False
        if _m:
            _new_amount, _new_fee = reprice_for_method(payment, _m, "CARD")
            if _new_amount != _Dec(payment.amount) or _new_fee != _Dec(payment.fee or 0):
                amount_changed = _new_amount != _Dec(payment.amount)
                await db.execute(
                    sa_update(Payment)
                    .where(Payment.id == payment.id)
                    .values(amount=_new_amount, fee=_new_fee)
                )
                await db.commit()
                await db.refresh(payment)

        # Card routing: when the country's card providers rank a hosted-page
        # provider (E-nkap) first, hand the JS a redirect instead of a
        # Stripe intent. Falls through to Stripe on E-nkap failure.
        # Legacy payments may carry no country: resolve it from the customer
        # phone, else from the merchant's single available country.
        from app.services.country_service import country_service
        card_country = payment.country
        if not card_country:
            info_phone = (payment.customer_info or {}).get("phone")
            if info_phone:
                detected = await country_service.detect_country_by_phone(db, info_phone)
                if detected:
                    card_country = detected.code
        if not card_country:
            available = await country_service.get_available_countries(
                db, merchant_id=payment.merchant_id,
            )
            if len(available) == 1:
                card_country = available[0].code
        if not card_country:
            card_country = "CM"  # same legacy fallback as /pay/{ref}/submit
        card_providers = await provider_service.resolve_card_providers(db, card_country)
        from app.models.merchant import Merchant as MerchantModel
        merchant_row = (await db.execute(
            select(MerchantModel).where(MerchantModel.id == payment.merchant_id)
        )).scalar_one_or_none()
        card_providers = provider_service.apply_merchant_prefs(
            card_providers, merchant_row, "CARD", payment.country,
        )
        for cp in card_providers:
            if cp.code != "ENKAP":
                break  # STRIPE ranked first -> classic intent flow below
            cfg = provider_service.decrypted_config(cp)
            if not (cfg.get("consumer_key") and cfg.get("consumer_secret")):
                break
            existing_redirect = (payment.direct_api_data or {}).get("redirect_url")
            attempt = 1
            if payment.provider == PaymentProvider.ENKAP and payment.provider_transaction_id:
                # A previous hosted session exists. Settle if it concluded,
                # reuse it only while it is still open — a FAILED/EXPIRED
                # session's URL just 401s at E-nkap.
                from app.api.v1.endpoints.enkap_callbacks import verify_and_settle
                settled = await verify_and_settle(db, payment)
                if settled not in (PaymentStatus.PENDING, PaymentStatus.PROCESSING):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Payment is {settled.value}, cannot create intent",
                    )
                try:
                    order_state = await enkap_service.check_order_status(
                        cp, txid=payment.provider_transaction_id,
                    )
                except EnkapError:
                    order_state = {"payment_status": None}
                if (
                    existing_redirect
                    and not amount_changed
                    and order_state.get("payment_status") in ("CREATED", "PENDING", "PROCESSING")
                ):
                    return {"redirect_url": existing_redirect}
                # Dead session: open a fresh one. merchantReference must be
                # unique per attempt at E-nkap, so suffix the reference; the
                # /instant webhook strips the suffix to find the payment.
                attempt = len((payment.direct_api_data or {}).get("attempts", [])) + 2
            info = payment.customer_info or {}
            try:
                order = await enkap_service.create_order(
                    cp,
                    payment_reference=reference,
                    merchant_reference=reference if attempt == 1 else f"{reference}-{attempt}",
                    amount=int(payment.amount),
                    currency=payment.currency,
                    customer_name=info.get("name"),
                    customer_email=info.get("email"),
                    customer_phone=info.get("phone"),
                    description=payment.description,
                    # ALWAYS our status page (E-nkap redirects here even on
                    # failure); it links back to the merchant return_url.
                    return_url=f"{settings.webhook_base_url}/pay/{reference}/return",
                    notification_url=f"{settings.webhook_base_url}/api/v1/callbacks/enkap",
                )
            except EnkapError as exc:
                logger.warning(
                    "E-nkap card init failed on checkout for %s (%s) — trying Stripe",
                    reference, exc,
                )
                break
            await db.execute(
                sa_update(Payment)
                .where(Payment.id == payment.id, Payment.status == PaymentStatus.PENDING)
                .values(
                    provider=PaymentProvider.ENKAP,
                    payment_mode=PaymentMode.REDIRECT,
                    country=card_country,
                    provider_transaction_id=order["txid"],
                    direct_api_data={
                        "provider": "ENKAP",
                        "attempts": (payment.direct_api_data or {}).get("attempts", [])
                        + ([{"txid": payment.provider_transaction_id}]
                           if payment.provider_transaction_id else []),
                        "txid": order["txid"],
                        "redirect_url": order["redirect_url"],
                        "raw": order["raw"],
                    },
                )
            )
            await db.commit()
            return {"redirect_url": order["redirect_url"]}

        if not stripe_service.is_configured:
            raise HTTPException(status_code=400, detail="Card payments are not configured")

        # If PaymentIntent already exists, return it
        if payment.stripe_client_secret:
            return {
                "client_secret": payment.stripe_client_secret,
                "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
            }

        # Create a new PaymentIntent
        try:
            customer_email = (payment.customer_info or {}).get("email")
            intent_result = await stripe_service.create_payment_intent(
                amount=int(payment.amount),
                currency=payment.currency,
                payment_reference=reference,
                customer_email=customer_email,
                description=payment.description,
            )
        except StripeServiceError as exc:
            logger.error("Stripe intent creation failed for %s: %s", reference, exc)
            raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")

        # Update payment with Stripe data
        await db.execute(
            sa_update(Payment)
            .where(Payment.id == payment.id, Payment.status == PaymentStatus.PENDING)
            .values(
                provider=PaymentProvider.STRIPE,
                payment_mode=PaymentMode.STRIPE,
                stripe_payment_intent_id=intent_result["id"],
                stripe_client_secret=intent_result["client_secret"],
                stripe_data=intent_result,
            )
        )
        await db.commit()

    return {
        "client_secret": intent_result["client_secret"],
        "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
    }


@app.get("/pay/{reference}/return", response_class=HTMLResponse)
async def payment_return_page(reference: str, request: Request):
    """Landing page after a hosted payment page (E-nkap redirect).

    Never credits anything: it triggers a server-side re-verification for
    E-nkap payments, then shows the real outcome in the checkout's visual
    language. A failed card attempt shows an explicit failure with a retry
    button (the payment link stays open for another attempt).
    """
    from app.models.payment import Payment, PaymentProvider, PaymentStatus
    from app.models.merchant import Merchant as MerchantModel

    async with async_session() as db:
        result = await db.execute(select(Payment).where(Payment.reference == reference))
        payment = result.scalar_one_or_none()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        if payment.provider == PaymentProvider.ENKAP and payment.status in (
            PaymentStatus.PENDING, PaymentStatus.PROCESSING,
        ):
            from app.api.v1.endpoints.enkap_callbacks import verify_and_settle
            await verify_and_settle(db, payment)

        merchant = (await db.execute(
            select(MerchantModel).where(MerchantModel.id == payment.merchant_id)
        )).scalar_one_or_none()

        status_value = payment.status.value
        last_attempt = (payment.touchpay_data or {}).get("last_attempt_status") or ""
        merchant_url = payment.return_url or ""
        merchant_name = merchant.name if merchant else ""
        amount = f"{int(payment.amount):,}".replace(",", "\u202f")
        currency = payment.currency or "XAF"
        description = (payment.description or "")[:60]

    retry_url = ""
    refresh = False
    if status_value == "COMPLETED":
        variant, title = "success", "Paiement confirmé"
        message = "Votre paiement a été confirmé. Merci !"
        badge_bg = "var(--success-soft)"
    elif status_value in ("FAILED", "CANCELLED"):
        variant = "fail" if status_value == "FAILED" else "warn"
        title = "Paiement échoué" if status_value == "FAILED" else "Paiement annulé"
        message = (
            "Le paiement n'a pas abouti. Vous pouvez réessayer ou utiliser "
            "un autre moyen de paiement."
        )
        badge_bg = "var(--rose-soft)" if status_value == "FAILED" else "var(--warn-soft)"
    elif status_value == "EXPIRED":
        variant, title = "warn", "Session expirée"
        message = "La session de paiement a expiré. Relancez le paiement depuis la boutique."
        badge_bg = "var(--warn-soft)"
    elif last_attempt in ("FAILED", "CANCELED", "CANCELLED", "EXPIRED"):
        # Payment still open, but the last hosted attempt concluded badly:
        # say so plainly and offer a fresh attempt.
        variant, title = "fail", "Paiement non abouti"
        message = (
            "La tentative n'a pas abouti (carte refusée, annulation ou session "
            "expirée). Aucun montant n'a été débité — vous pouvez réessayer."
        )
        badge_bg = "var(--rose-soft)"
        retry_url = f"/pay/{reference}"
    else:
        variant, title = "pending", "Paiement en cours"
        message = (
            "Votre paiement est en cours de confirmation. "
            "Cette page se rafraîchit automatiquement."
        )
        badge_bg = "var(--primary-faint, #F2F1FF)"
        refresh = True

    return templates.TemplateResponse("payment_return.html", {
        "request": request,
        "variant": variant,
        "title": title,
        "message": message,
        "badge_bg": badge_bg,
        "refresh": refresh,
        "amount": amount,
        "currency": currency,
        "merchant_name": merchant_name,
        "description": description,
        "reference": reference,
        "merchant_url": merchant_url,
        "retry_url": retry_url,
    })


@app.post("/pay/{reference}/submit")
async def submit_payment(reference: str, request: Request):
    """Submit a payment from the checkout page (unified for SDK and Direct API).

    The customer selects an operator and enters their phone number on the
    checkout page, then this endpoint initiates the payment via TouchPay
    Direct API.

    This endpoint is used for both modes:
    - SDK mode: customer provides operator + phone on checkout page
    - Direct API mode: if not already provided, customer can still submit here
    """
    from app.models.payment import Payment, PaymentStatus, PaymentMode
    from app.services.touchpay_direct_service import (
        touchpay_direct_service, TouchPayDirectError, OperatorMismatchError,
        friendly_initiation_error, is_customer_error,
    )
    from app.core.velocity import PaymentVelocityError, record_payment_failure
    from app.services.country_service import country_service
    from sqlalchemy import update as sa_update

    try:
        body = await request.json()
    except Exception:
        body = dict(await request.form())

    operator_str = body.get("operator", "").upper()
    phone = body.get("phone", "").strip()

    if not operator_str or not phone:
        raise HTTPException(status_code=400, detail="operator and phone are required")

    async with async_session() as db:
        result = await db.execute(
            select(Payment).where(Payment.reference == reference)
        )
        payment = result.scalar_one_or_none()

        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        if payment.status != PaymentStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Payment is {payment.status.value}, cannot submit",
            )

        # Resolve country from payment record or phone detection
        country_code = payment.country
        if not country_code:
            detected = await country_service.detect_country_by_phone(db, phone)
            if detected:
                country_code = detected.code
            else:
                country_code = "CM"  # Fallback for legacy payments

        # Validate operator against country
        operators = await country_service.get_active_operators(db, country_code)
        valid_ops = {op.operator_code for op in operators}
        if operator_str not in valid_ops:
            raise HTTPException(
                status_code=400,
                detail=f"Operateur '{operator_str}' non disponible pour le pays '{country_code}'. Disponibles: {', '.join(sorted(valid_ops))}",
            )

        from app.services.payment_router import initiate_mobile_payment
        from app.services.provider_service import ProviderRoutingError
        from app.models.payment import PaymentProvider

        from app.models.merchant import Merchant as MerchantModel
        merchant_row = (await db.execute(
            select(MerchantModel).where(MerchantModel.id == payment.merchant_id)
        )).scalar_one_or_none()

        # The customer picked MOBILE: reprice at the mobile rate (also
        # undoes an inflated total left by a previous card-tab visit).
        if merchant_row:
            from decimal import Decimal as _Dec
            from app.api.v1.payments import reprice_for_method
            _new_amount, _new_fee = reprice_for_method(payment, merchant_row, "MOBILE")
            if _new_amount != _Dec(payment.amount) or _new_fee != _Dec(payment.fee or 0):
                await db.execute(
                    sa_update(Payment)
                    .where(Payment.id == payment.id, Payment.status == PaymentStatus.PENDING)
                    .values(amount=_new_amount, fee=_new_fee)
                )
                await db.commit()
                await db.refresh(payment)

        try:
            provider_used, direct_response = await initiate_mobile_payment(
                db=db,
                payment=payment,
                reference=reference,
                amount=int(payment.amount),
                phone_number=phone,
                operator_code=operator_str,
                country_code=country_code,
                customer_info=payment.customer_info,
                description=payment.description,
                merchant=merchant_row,
            )
        except ProviderRoutingError as exc:
            logger.warning("No provider on submit for %s: %s", reference, exc)
            raise HTTPException(status_code=400, detail=str(exc))
        except OperatorMismatchError as exc:
            logger.info("Operator mismatch on submit for %s: %s", reference, exc)
            raise HTTPException(status_code=400, detail=str(exc))
        except PaymentVelocityError as exc:
            logger.warning("Velocity limit on submit for %s: %s", reference, exc)
            raise HTTPException(
                status_code=429,
                detail="Trop de tentatives pour ce numero. Reessayez dans 30 minutes.",
            )
        except TouchPayDirectError as exc:
            customer_caused = is_customer_error(exc)
            logger.log(
                logging.INFO if customer_caused else logging.ERROR,
                "Direct API submit %s for %s: %s",
                "rejected" if customer_caused else "failed", reference, exc,
            )
            if not customer_caused:
                record_payment_failure(reference)
            raise HTTPException(
                status_code=502,
                detail=friendly_initiation_error(exc),
            )

        # Update payment with operator, phone, country and PROCESSING status
        customer_info = payment.customer_info or {}
        customer_info["phone"] = phone

        await db.execute(
            sa_update(Payment)
            .where(Payment.id == payment.id, Payment.status == PaymentStatus.PENDING)
            .values(
                status=PaymentStatus.PROCESSING,
                operator=operator_str,
                country=country_code,
                customer_info=customer_info,
                provider=PaymentProvider(provider_used),
                direct_api_data=direct_response,
            )
        )
        await db.commit()

    return {"status": "ok", "message": "Payment initiated, awaiting confirmation"}


# Customer-facing messages for TouchPay/operator failure codes
# (extracted from the "[NN] ..." message in the failure callback)
TOUCHPAY_FAILURE_MESSAGES = {
    "02": "Numero invalide ou wallet introuvable. Verifiez le numero saisi et reessayez.",
    "04": "Compte Mobile Money introuvable pour ce numero. Verifiez le numero saisi.",
    "11": "Ce compte Mobile Money est desactive ou bloque. Contactez votre operateur.",
    "19": "L'operateur est momentanement indisponible. Reessayez dans quelques minutes.",
    "21": "Transaction invalide. Veuillez relancer le paiement.",
    "27": "Paiement non autorise : la demande a ete refusee ou a expire. Relancez le paiement et validez avec votre code PIN.",
}
TOUCHPAY_FAILURE_DEFAULT = "Le paiement a echoue. Veuillez reessayer."
_FAILURE_CODE_RE = re.compile(r"^\s*\[(\w+)\]")


def extract_failure_code(touchpay_data: dict | None) -> str | None:
    """Extract the operator failure code from a stored callback message."""
    raw = (touchpay_data or {}).get("message") or ""
    m = _FAILURE_CODE_RE.match(str(raw))
    return m.group(1) if m else None


def resolve_failure_message(touchpay_data: dict | None) -> tuple[str | None, str]:
    """Return (failure_code, customer-facing message) for a failed payment.

    Falls back to keyword matching for operator messages without a [NN]
    code (e.g. Orange Money: "Le solde du compte du payeur est insuffisant",
    "Beneficiaire introuvable", MTN: "PAYEE_NOT_FOUND").
    """
    code = extract_failure_code(touchpay_data)
    if code and code in TOUCHPAY_FAILURE_MESSAGES:
        return code, TOUCHPAY_FAILURE_MESSAGES[code]

    raw = str((touchpay_data or {}).get("message") or "").lower()
    if "insuffisant" in raw:
        return code, "Solde insuffisant sur le compte Mobile Money. Rechargez votre compte et reessayez."
    if "introuvable" in raw or "payee_not_found" in raw or "not found" in raw:
        return code, "Compte Mobile Money introuvable pour ce numero. Verifiez le numero saisi."
    return code, TOUCHPAY_FAILURE_DEFAULT


@app.get("/pay/{reference}/poll")
async def poll_payment_status(reference: str):
    """Poll payment status (used by checkout page JS for Direct API payments)."""
    from app.models.payment import Payment, PaymentStatus

    async with async_session() as db:
        result = await db.execute(
            select(Payment).where(Payment.reference == reference)
        )
        payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    response = {
        "status": payment.status.value,
        "reference": payment.reference,
    }
    if payment.status == PaymentStatus.FAILED:
        code, message = resolve_failure_message(payment.touchpay_data)
        response["failure_code"] = code
        response["message"] = message
    return response


# ---------------------------------------------------------------------------
# /webhooks/touchpay/callback -- TouchPay callbacks (GET + POST)
#
# TouchPay sends TWO callbacks after payment:
#
# 1. GET (browser redirect): num_transaction_from_gu, num_command (=our ref),
#    amount, errorCode (202=success)
#
# 2. POST (server-to-server): payment_token, payment_status (200=success),
#    paid_amount, command_number, payment_mode, paid_sum, payment_validation_date
# ---------------------------------------------------------------------------
async def _handle_touchpay_callback(request: Request, params: dict):
    """Shared logic for GET and POST TouchPay callbacks."""
    from app.api.v1.endpoints.callbacks import (
        TouchPayCallbackData,
        _process_callback,
    )
    from app.models.payment import PaymentStatus as PS

    logger.info("TouchPay callback received (%s): %s", request.method, params)

    callback = TouchPayCallbackData(**params)

    # Need at least one identifier to find the payment
    if not callback.payment_token and not callback.command_number and not callback.transaction_id:
        raise HTTPException(status_code=400, detail="Missing payment identifier")

    async with async_session() as db:
        result = await _process_callback(db, callback)

    return result


def _is_server_callback(params: dict) -> bool:
    """Distinguish TouchPay server callback from browser redirect.

    Server callback has: payment_status, payment_mode, command_number, etc.
    Browser redirect has: errorCode, num_transaction_from_gu, num_command
    """
    return "payment_status" in params and "payment_mode" in params


def _verify_basic_auth(request: Request) -> bool:
    """Verify Basic Auth credentials from TouchPay server callback."""
    from app.core.config import settings
    import base64

    username = settings.TOUCHPAY_CALLBACK_USERNAME
    password = settings.TOUCHPAY_CALLBACK_PASSWORD

    # If credentials are not configured, skip verification in dev
    if not username and not password:
        logger.warning("TouchPay callback: Basic Auth not configured, skipping verification")
        return True

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Basic "):
        return False

    try:
        decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
        provided_user, provided_pass = decoded.split(":", 1)
        return provided_user == username and provided_pass == password
    except Exception:
        return False


@app.get("/webhooks/touchpay/callback")
async def touchpay_sdk_callback_get(request: Request):
    """Handle TouchPay GET callbacks.

    Two types of GET arrive here:
    1. Browser redirect (SDK): errorCode, num_transaction_from_gu, num_command
       → NOT trusted, only shows current payment status (read-only)
    2. Server async callback: payment_status, payment_mode, payment_token,
       command_number + Basic Auth → TRUSTED, updates payment status
    """
    from app.api.v1.endpoints.callbacks import TouchPayCallbackData, _find_payment
    from app.models.payment import PaymentStatus as PS

    params = dict(request.query_params)

    # ---- Server callback (trusted) ----
    if _is_server_callback(params):
        logger.info("TouchPay server callback (GET): %s", params)

        if not _verify_basic_auth(request):
            logger.warning("TouchPay server callback: Invalid Basic Auth")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        result = await _handle_touchpay_callback(request, params)
        # Return 200 = validated, 420 = failed (per TouchPay docs)
        new_status = result.get("new_status")
        if new_status == PS.COMPLETED:
            return {"status": 200, "message": "Payment validated"}
        elif new_status in (PS.FAILED, PS.CANCELLED):
            return {"status": 420, "message": "Payment failed"}
        return {"status": 200, "message": "Processed"}

    # ---- Browser redirect (not trusted) ----
    logger.info("TouchPay browser redirect (GET): %s", params)

    callback = TouchPayCallbackData(**params)

    if not callback.payment_token and not callback.command_number and not callback.transaction_id:
        raise HTTPException(status_code=400, detail="Missing payment identifier")

    # Read-only: find the payment but do NOT update its status
    async with async_session() as db:
        payment = await _find_payment(db, callback)

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # If the merchant provided a return_url, redirect the customer there
    if payment.return_url:
        separator = "&" if "?" in payment.return_url else "?"
        redirect_url = (
            f"{payment.return_url}{separator}"
            f"reference={payment.reference}"
            f"&status={payment.status.value}"
        )
        return RedirectResponse(url=redirect_url, status_code=302)

    # Otherwise, show our payment status page with the CURRENT db status
    return templates.TemplateResponse(
        "payment_status.html",
        {
            "request": request,
            "payment": payment,
            "status": payment.status.value,
        },
    )


@app.post("/webhooks/touchpay/callback")
async def touchpay_sdk_callback_post(request: Request):
    """Handle TouchPay callback (POST fallback)."""
    # Parse body (JSON or form-encoded query params)
    params = dict(request.query_params)
    try:
        body = await request.json()
        params.update(body)
    except Exception:
        try:
            form = dict(await request.form())
            params.update(form)
        except Exception:
            pass

    result = await _handle_touchpay_callback(request, params)
    return {"status": result.get("status", "ok"), "reference": result.get("reference", "")}


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
