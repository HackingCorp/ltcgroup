"""
API Key authentication for LtcPay merchant API.

Merchants authenticate using:
  - X-API-Key header: their public API key (ltcpay_...)
  - X-API-Secret header: their raw API secret

The API key is stored in plaintext (for lookup), the secret is bcrypt-hashed.
"""

import hmac
import hashlib
import secrets
import uuid
import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.merchant import Merchant


# Header-based API key authentication
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
api_secret_header = APIKeyHeader(name="X-API-Secret", auto_error=False)


def hash_api_secret(secret: str) -> str:
    """Hash an API secret using bcrypt."""
    return _bcrypt.hashpw(secret.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_api_secret(plain_secret: str, hashed_secret: str) -> bool:
    """Verify an API secret against its bcrypt hash."""
    return _bcrypt.checkpw(plain_secret.encode("utf-8"), hashed_secret.encode("utf-8"))


def generate_webhook_signature(payload: bytes, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook payloads."""
    return hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify HMAC-SHA256 webhook signature."""
    expected = generate_webhook_signature(payload, secret)
    return hmac.compare_digest(signature, expected)


def generate_api_secret() -> str:
    """Generate a raw API secret (shown to merchant once, then hashed)."""
    return secrets.token_hex(32)


def generate_transaction_ref() -> str:
    """Generate a unique transaction reference (LTCPAY- prefix + 24 hex chars)."""
    return f"LTCPAY-{uuid.uuid4().hex[:24].upper()}"


def generate_payment_token(reference: str, amount) -> str:
    """Generate a payment token encoding the reference and amount (JWT-like)."""
    from jose import jwt as _jwt
    from app.core.config import settings
    payload = {"sub": reference, "amount": float(amount)}
    return _jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_payment_token(token: str) -> dict | None:
    """Verify and decode a payment token. Returns payload dict or None."""
    from jose import jwt as _jwt
    from jose import JWTError
    from app.core.config import settings
    if not token:
        return None
    try:
        return _jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


def compute_touchpay_signature(data: str) -> str:
    """Compute HMAC-SHA256 signature for TouchPay webhook verification."""
    from app.core.config import settings
    secret = settings.touchpay_webhook_secret or settings.jwt_secret_key
    return hmac.new(
        secret.encode("utf-8"),
        data.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


async def get_current_merchant(
    api_key: str = Security(api_key_header),
    api_secret: str = Security(api_secret_header),
    db: AsyncSession = Depends(get_db),
) -> Merchant:
    """
    Authenticate a merchant using API key + secret from request headers.

    Raises 401 if credentials are missing or invalid.
    Raises 403 if the merchant account is inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API credentials",
        headers={"WWW-Authenticate": "API-Key"},
    )

    if not api_key or not api_secret:
        raise credentials_exception

    # Look up merchant by API key (check both live and test keys)
    result = await db.execute(
        select(Merchant).where(
            or_(
                Merchant.api_key_live == api_key,
                Merchant.api_key_test == api_key,
            )
        )
    )
    merchant = result.scalar_one_or_none()

    if merchant is None:
        raise credentials_exception

    # Verify the API secret
    if not verify_api_secret(api_secret, merchant.api_secret_hash):
        raise credentials_exception

    # Check if merchant is active
    if not merchant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant account is deactivated",
        )

    return merchant
