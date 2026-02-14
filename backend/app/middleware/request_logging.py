"""
Request logging middleware to log HTTP requests and responses.
"""
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.utils.logging_config import get_logger

logger = get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests and responses."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Process request
        response: Response = await call_next(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log request details
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code}",
            extra={
                "extra_fields": {
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration * 1000, 2),
                    "client_ip": client_ip,
                    "user_agent": request.headers.get("user-agent", ""),
                }
            },
        )

        return response
