import html
from datetime import datetime, timezone
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
from app.services.email import email_service
from app.services.payin import PAYIN_COUNTRIES
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


async def _sync_kyc_to_accountpe(user: User, db: AsyncSession) -> None:
    """Sync KYC data to AccountPE immediately on submission.

    Raises on failure so the caller can handle fallback.
    """
    # Ensure user has an AccountPE account
    if not user.accountpe_user_id:
        name = f"{user.first_name} {user.last_name}"
        resp = await accountpe_client.create_user(user.email, name, user.country_code)
        if "already exist" in resp.get("message", "").lower():
            found_id = await accountpe_client.find_user_by_email(user.email)
            if found_id:
                user.accountpe_user_id = found_id
        elif resp.get("status") == 200:
            user.accountpe_user_id = str(resp.get("data", {}).get("id", ""))

    if not user.accountpe_user_id:
        raise AccountPEError(f"Could not resolve AccountPE user_id for {user.email}")

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

    # Map country code to country name and mobile code
    country_name_map = {
        "CM": ("Cameroon", "+237"),
        "SN": ("Senegal", "+221"),
        "CI": ("Ivory Coast", "+225"),
        "BF": ("Burkina Faso", "+226"),
        "ML": ("Mali", "+223"),
        "GN": ("Guinea", "+224"),
        "BJ": ("Benin", "+229"),
        "TG": ("Togo", "+228"),
        "NE": ("Niger", "+227"),
        "GA": ("Gabon", "+241"),
        "CG": ("Congo", "+242"),
        "CD": ("DR Congo", "+243"),
    }
    country_info = country_name_map.get(user.country_code, ("Cameroon", "+237"))
    country_name = country_info[0]
    mobile_code = country_info[1]

    await accountpe_client.update_user(
        user_id=user.accountpe_user_id,
        dob=user.dob.strftime("%Y-%m-%d") if user.dob else "",
        mobile=user.phone,
        mobile_code=mobile_code,
        gender=user.gender or "M",
        address=user.address or "",
        street=user.street or "",
        city=user.city or "",
        postal_code=user.postal_code or "00000",
        country=country_name,
        country_iso_code=user.country_code,
        id_proof_type=proof_type_map.get(user.id_proof_type or "", "national_id"),
        id_proof_no=user.id_proof_no or "",
        id_proof_expiry_date=user.id_proof_expiry.strftime("%Y-%m-%d") if user.id_proof_expiry else "",
        id_proof_url_list=proof_urls,
        livelyness_img=user.kyc_selfie_url or "",
    )
    logger.info(f"AccountPE update_user synced for user {user.email}")


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


def _map_accountpe_status(final_status: str | None) -> KYCStatus:
    """Map AccountPE final_status to our KYCStatus."""
    if not final_status:
        return KYCStatus.PENDING
    normalized = final_status.strip().lower()
    if normalized in ("approved", "active", "verified"):
        return KYCStatus.APPROVED
    if normalized in ("rejected", "declined", "failed"):
        return KYCStatus.REJECTED
    return KYCStatus.PENDING


@router.post("/kyc", response_model=KYCResponse)
@limiter.limit("3/hour")
async def submit_kyc(
    request: Request,
    kyc_data: KYCSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit KYC — delegates verification to AccountPE (Alibaba Lens)."""
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

    # 1. Save personal info + document URLs
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

    await db.commit()
    await db.refresh(current_user)

    # 2. Sync to AccountPE immediately (create_user + update_user)
    try:
        await _sync_kyc_to_accountpe(current_user, db)
        await db.commit()
        await db.refresh(current_user)
        current_user.kyc_verification_method = "accountpe"
        logger.info(f"KYC synced to AccountPE for {current_user.email}")
    except Exception as e:
        logger.error(f"AccountPE sync failed for {current_user.email}: {e}")
        # Fallback: stay PENDING, admin can approve manually
        current_user.kyc_verification_method = "pending_sync"
        await db.commit()
        await db.refresh(current_user)

        notification = Notification(
            user_id=current_user.id,
            title="KYC soumis",
            message="Votre demande KYC a ete soumise. Verification en cours.",
            type=NotificationType.KYC,
        )
        db.add(notification)
        await db.commit()

        return KYCResponse(
            kyc_status=current_user.kyc_status,
            kyc_submitted_at=current_user.kyc_submitted_at,
            kyc_verification_method=current_user.kyc_verification_method,
        )

    # 3. Query AccountPE for verification result
    kyc_status = KYCStatus.PENDING
    if current_user.accountpe_user_id:
        try:
            user_data = await accountpe_client.get_user(current_user.accountpe_user_id)
            data = user_data.get("data", user_data)
            final_status = data.get("final_status") or data.get("status")
            kyc_status = _map_accountpe_status(str(final_status) if final_status else None)
            logger.info(f"AccountPE final_status for {current_user.email}: {final_status} → {kyc_status}")
        except Exception as e:
            logger.warning(f"Could not fetch AccountPE status for {current_user.email}: {e}")

    # 4. Update local status and send notification/email
    current_user.kyc_status = kyc_status

    if kyc_status == KYCStatus.APPROVED:
        current_user.kyc_verification_method = "accountpe_approved"
        current_user.kyc_rejected_reason = None
        await db.commit()
        await db.refresh(current_user)

        notification = Notification(
            user_id=current_user.id,
            title="KYC approuve",
            message="Votre identite a ete verifiee. Vous pouvez utiliser tous les services.",
            type=NotificationType.KYC,
        )
        db.add(notification)
        await db.commit()

        try:
            await email_service.send_kyc_approved(current_user)
        except Exception as e:
            logger.warning(f"Failed to send KYC approval email: {e}")

    elif kyc_status == KYCStatus.REJECTED:
        reason = "Verification echouee par le fournisseur d'identite"
        current_user.kyc_verification_method = "accountpe_rejected"
        current_user.kyc_rejected_reason = reason
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
        # PENDING — AccountPE is still processing
        current_user.kyc_verification_method = "accountpe_pending"
        await db.commit()
        await db.refresh(current_user)

        notification = Notification(
            user_id=current_user.id,
            title="KYC en cours de verification",
            message="Vos documents ont ete envoyes pour verification. Vous serez notifie du resultat.",
            type=NotificationType.KYC,
        )
        db.add(notification)
        await db.commit()

        try:
            pending_html = f"<p>Bonjour {html.escape(current_user.first_name)},</p><p>Votre demande KYC a bien été reçue et est en cours de traitement. Vous serez notifié dès que la vérification sera terminée.</p>"
            await email_service.send_email(current_user.email, "KYC - Demande reçue", pending_html)
        except Exception as e:
            logger.warning(f"Failed to send KYC pending email: {e}")

    return KYCResponse(
        kyc_status=current_user.kyc_status,
        kyc_submitted_at=current_user.kyc_submitted_at,
        kyc_verification_method=current_user.kyc_verification_method,
        kyc_rejected_reason=current_user.kyc_rejected_reason,
    )


@router.get("/kyc/check-status", response_model=KYCResponse)
@limiter.limit("5/minute")
async def check_kyc_status(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Poll AccountPE for updated KYC verification status."""
    if current_user.kyc_status == KYCStatus.APPROVED:
        return KYCResponse(
            kyc_status=current_user.kyc_status,
            kyc_submitted_at=current_user.kyc_submitted_at,
            kyc_verification_method=current_user.kyc_verification_method,
            kyc_rejected_reason=current_user.kyc_rejected_reason,
        )

    if not current_user.accountpe_user_id:
        return KYCResponse(
            kyc_status=current_user.kyc_status,
            kyc_submitted_at=current_user.kyc_submitted_at,
            kyc_verification_method=current_user.kyc_verification_method,
            kyc_rejected_reason=current_user.kyc_rejected_reason,
        )

    try:
        user_data = await accountpe_client.get_user(current_user.accountpe_user_id)
        data = user_data.get("data", user_data)
        final_status = data.get("final_status") or data.get("status")
        new_status = _map_accountpe_status(str(final_status) if final_status else None)
        logger.info(f"KYC check-status for {current_user.email}: final_status={final_status} → {new_status}")

        if new_status != current_user.kyc_status:
            old_status = current_user.kyc_status
            current_user.kyc_status = new_status

            if new_status == KYCStatus.APPROVED:
                current_user.kyc_verification_method = "accountpe_approved"
                current_user.kyc_rejected_reason = None
                await db.commit()
                await db.refresh(current_user)

                notification = Notification(
                    user_id=current_user.id,
                    title="KYC approuve",
                    message="Votre identite a ete verifiee. Vous pouvez utiliser tous les services.",
                    type=NotificationType.KYC,
                )
                db.add(notification)
                await db.commit()

                try:
                    await email_service.send_kyc_approved(current_user)
                except Exception as e:
                    logger.warning(f"Failed to send KYC approval email: {e}")

            elif new_status == KYCStatus.REJECTED:
                reason = "Verification echouee par le fournisseur d'identite"
                current_user.kyc_verification_method = "accountpe_rejected"
                current_user.kyc_rejected_reason = reason
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
                await db.commit()
                await db.refresh(current_user)

            logger.info(f"KYC status changed for {current_user.email}: {old_status} → {new_status}")

    except Exception as e:
        logger.warning(f"Failed to check AccountPE status for {current_user.email}: {e}")

    return KYCResponse(
        kyc_status=current_user.kyc_status,
        kyc_submitted_at=current_user.kyc_submitted_at,
        kyc_verification_method=current_user.kyc_verification_method,
        kyc_rejected_reason=current_user.kyc_rejected_reason,
    )
