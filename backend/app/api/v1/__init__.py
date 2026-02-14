from fastapi import APIRouter

from app.api.v1 import auth, users, cards, transactions

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(cards.router)
router.include_router(transactions.router)

__all__ = ["router"]
