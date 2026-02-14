from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(
    title="LTC Group - vCard API",
    description="Backend API for vCard virtual card management",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ltc-vcard-api"}


# Future: include API routers
# from app.api.v1 import router as api_v1_router
# app.include_router(api_v1_router, prefix="/api/v1")
