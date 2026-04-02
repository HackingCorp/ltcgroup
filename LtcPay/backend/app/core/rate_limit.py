"""
Rate limiting configuration using slowapi.

Applied to critical endpoints to prevent abuse:
- Payment creation: 60/minute
- Merchant registration: 5/hour
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

# Use Redis for rate limit storage if available
storage_uri = settings.redis_url if settings.redis_url else "memory://"

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri=storage_uri,
)
