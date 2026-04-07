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
# Serves the HTML page with the TouchPay SDK for the customer to pay.
# ---------------------------------------------------------------------------
@app.get("/pay/{reference}", response_class=HTMLResponse)
async def payment_page(reference: str, request: Request):
    """Render the payment checkout page with TouchPay SDK."""
    from app.models.payment import Payment, PaymentStatus
    from app.models.merchant import Merchant
    from app.services.touchpay_service import touchpay_service
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

    if payment.status not in (PaymentStatus.PENDING,):
        return templates.TemplateResponse(
            "payment_status.html",
            {
                "request": request,
                "payment": payment,
                "status": payment.status.value,
            },
        )

    # Split customer_name into first/last for TouchPay SDK
    first_name = ""
    last_name = ""
    if payment.customer_name:
        parts = payment.customer_name.strip().split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

    sdk_config = touchpay_service.get_sdk_config(
        payment_token=payment.reference,
        amount=float(payment.amount),
        customer_email=payment.customer_email or "",
        customer_first_name=first_name,
        customer_last_name=last_name,
        customer_phone=payment.customer_phone or "",
        success_url=payment.return_url or None,
        failed_url=None,
    )

    return templates.TemplateResponse(
        "checkout.html",
        {
            "request": request,
            "payment": payment,
            "merchant": payment.merchant,
            "sdk_config": sdk_config,
        },
    )


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


@app.get("/webhooks/touchpay/callback")
async def touchpay_sdk_callback_get(request: Request):
    """Handle TouchPay browser redirect (GET).

    IMPORTANT: The GET callback is a browser redirect and can be spoofed.
    It must NEVER update payment status. Only the server-to-server POST
    webhook is trusted for status changes.

    This handler only looks up the payment and shows its current status.
    """
    from app.api.v1.endpoints.callbacks import TouchPayCallbackData, _find_payment
    from app.models.payment import PaymentStatus as PS

    params = dict(request.query_params)
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
    """Handle TouchPay server-to-server callback (POST)."""
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
