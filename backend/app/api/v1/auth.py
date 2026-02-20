import uuid as uuid_mod
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    Token, UserLogin, ChangePassword, ForgotPasswordRequest, ResetPasswordRequest,
)
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import (
    hash_password, verify_password, create_access_token,
    decode_token_ignore_expiry, get_current_user,
)
from app.services.accountpe import accountpe_client
from app.services.email import email_service
from app.utils.exceptions import UserAlreadyExistsException, InvalidCredentialsException
from app.utils.logging_config import get_logger
from app.config import settings
from app.middleware.rate_limit import limiter

security = HTTPBearer()

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new user locally and with AccountPE provider.
    """
    # Check if user already exists
    existing_user = await db.execute(
        select(User).where((User.email == user_data.email) | (User.phone == user_data.phone))
    )
    if existing_user.scalar_one_or_none():
        existing_email = await db.execute(select(User).where(User.email == user_data.email))
        if existing_email.scalar_one_or_none():
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
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Register with AccountPE (in background, non-blocking)
    try:
        await accountpe_client.create_user(
            email=user_data.email,
            name=f"{user_data.first_name} {user_data.last_name}",
            country="CM",
        )
    except Exception as e:
        # Log error but don't fail registration if AccountPE is down
        logger.warning(f"AccountPE registration failed for user {new_user.email}: {str(e)}")

    # Generate access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email},
        expires_delta=access_token_expires,
    )

    return {
        "user": UserResponse.model_validate(new_user),
        "token": Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        ),
    }


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user and return JWT token.
    """
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise InvalidCredentialsException()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    # Generate access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=Token)
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh an access token (accepts expired tokens).
    """
    token_data = decode_token_ignore_expiry(credentials.credentials)

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

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


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
    """
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()

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
            logger.warning(f"Failed to send reset email to {user.email}: {e}")

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

    return {"message": "Password reset successfully"}
