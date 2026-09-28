"""
Admin health check endpoints.
"""
import logging
import time

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.api.v1.auth import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/health", tags=["Admin Health"])


@router.get("/")
async def health_check(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Health check: ping the database and Redis, and say what answered.

    Redis was never checked here, and the dashboard read db_ok / redis_ok —
    fields this endpoint has never returned. Both therefore rendered as
    "down" on a platform that was collecting payments the whole time. The
    flat keys are returned alongside the nested ones so neither shape lies.
    """
    db_status = "operational"
    db_latency = 0.0
    try:
        start = time.monotonic()
        await db.execute(text("SELECT 1"))
        db_latency = round((time.monotonic() - start) * 1000, 1)
    except Exception as exc:  # noqa: BLE001 - a health check never raises
        logger.warning("Health check: database unreachable: %s", exc)
        db_status = "down"

    redis_status = "operational"
    redis_latency = 0.0
    try:
        from app.core.cache import cache

        client = cache.redis
        if client is None:
            # No REDIS_URL configured at all: not a failure, just absent.
            redis_status = "disabled"
        else:
            start = time.monotonic()
            client.ping()
            redis_latency = round((time.monotonic() - start) * 1000, 1)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Health check: Redis unreachable: %s", exc)
        redis_status = "down"

    degraded = db_status == "down" or redis_status == "down"
    return {
        "status": "degraded" if degraded else "healthy",
        "db": {"status": db_status, "latency_ms": db_latency},
        "redis": {"status": redis_status, "latency_ms": redis_latency},
        "db_ok": db_status == "operational",
        "db_latency_ms": db_latency,
        "redis_ok": redis_status == "operational",
        "redis_latency_ms": redis_latency,
        "uptime": "running",
    }


@router.get("/services")
async def services_status(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List service statuses."""
    services = []

    # PostgreSQL
    pg_status = "operational"
    pg_latency = 0.0
    try:
        start = time.monotonic()
        await db.execute(text("SELECT 1"))
        pg_latency = round((time.monotonic() - start) * 1000, 1)
    except Exception:
        pg_status = "down"

    services.append({
        "name": "PostgreSQL",
        "status": pg_status,
        "latency_ms": pg_latency,
    })

    # Redis
    redis_status = "operational"
    try:
        import redis as redis_lib
        from app.core.config import settings
        redis_url = getattr(settings, "REDIS_URL", None) or getattr(settings, "redis_url", None)
        if redis_url:
            r = redis_lib.from_url(str(redis_url), socket_timeout=2)
            r.ping()
        else:
            redis_status = "not_configured"
    except Exception:
        redis_status = "down"

    services.append({
        "name": "Redis",
        "status": redis_status,
    })

    # TouchPay API (ping SDK URL)
    tp_status = "operational"
    tp_latency = 0.0
    try:
        import httpx
        start = time.monotonic()
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.head(
                "https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.1.js"
            )
        tp_latency = round((time.monotonic() - start) * 1000, 1)
        if resp.status_code != 200:
            tp_status = "degraded"
    except Exception:
        tp_status = "down"

    services.append({
        "name": "TouchPay API",
        "status": tp_status,
        "latency_ms": tp_latency,
    })

    return {"services": services}
