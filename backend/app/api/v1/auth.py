import uuid as uuid_mod
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    Token, UserLogin, ChangePassword, ForgotPasswordRequest, ResetPasswordRequest,
    RefreshTokenRequest,
)
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_refresh_token, get_current_user,
    blacklist_token, is_token_blacklisted, blacklist_all_user_tokens,
)
from app.services.accountpe import accountpe_client
from app.services.email import email_service
from app.utils.exceptions import UserAlreadyExistsException, InvalidCredentialsException
from app.utils.logging_config import get_logger
from app.config import settings
from app.middleware.rate_limit import limiter

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


def _create_token_pair(user_id: str, email: str) -> Token:
    """Helper to create both access and refresh tokens."""
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user_id, "email": email},
        expires_delta=access_token_expires,
    )
    refresh_token_expires = timedelta(minutes=settings.refresh_token_expire_minutes)
    refresh_token, _ = create_refresh_token(
        data={"sub": user_id, "email": email},
        expires_delta=refresh_token_expires,
    )
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new user locally and with AccountPE provider.
    """
    # Check if user already exists (single query, distinguish email vs phone conflict)
    result = await db.execute(
        select(User).where((User.email == user_data.email) | (User.phone == user_data.phone))
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        if existing_user.email == user_data.email:
            raise UserAlreadyExistsException("email")
        raise UserAlreadyExistsException("phone")

    # Create user in local database
    hashed_pwd = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        phone=user_data.phone,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=hashed_pwd,
        country_code=user_data.country_code,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Register with AccountPE (in background, non-blocking)
    try:
        await accountpe_client.create_user(
            email=user_data.email,
            name=f"{user_data.first_name} {user_data.last_name}",
            country=user_data.country_code,
        )
    except Exception as e:
        # Log error but don't fail registration if AccountPE is down
        logger.warning(f"AccountPE registration failed for user {new_user.id}: {str(e)}")

    # Generate access + refresh tokens
    token = _create_token_pair(str(new_user.id), new_user.email)

    return {
        "user": UserResponse.model_validate(new_user),
        "token": token,
    }


@router.post("/login", response_model=dict)
@limiter.limit("10/minute")
async def login(request: Request, login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user and return JWT token + user data.
    """
    result = await db.execute(select(User).where(User.email == login_data.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise InvalidCredentialsException()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    # Generate access + refresh tokens
    token = _create_token_pair(str(user.id), user.email)

    return {
        "user": UserResponse.model_validate(user),
        "token": token,
    }


@router.post("/refresh", response_model=Token)
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    body: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh tokens using a valid refresh token.
    Issues a new access + refresh token pair and blacklists the old refresh token.
    """
    # Decode and validate the refresh token (checks expiry + type=refresh)
    token_data = decode_refresh_token(body.refresh_token)

    # Check if the token is blacklisted
    if await is_token_blacklisted(request, token_data.jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify user still exists and is active
    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    # Blacklist the old refresh token (TTL = remaining lifetime of refresh token)
    ttl = settings.refresh_token_expire_minutes * 60
    await blacklist_token(request, token_data.jti, ttl)

    # Issue new token pair (rotation)
    return _create_token_pair(str(user.id), user.email)


@router.post("/logout")
@limiter.limit("30/minute")
async def logout(
    request: Request,
    body: RefreshTokenRequest,
):
    """
    Logout: blacklist the refresh token so it cannot be reused.
    """
    try:
        token_data = decode_refresh_token(body.refresh_token)
    except HTTPException:
        # If token is already invalid/expired, logout is still considered successful
        return {"message": "Logged out successfully"}

    ttl = settings.refresh_token_expire_minutes * 60
    await blacklist_token(request, token_data.jti, ttl)

    return {"message": "Logged out successfully"}


@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Change password for the authenticated user.
    Invalidates all existing tokens for the user.
    """
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()

    # Invalidate all existing tokens for this user
    await blacklist_all_user_tokens(request, str(current_user.id))

    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Request a password reset link. Always returns success to avoid email enumeration.
    """
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user:
        reset_token = str(uuid_mod.uuid4())
        user.reset_token = reset_token
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.commit()

        try:
            reset_html = f"""
            <html><body>
                <h2>Password Reset</h2>
                <p>Hello {user.first_name},</p>
                <p>Use this token to reset your password:</p>
                <p><strong>{reset_token}</strong></p>
                <p>This token expires in 1 hour.</p>
                <p>If you did not request this, ignore this email.</p>
            </body></html>
            """
            await email_service.send_email(
                to=user.email,
                subject="Password Reset - LTC Group",
                html_body=reset_html,
            )
        except Exception as e:
            logger.warning(f"Failed to send reset email for user {user.id}: {e}")

    return {"message": "If email exists, reset link sent"}


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Reset password using a reset token.
    Invalidates all existing tokens for the user.
    """
    result = await db.execute(
        select(User).where(User.reset_token == data.token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    if user.reset_token_expires_at is None or user.reset_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user.hashed_password = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    await db.commit()

    # Invalidate all existing tokens for this user
    try:
        await blacklist_all_user_tokens(request, str(user.id))
    except Exception as e:
        logger.warning(f"Failed to invalidate tokens after password reset for user {user.id}: {e}")

    return {"message": "Password reset successfully"}
