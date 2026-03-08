from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_models, async_session
from app.api.v1 import router as api_v1_router
from app.middleware.rate_limit import limiter
from app.middleware.request_logging import RequestLoggingMiddleware
from app.utils.logging_config import setup_logging, get_logger

# Initialize logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database tables
    logger.info("Starting LTC vCard API...")
    # In production, use Alembic migrations
    if settings.environment == "development":
        await init_models()
        logger.info("Database initialized successfully")

    # Create shared Redis client for health checks
    import redis.asyncio as aioredis
    try:
        app.state.redis = aioredis.from_url(settings.redis_url)
        await app.state.redis.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis not available at startup: {e}")
        app.state.redis = None

    # Initialize exchange rate service with Redis
    from app.services.exchange_rate import exchange_rate_service
    exchange_rate_service.set_redis(app.state.redis)

    # Initialize cache Redis client
    from app.utils.cache import set_cache_redis
    set_cache_redis(app.state.redis)

    yield

    # Shutdown: cleanup HTTP clients via close() methods
    from app.services.accountpe import accountpe_client
    from app.services.payin import payin_client
    from app.services.enkap import enkap_client
    from app.services.exchange_rate import exchange_rate_service as _ers
    from app.services.kyc_verifier import kyc_verifier_client

    await accountpe_client.close()
    await payin_client.close()
    await enkap_client.close()
    await _ers.close()
    await kyc_verifier_client.close()

    # Shutdown: cleanup Redis
    if getattr(app.state, "redis", None):
        await app.state.redis.close()
    logger.info("Shutting down LTC vCard API...")


app = FastAPI(
    title="LTC Group - vCard API",
    description="Backend API for vCard virtual card management",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url="/redoc" if settings.environment == "development" else None,
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)


# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; font-src 'self'"
        )
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


# Request body size limit middleware (10MB default, prevents DoS via large payloads)
MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024  # 10 MB


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_BODY_SIZE:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={"detail": "Request body too large"},
            )
        return await call_next(request)


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)

# GZip compression for responses >= 1KB (~60% size reduction for JSON)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for uncaught exceptions.
    """
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.environment == "development" else None,
        },
    )


@app.get("/health")
async def health_check():
    """
    Enhanced health check with database and Redis connectivity.
    """
    health_status = {
        "status": "healthy",
        "service": "ltc-vcard-api",
        "version": "0.1.0",
        "database": "unknown",
        "redis": "unknown",
    }

    # Check database connectivity
    try:
        async with async_session() as db:
            from sqlalchemy import text
            await db.execute(text("SELECT 1"))
            health_status["database"] = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        health_status["database"] = "unhealthy"
        health_status["status"] = "degraded"

    # Check Redis connectivity using shared client
    try:
        redis_client = getattr(app.state, "redis", None)
        if redis_client:
            await redis_client.ping()
            health_status["redis"] = "healthy"
        else:
            health_status["redis"] = "unavailable"
    except Exception as e:
        logger.error(f"Redis health check failed: {str(e)}")
        health_status["redis"] = "unhealthy"

    return health_status


# Include API v1 router
app.include_router(api_v1_router)

# KYC uploads are served via authenticated endpoint at /api/v1/uploads/kyc/{user_id}/{filename}
# Do NOT use StaticFiles mount — that would expose KYC documents without authentication.
