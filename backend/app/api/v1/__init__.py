from fastapi import APIRouter

from app.api.v1 import auth, users, cards, transactions, payments, admin

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(cards.router)
router.include_router(transactions.router)
router.include_router(payments.router)
router.include_router(admin.router)

__all__ = ["router"]
