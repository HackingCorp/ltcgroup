"""
Rate limiting middleware using slowapi with Redis backend.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings


# Create limiter instance with Redis storage for distributed rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # Global default: 100 requests per minute per IP
    storage_uri=settings.redis_url,
)
