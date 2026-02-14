from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_models
from app.api.v1 import router as api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database tables
    await init_models()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="LTC Group - vCard API",
    description="Backend API for vCard virtual card management",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for uncaught exceptions.
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.environment == "development" else None,
        },
    )


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ltc-vcard-api"}


# Include API v1 router
app.include_router(api_v1_router)
