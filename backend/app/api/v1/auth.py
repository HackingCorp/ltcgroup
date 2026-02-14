from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.auth import Token
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import hash_password, verify_password, create_access_token
from app.services.accountpe import accountpe_client
from app.utils.exceptions import UserAlreadyExistsException, InvalidCredentialsException
from app.utils.logging_config import get_logger
from app.config import settings
from app.middleware.rate_limit import limiter

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
        await accountpe_client.register_user(
            email=user_data.email,
            phone=user_data.phone,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            password=user_data.password,
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
async def login(request: Request, email: str, password: str, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user and return JWT token.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
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
