"""
LtcPay - Payment Gateway Application
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting LtcPay...")
    await init_models()
    logger.info("Database tables created")
    await create_default_admin()
    yield
    logger.info("Shutting down LtcPay...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="LtcPay - Payment Gateway with TouchPay Integration",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

# Static files and templates
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# API routes
app.include_router(api_router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Payment checkout page -- GET /pay/{reference}
# Serves the HTML page with native form for both SDK and Direct API modes.
# All payments now use TouchPay Direct API with a unified native interface.
# ---------------------------------------------------------------------------
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

    return templates.TemplateResponse(
        "checkout.html",
        {
            "request": request,
            "payment": payment,
            "merchant": payment.merchant,
            "payment_mode": payment.payment_mode.value,
        },
    )


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
    from app.models.payment import Payment, PaymentStatus, PaymentMode, MobileMoneyOperator
    from app.services.touchpay_direct_service import touchpay_direct_service, TouchPayDirectError
    from sqlalchemy import update as sa_update

    try:
        body = await request.json()
    except Exception:
        body = dict(await request.form())

    operator_str = body.get("operator", "").upper()
    phone = body.get("phone", "").strip()

    if not operator_str or not phone:
        raise HTTPException(status_code=400, detail="operator and phone are required")

    try:
        operator = MobileMoneyOperator(operator_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid operator: {operator_str}")

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

        callback_url = f"{settings.webhook_base_url}/api/v1/callbacks/touchpay-direct"

        try:
            direct_response = await touchpay_direct_service.initiate_payment(
                payment_reference=reference,
                amount=int(payment.amount),
                phone_number=phone,
                operator=operator,
                callback_url=callback_url,
            )
        except TouchPayDirectError as exc:
            logger.error("Direct API submit failed for %s: %s", reference, exc)
            raise HTTPException(
                status_code=502,
                detail=f"Payment initiation failed: {exc}",
            )

        # Update payment with operator, phone, and PROCESSING status
        customer_info = payment.customer_info or {}
        customer_info["phone"] = phone

        await db.execute(
            sa_update(Payment)
            .where(Payment.id == payment.id, Payment.status == PaymentStatus.PENDING)
            .values(
                status=PaymentStatus.PROCESSING,
                operator=operator,
                customer_info=customer_info,
                direct_api_data=direct_response,
            )
        )
        await db.commit()

    return {"status": "ok", "message": "Payment initiated, awaiting confirmation"}


@app.get("/pay/{reference}/poll")
async def poll_payment_status(reference: str):
    """Poll payment status (used by checkout page JS for Direct API payments)."""
    from app.models.payment import Payment

    async with async_session() as db:
        result = await db.execute(
            select(Payment).where(Payment.reference == reference)
        )
        payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    return {
        "status": payment.status.value,
        "reference": payment.reference,
    }


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
