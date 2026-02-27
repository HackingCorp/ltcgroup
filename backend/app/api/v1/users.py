from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.user import User, KYCStatus
from app.models.notification import Notification, NotificationType
from app.schemas.user import UserResponse, UserUpdate, KYCSubmit, KYCResponse
from app.services.auth import get_current_user
from app.services.accountpe import accountpe_client, AccountPEError
from app.services.kyc_verifier import kyc_verifier_client, KYCVerifierError
from app.services.email import email_service
from app.services.payin import PAYIN_COUNTRIES
from app.config import settings
from app.middleware.rate_limit import limiter
from app.utils.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])


def _user_response(user: User) -> UserResponse:
    """Build UserResponse with computed local_currency field."""
    resp = UserResponse.model_validate(user)
    country = PAYIN_COUNTRIES.get(user.country_code)
    if country:
        resp.local_currency = country["currency"]
    return resp


def _url_to_filepath(file_url: str) -> str:
    """Convert a /uploads/... URL to an absolute file path."""
    # file_url looks like /uploads/kyc/{user_id}/{filename}
    relative = file_url.lstrip("/")  # uploads/kyc/...
    filepath = (Path(settings.upload_dir).parent / relative).resolve()
    uploads_dir = Path(settings.upload_dir).resolve()
    if not str(filepath).startswith(str(uploads_dir)):
        raise HTTPException(status_code=400, detail="Invalid document URL")
    return str(filepath)


async def _sync_kyc_to_accountpe(user: User, db: AsyncSession) -> None:
    """Sync KYC data to AccountPE on approval (auto or manual)."""
    try:
        # Ensure user has an AccountPE account
        if not user.accountpe_user_id:
            name = f"{user.first_name} {user.last_name}"
            resp = await accountpe_client.create_user(user.email, name, user.country_code)
            if resp.get("status") == 200:
                user.accountpe_user_id = str(resp.get("data", {}).get("id", ""))
            elif "already exist" in resp.get("message", "").lower():
                found_id = await accountpe_client.find_user_by_email(user.email)
                if found_id:
                    user.accountpe_user_id = found_id

        if not user.accountpe_user_id:
            logger.warning(f"Could not resolve AccountPE user_id for {user.email}")
            return

        # Map document type
        proof_type_map = {
            "id_card": "national_id",
            "passport": "passport",
            "driver_license": "driving_license",
        }

        # Build proof URL list
        proof_urls = []
        if user.kyc_document_front_url:
            proof_urls.append(user.kyc_document_front_url)
        if user.kyc_document_back_url:
            proof_urls.append(user.kyc_document_back_url)

        await accountpe_client.update_user(
            user_id=user.accountpe_user_id,
            dob=user.dob.strftime("%Y-%m-%d") if user.dob else "",
            mobile=user.phone,
            mobile_code="+237",
            gender=user.gender or "M",
            address=user.address or "",
            street=user.street or "",
            city=user.city or "",
            postal_code=user.postal_code or "",
            country="Cameroon",
            country_iso_code=user.country_code,
            id_proof_type=proof_type_map.get(user.id_proof_type or "", "national_id"),
            id_proof_no=user.id_proof_no or "",
            id_proof_expiry_date=user.id_proof_expiry.strftime("%Y-%m-%d") if user.id_proof_expiry else "",
            id_proof_url_list=proof_urls,
            livelyness_img=user.kyc_selfie_url or "",
        )
        logger.info(f"AccountPE update_user synced for user {user.email}")
    except AccountPEError as e:
        logger.error(f"AccountPE sync failed for {user.email}: {e}")
    except Exception as e:
        logger.error(f"Unexpected error syncing AccountPE for {user.email}: {e}")


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return _user_response(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile information."""
    if user_update.first_name is not None:
        current_user.first_name = user_update.first_name
    if user_update.last_name is not None:
        current_user.last_name = user_update.last_name
    if user_update.phone is not None:
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

    return _user_response(current_user)


@router.post("/kyc", response_model=KYCResponse)
@limiter.limit("3/hour")
async def submit_kyc(
    request: Request,
    kyc_data: KYCSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit KYC with auto-verification via DeepFace + EasyOCR."""
    if current_user.kyc_status == KYCStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC already approved",
        )

    # Clear old verification scores on resubmission
    current_user.kyc_liveness_score = None
    current_user.kyc_face_match_score = None
    current_user.kyc_ocr_confidence = None
    current_user.kyc_ocr_raw_text = None
    current_user.kyc_verification_method = None

    # 1. Save personal info
    current_user.dob = kyc_data.dob
    current_user.gender = kyc_data.gender
    current_user.address = kyc_data.address
    current_user.street = kyc_data.street
    current_user.city = kyc_data.city
    current_user.postal_code = kyc_data.postal_code
    current_user.id_proof_type = kyc_data.document_type
    current_user.id_proof_no = kyc_data.id_proof_no
    current_user.id_proof_expiry = kyc_data.id_proof_expiry
    current_user.kyc_document_front_url = kyc_data.document_front_url
    current_user.kyc_document_back_url = kyc_data.document_back_url
    current_user.kyc_selfie_url = kyc_data.selfie_url
    current_user.kyc_document_url = kyc_data.document_front_url  # backward compat
    current_user.kyc_submitted_at = datetime.now(timezone.utc)
    current_user.kyc_status = KYCStatus.PENDING

    # 2. Resolve file paths from URLs
    selfie_path = _url_to_filepath(kyc_data.selfie_url)
    front_path = _url_to_filepath(kyc_data.document_front_url)

    # 3. Run verification pipeline
    liveness_score = 0.0
    face_match_score = 0.0
    ocr_confidence = 0.0
    rejection_reasons = []

    try:
        # 3a. Liveness check
        liveness_result = await kyc_verifier_client.check_liveness(selfie_path)
        liveness_score = liveness_result.get("confidence", 0.0)
        current_user.kyc_liveness_score = liveness_score
        if not liveness_result.get("is_real", False):
            rejection_reasons.append("Liveness check failed")
        logger.info(f"KYC liveness for {current_user.email}: {liveness_result}")

        # 3b. Face match
        face_result = await kyc_verifier_client.face_match(selfie_path, front_path)
        # Convert distance to a similarity score (lower distance = higher score)
        distance = face_result.get("distance", 1.0)
        threshold = face_result.get("threshold", 0.4)
        face_match_score = max(0.0, 1.0 - (distance / (threshold * 2.5))) if threshold > 0 else 0.0
        current_user.kyc_face_match_score = face_match_score
        if not face_result.get("match", False):
            rejection_reasons.append("Face does not match ID document")
        logger.info(f"KYC face match for {current_user.email}: {face_result}")

        # 3c. OCR extraction
        ocr_result = await kyc_verifier_client.ocr_extract(front_path)
        ocr_confidence = ocr_result.get("confidence", 0.0)
        current_user.kyc_ocr_confidence = ocr_confidence
        current_user.kyc_ocr_raw_text = ocr_result.get("raw_text", "")
        logger.info(f"KYC OCR for {current_user.email}: confidence={ocr_confidence}")

        # 3d. Cross-validate OCR data against user-supplied data
        ocr_fields = ocr_result.get("extracted_fields", {})
        if ocr_fields:
            user_full_name = f"{current_user.first_name} {current_user.last_name}".lower()
            ocr_name = ocr_fields.get("name", "").lower()
            if ocr_name:
                name_ratio = SequenceMatcher(None, user_full_name, ocr_name).ratio()
                if name_ratio < 0.6:
                    rejection_reasons.append(f"Name mismatch between submission and document (similarity: {name_ratio:.0%})")
                    logger.warning(f"KYC name mismatch for {current_user.email}: user='{user_full_name}' ocr='{ocr_name}' ratio={name_ratio:.2f}")

            ocr_dob = ocr_fields.get("dob", "")
            if ocr_dob and kyc_data.dob:
                user_dob_str = kyc_data.dob.strftime("%Y-%m-%d")
                if ocr_dob != user_dob_str:
                    rejection_reasons.append("Date of birth mismatch between submission and document")
                    logger.warning(f"KYC DOB mismatch for {current_user.email}: user='{user_dob_str}' ocr='{ocr_dob}'")

            ocr_id_no = ocr_fields.get("id_number", "")
            if ocr_id_no and kyc_data.id_proof_no:
                if ocr_id_no.strip() != kyc_data.id_proof_no.strip():
                    rejection_reasons.append("ID number mismatch between submission and document")
                    logger.warning(f"KYC ID number mismatch for {current_user.email}")

    except KYCVerifierError as e:
        logger.warning(f"KYC verifier unavailable for {current_user.email}: {e}")
        # Fall back to manual review if verifier is down
        current_user.kyc_verification_method = "manual_review"
        await db.commit()
        await db.refresh(current_user)

        # Create notification
        notification = Notification(
            user_id=current_user.id,
            title="KYC soumis",
            message="Votre demande KYC a ete soumise. Elle sera examinee manuellement.",
            type=NotificationType.KYC,
        )
        db.add(notification)
        await db.commit()

        return KYCResponse(
            kyc_status=current_user.kyc_status,
            kyc_submitted_at=current_user.kyc_submitted_at,
            kyc_verification_method="manual_review",
        )

    # 4. Decision logic
    auto_approve = settings.kyc_auto_approve_threshold
    manual_threshold = settings.kyc_manual_review_threshold

    all_above_approve = (
        liveness_score >= auto_approve
        and face_match_score >= auto_approve
        and ocr_confidence >= auto_approve
    )
    any_below_reject = (
        liveness_score < manual_threshold
        or face_match_score < manual_threshold
    )

    if all_above_approve and not rejection_reasons:
        # AUTO APPROVED
        current_user.kyc_status = KYCStatus.APPROVED
        current_user.kyc_verification_method = "auto_approved"
        current_user.kyc_rejected_reason = None
        logger.info(f"KYC auto-approved for {current_user.email}")

        await db.commit()
        await db.refresh(current_user)

        # Sync to AccountPE
        await _sync_kyc_to_accountpe(current_user, db)
        await db.commit()

        # Notification + email
        notification = Notification(
            user_id=current_user.id,
            title="KYC approuve",
            message="Votre identite a ete verifiee automatiquement. Vous pouvez utiliser tous les services.",
            type=NotificationType.KYC,
        )
        db.add(notification)
        await db.commit()

        try:
            await email_service.send_kyc_approved(current_user)
        except Exception as e:
            logger.warning(f"Failed to send KYC approval email: {e}")

    elif any_below_reject:
        # AUTO REJECTED
        reason = "; ".join(rejection_reasons) if rejection_reasons else "Verification scores too low"
        current_user.kyc_status = KYCStatus.REJECTED
        current_user.kyc_verification_method = "auto_rejected"
        current_user.kyc_rejected_reason = reason
        logger.info(f"KYC auto-rejected for {current_user.email}: {reason}")

        await db.commit()
        await db.refresh(current_user)

        notification = Notification(
            user_id=current_user.id,
            title="KYC rejete",
            message=f"Votre verification a echoue: {reason}. Veuillez soumettre de nouveaux documents.",
            type=NotificationType.KYC,
        )
        db.add(notification)
        await db.commit()

        try:
            await email_service.send_kyc_rejected(current_user, reason)
        except Exception as e:
            logger.warning(f"Failed to send KYC rejection email: {e}")

    else:
        # MANUAL REVIEW
        current_user.kyc_verification_method = "manual_review"
        logger.info(f"KYC sent to manual review for {current_user.email}")

        await db.commit()
        await db.refresh(current_user)

        notification = Notification(
            user_id=current_user.id,
            title="KYC en cours d'examen",
            message="Votre demande est en cours d'examen par notre equipe. Delai: 24-48h.",
            type=NotificationType.KYC,
        )
        db.add(notification)
        await db.commit()

    return KYCResponse(
        kyc_status=current_user.kyc_status,
        kyc_submitted_at=current_user.kyc_submitted_at,
        kyc_verification_method=current_user.kyc_verification_method,
        kyc_rejected_reason=current_user.kyc_rejected_reason,
    )
