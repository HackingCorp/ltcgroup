from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.user import User, KYCStatus
from app.schemas.user import UserResponse, UserUpdate, KYCSubmit, KYCResponse
from app.services.auth import get_current_user
from app.services.accountpe import accountpe_client
from app.utils.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Get the current authenticated user's profile.
    """
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the current user's profile information.
    """
    if user_update.first_name is not None:
        current_user.first_name = user_update.first_name
    if user_update.last_name is not None:
        current_user.last_name = user_update.last_name
    if user_update.phone is not None:
        # Check phone uniqueness before update
        existing = await db.execute(
            select(User).where(User.phone == user_update.phone, User.id != current_user.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number already in use",
            )
        current_user.phone = user_update.phone

    try:
        await db.commit()
        await db.refresh(current_user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already in use",
        )

    return UserResponse.model_validate(current_user)


@router.post("/kyc", response_model=KYCResponse)
async def submit_kyc(
    kyc_data: KYCSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit KYC documents for verification.
    """
    if current_user.kyc_status == KYCStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC already approved",
        )

    # Update local database
    current_user.kyc_document_url = kyc_data.document_url
    current_user.kyc_submitted_at = datetime.now(timezone.utc)
    current_user.kyc_status = KYCStatus.PENDING

    # TODO: Integrate with accountpe_client.update_user() once full KYC fields
    # (dob, mobile, gender, address, id_proof_type, etc.) are collected from the user.
    # For now, KYC stays in local PENDING status until admin reviews it.

    await db.commit()
    await db.refresh(current_user)

    return KYCResponse(
        kyc_status=current_user.kyc_status,
        kyc_submitted_at=current_user.kyc_submitted_at,
    )
