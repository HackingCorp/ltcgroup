"""
LtcPay - API v1 Router
"""
from fastapi import APIRouter

from app.api.v1 import payments as merchant_payments
from app.api.v1 import merchants
from app.api.v1 import auth
from app.api.v1.endpoints import callbacks
from app.api.v1.endpoints import payments as direct_payments
from app.api.v1.endpoints import transactions

api_router = APIRouter()

# Admin dashboard authentication
api_router.include_router(auth.router)

# Merchant payment API (authenticated via API key)
api_router.include_router(merchant_payments.router)

# Merchant registration and management
api_router.include_router(merchants.router)

# Direct payment endpoints (TouchPay checkout flow)
api_router.include_router(
    direct_payments.router,
    prefix="/checkout",
    tags=["Checkout"],
)

# Transaction management
api_router.include_router(
    transactions.router,
    prefix="/transactions",
    tags=["Transactions"],
)

# TouchPay callbacks (webhooks)
api_router.include_router(
    callbacks.router,
    prefix="/callbacks",
    tags=["Callbacks"],
)
