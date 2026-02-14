from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, KYCStatus
from app.schemas.user import UserResponse, UserUpdate, KYCSubmit, KYCResponse
from app.services.auth import get_current_user
from app.services.accountpe import accountpe_client

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
        current_user.phone = user_update.phone

    await db.commit()
    await db.refresh(current_user)

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
    current_user.kyc_submitted_at = datetime.utcnow()
    current_user.kyc_status = KYCStatus.PENDING

    # Submit to AccountPE
    try:
        result = await accountpe_client.submit_kyc(
            user_id=str(current_user.id),
            document_url=kyc_data.document_url,
            document_type=kyc_data.document_type,
        )
        # Update status based on AccountPE response if available
        if result.get("status") == "approved":
            current_user.kyc_status = KYCStatus.APPROVED
        elif result.get("status") == "rejected":
            current_user.kyc_status = KYCStatus.REJECTED
    except Exception as e:
        print(f"AccountPE KYC submission failed: {e}")
        # Continue with local pending status

    await db.commit()
    await db.refresh(current_user)

    return KYCResponse(
        kyc_status=current_user.kyc_status,
        kyc_submitted_at=current_user.kyc_submitted_at,
    )
