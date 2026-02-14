from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_models, get_db
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
    await init_models()
    logger.info("Database initialized successfully")
    yield
    # Shutdown: cleanup if needed
    logger.info("Shutting down LTC vCard API...")


app = FastAPI(
    title="LTC Group - vCard API",
    description="Backend API for vCard virtual card management",
    version="0.1.0",
    lifespan=lifespan,
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)


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
        async for db in get_db():
            await db.execute("SELECT 1")
            health_status["database"] = "healthy"
            break
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        health_status["database"] = "unhealthy"
        health_status["status"] = "degraded"

    # Check Redis connectivity
    try:
        import redis.asyncio as redis
        redis_client = redis.from_url(settings.redis_url)
        await redis_client.ping()
        await redis_client.close()
        health_status["redis"] = "healthy"
    except Exception as e:
        logger.error(f"Redis health check failed: {str(e)}")
        health_status["redis"] = "unhealthy"

    return health_status


# Include API v1 router
app.include_router(api_v1_router)
