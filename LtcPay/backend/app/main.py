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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting LtcPay...")
    if settings.environment == "development":
        await init_models()
        logger.info("Database tables created")
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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
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
    from app.services.touchpay_service import touchpay_service

    async with async_session() as db:
        result = await db.execute(
            select(Payment).where(Payment.reference == reference)
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
        payment_token=payment.payment_token,
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
            "sdk_config": sdk_config,
        },
    )


# ---------------------------------------------------------------------------
# GET /webhooks/touchpay/callback -- TouchPay SDK browser redirect callback
#
# TouchPay redirects the customer's browser here after payment with
# query params: payment_token, payment_status, paid_amount,
# command_number, payment_mode, paid_sum, payment_validation_date.
#
# payment_status=200 means success, anything else means failure.
# ---------------------------------------------------------------------------
@app.get("/webhooks/touchpay/callback")
async def touchpay_sdk_callback(
    request: Request,
    payment_token: str = Query(default=""),
    payment_status: str = Query(default=""),
    paid_amount: str = Query(default=""),
    command_number: str = Query(default=""),
    payment_mode: str = Query(default=""),
    paid_sum: str = Query(default=""),
    payment_validation_date: str = Query(default=""),
):
    """
    Handle TouchPay SDK redirect callback (GET with query parameters).

    After the customer completes payment via the TouchPay SDK, their
    browser is redirected here. We update the payment status and then
    show the payment result page or redirect to the merchant's return_url.
    """
    from app.api.v1.endpoints.callbacks import (
        TouchPayCallbackData,
        _process_callback,
    )
    from app.models.payment import PaymentStatus as PS

    params = dict(request.query_params)
    logger.info("TouchPay SDK callback received: %s", params)

    if not payment_token:
        raise HTTPException(status_code=400, detail="Missing payment_token")

    callback = TouchPayCallbackData(**params)

    async with async_session() as db:
        result = await _process_callback(db, callback)

    payment = result.get("payment")
    new_status = result.get("new_status", PS.PENDING)

    # If the merchant provided a return_url, redirect the customer there
    if payment and payment.return_url:
        separator = "&" if "?" in payment.return_url else "?"
        redirect_url = (
            f"{payment.return_url}{separator}"
            f"reference={payment.reference}"
            f"&status={new_status.value}"
        )
        return RedirectResponse(url=redirect_url, status_code=302)

    # Otherwise, show our payment status page
    return templates.TemplateResponse(
        "payment_status.html",
        {
            "request": request,
            "payment": payment,
            "status": new_status.value if new_status else "UNKNOWN",
        },
    )


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
