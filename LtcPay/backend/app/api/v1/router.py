"""
LtcPay - API v1 Router
"""
from fastapi import APIRouter

from app.api.v1 import payments as merchant_payments
from app.api.v1 import merchants
from app.api.v1 import auth
from app.api.v1 import dashboard
from app.api.v1 import merchant_auth
from app.api.v1 import merchant_dashboard
from app.api.v1 import merchant_withdrawals
from app.api.v1 import admin_withdrawals
from app.api.v1.endpoints import callbacks
from app.api.v1.endpoints import payments as direct_payments
from app.api.v1.endpoints import transactions

api_router = APIRouter()

# Admin dashboard authentication
api_router.include_router(auth.router)

# Dashboard stats
api_router.include_router(dashboard.router)

# Merchant portal authentication
api_router.include_router(merchant_auth.router)

# Merchant portal dashboard
api_router.include_router(merchant_dashboard.router)

# Merchant withdrawal endpoints
api_router.include_router(merchant_withdrawals.router)

# Admin withdrawal management
api_router.include_router(admin_withdrawals.router)

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
