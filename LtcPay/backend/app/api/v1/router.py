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
from app.api.v1 import merchant_payment_links
from app.api.v1 import merchant_refunds
from app.api.v1 import merchant_billing
from app.api.v1 import merchant_notifications
from app.api.v1 import merchant_reports
from app.api.v1 import merchant_team
from app.api.v1 import merchant_kyc
from app.api.v1 import merchant_settings
from app.api.v1 import admin_finance
from app.api.v1 import admin_fees
from app.api.v1 import admin_disputes
from app.api.v1 import admin_webhooks
from app.api.v1 import admin_health
from app.api.v1 import admin_security
from app.api.v1 import admin_users
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

# Merchant payment links
api_router.include_router(merchant_payment_links.router)

# Merchant refunds
api_router.include_router(merchant_refunds.router)

# Merchant billing
api_router.include_router(merchant_billing.router)

# Merchant notifications
api_router.include_router(merchant_notifications.router)

# Merchant reports
api_router.include_router(merchant_reports.router)

# Merchant team management
api_router.include_router(merchant_team.router)

# Merchant KYC
api_router.include_router(merchant_kyc.router)

# Merchant settings
api_router.include_router(merchant_settings.router)

# Admin withdrawal management
api_router.include_router(admin_withdrawals.router)

# Admin finance
api_router.include_router(admin_finance.router)

# Admin fee management
api_router.include_router(admin_fees.router)

# Admin disputes
api_router.include_router(admin_disputes.router)

# Admin webhooks
api_router.include_router(admin_webhooks.router)

# Admin health
api_router.include_router(admin_health.router)

# Admin security / audit logs
api_router.include_router(admin_security.router)

# Admin user management
api_router.include_router(admin_users.router)

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
