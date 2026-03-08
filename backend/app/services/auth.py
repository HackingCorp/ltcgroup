import uuid as uuid_mod
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from jwt.exceptions import InvalidTokenError
import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import TokenData

security = HTTPBearer()


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire, "iat": now, "token_type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> tuple[str, str]:
    """Create a refresh token with a unique jti. Returns (token_string, jti)."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.refresh_token_expire_minutes))
    jti = str(uuid_mod.uuid4())
    to_encode.update({"exp": expire, "iat": now, "token_type": "refresh", "jti": jti})
    token = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, jti


def decode_refresh_token(token: str) -> TokenData:
    """Decode and validate a refresh token (must not be expired, must be type=refresh)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id: str = payload.get("sub")
        token_type: str = payload.get("token_type")
        jti: str = payload.get("jti")

        if user_id is None or token_type != "refresh" or jti is None:
            raise credentials_exception

        return TokenData(
            user_id=user_id,
            email=payload.get("email", ""),
            token_type=token_type,
            jti=jti,
        )
    except InvalidTokenError:
        raise credentials_exception


def verify_token(token: str) -> TokenData:
    """Verify an access token (must not be expired, must be type=access)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        token_type: str = payload.get("token_type", "access")

        if user_id is None or email is None:
            raise credentials_exception

        # Reject refresh tokens used as access tokens
        if token_type != "access":
            raise credentials_exception

        return TokenData(user_id=user_id, email=email, token_type=token_type, iat=payload.get("iat", 0))
    except InvalidTokenError:
        raise credentials_exception


# ---------------------------------------------------------------------------
# Redis token blacklist helpers
# ---------------------------------------------------------------------------

def _get_redis(request: Request):
    """Get Redis client from app state."""
    redis = getattr(request.app.state, "redis", None)
    if redis is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Token service temporarily unavailable",
        )
    return redis


async def blacklist_token(request: Request, jti: str, ttl_seconds: int) -> None:
    """Add a token jti to the Redis blacklist with a TTL."""
    redis = _get_redis(request)
    await redis.setex(f"blacklist:{jti}", ttl_seconds, "1")


async def is_token_blacklisted(request: Request, jti: str) -> bool:
    """Check whether a token jti is in the blacklist."""
    redis = _get_redis(request)
    return await redis.exists(f"blacklist:{jti}") > 0


async def blacklist_all_user_tokens(request: Request, user_id: str) -> None:
    """Blacklist all tokens for a user by setting a user-level invalidation marker.

    Any refresh token issued before this timestamp will be rejected.
    Marker expires after refresh_token_expire_minutes (matches max refresh token lifetime).
    """
    redis = _get_redis(request)
    ttl = settings.refresh_token_expire_minutes * 60
    await redis.setex(
        f"user_invalidated:{user_id}",
        ttl,
        str(int(datetime.now(timezone.utc).timestamp())),
    )


async def is_user_tokens_invalidated(request: Request, user_id: str, token_iat: int) -> bool:
    """Check if a token was issued before the user's tokens were invalidated."""
    redis = _get_redis(request)
    invalidated_at = await redis.get(f"user_invalidated:{user_id}")
    if invalidated_at is None:
        return False
    return token_iat <= int(invalidated_at)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    token_data = verify_token(token)

    # Check if all user tokens were invalidated (e.g. after password change)
    # Uses iat from verify_token — no second jwt.decode needed (PERF-5)
    try:
        if await is_user_tokens_invalidated(request, token_data.user_id, token_data.iat or 0):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been invalidated",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        raise
    except Exception:
        # If Redis is unavailable, deny access (fail-closed for security)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable",
        )

    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    return user
