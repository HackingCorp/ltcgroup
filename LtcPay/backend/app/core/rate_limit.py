"""
Rate limiting configuration using slowapi.

Applied to critical endpoints to prevent abuse:
- Payment creation: 60/minute
- Merchant registration: 5/hour
"""

from starlette.requests import Request

from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

# Use Redis for rate limit storage if available
storage_uri = settings.redis_url if settings.redis_url else "memory://"


def client_ip(request: Request) -> str:
    """Real client IP, accounting for the reverse proxy in front of the app.

    Every request reaches the app through Traefik, so get_remote_address
    returns the proxy IP and all clients would share one bucket (a single
    caller could exhaust the registration limit for everyone).

    Traefik appends the peer address to X-Forwarded-For, so the rightmost
    entry is the one our own proxy observed; anything to its left is
    client-supplied and spoofable.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            return parts[-1]
    return get_remote_address(request)


limiter = Limiter(
    key_func=client_ip,
    default_limits=["100/minute"],
    storage_uri=storage_uri,
    # The public docs promise X-RateLimit-Limit / X-RateLimit-Remaining on
    # every response; without this slowapi never emits them.
    headers_enabled=True,
)
