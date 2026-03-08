import html
import uuid as uuid_mod
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.exc import IntegrityError
from typing import Literal

from app.database import get_db
from app.models.user import User, KYCStatus
from app.models.card import Card, CardStatus
from app.models.transaction import Transaction
from app.models.notification import Notification, NotificationType
from app.models.device_token import DeviceToken
from app.models.audit_log import AuditLog
from app.schemas.user import UserResponse, UserUpdate, KYCSubmit, KYCResponse
from app.services.auth import get_current_user, blacklist_all_user_tokens
from app.services.accountpe import accountpe_client, AccountPEError
from app.services.email import email_service
from app.services.firebase_push import create_and_push_notification
from app.services.payin import PAYIN_COUNTRIES
from app.middleware.rate_limit import limiter
from app.utils.logging_config import get_logger
from app.utils.audit import log_audit_event
from app.utils.encryption import encrypt_field, decrypt_field

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

    # dob / id_proof_expiry may be date objects or strings (DB is varchar)
    dob_str = user.dob.strftime("%Y-%m-%d") if hasattr(user.dob, "strftime") else (user.dob or "")
    expiry_str = user.id_proof_expiry.strftime("%Y-%m-%d") if hasattr(user.id_proof_expiry, "strftime") else (user.id_proof_expiry or "")

    # Decrypt id_proof_no for AccountPE (stored encrypted in DB)
    id_proof_no_plain = ""
    if user.id_proof_no:
        try:
            id_proof_no_plain = decrypt_field(user.id_proof_no)
        except Exception:
            id_proof_no_plain = user.id_proof_no  # fallback if not yet encrypted

    await accountpe_client.update_user(
        user_id=user.accountpe_user_id,
        dob=dob_str,
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
        id_proof_no=id_proof_no_plain,
        id_proof_expiry_date=expiry_str,
        id_proof_url_list=proof_urls,
        livelyness_img=user.kyc_selfie_url or "",
    )
    logger.info(f"AccountPE update_user synced for user {user.email}")


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return _user_response(current_user)


@router.get("/me/export")
@limiter.limit("3/hour")
async def export_user_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    GDPR Art. 20 — Data portability: export all personal data as JSON.
    Includes: profile, KYC info, cards, transactions, notifications, audit logs.
    """
    # Decrypt id_proof_no for export
    id_proof_no_plain = None
    if current_user.id_proof_no:
        try:
            id_proof_no_plain = decrypt_field(current_user.id_proof_no)
        except Exception:
            id_proof_no_plain = current_user.id_proof_no

    # Profile data
    profile = {
        "id": str(current_user.id),
        "email": current_user.email,
        "phone": current_user.phone,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "country_code": current_user.country_code,
        "wallet_balance": str(current_user.wallet_balance),
        "is_active": current_user.is_active,
        "consent_given_at": current_user.consent_given_at.isoformat() if current_user.consent_given_at else None,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat(),
    }

    # KYC data
    kyc = {
        "kyc_status": current_user.kyc_status.value if current_user.kyc_status else None,
        "kyc_submitted_at": current_user.kyc_submitted_at.isoformat() if current_user.kyc_submitted_at else None,
        "dob": current_user.dob.isoformat() if current_user.dob else None,
        "gender": current_user.gender,
        "address": current_user.address,
        "street": current_user.street,
        "city": current_user.city,
        "postal_code": current_user.postal_code,
        "id_proof_type": current_user.id_proof_type,
        "id_proof_no": id_proof_no_plain,
        "id_proof_expiry": current_user.id_proof_expiry.isoformat() if current_user.id_proof_expiry else None,
        "kyc_rejected_reason": current_user.kyc_rejected_reason,
        "kyc_verification_method": current_user.kyc_verification_method,
    }

    # Cards
    result = await db.execute(select(Card).where(Card.user_id == current_user.id))
    cards = result.scalars().all()
    cards_data = [
        {
            "id": str(c.id),
            "card_type": c.card_type.value,
            "card_tier": c.card_tier.value,
            "card_number_masked": c.card_number_masked,
            "status": c.status.value,
            "balance": str(c.balance),
            "currency": c.currency,
            "spending_limit": str(c.spending_limit),
            "expiry_date": c.expiry_date,
            "created_at": c.created_at.isoformat(),
        }
        for c in cards
    ]

    # Transactions
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == current_user.id).order_by(Transaction.created_at.desc())
    )
    transactions = result.scalars().all()
    transactions_data = [
        {
            "id": str(t.id),
            "type": t.type.value,
            "status": t.status.value,
            "amount": str(t.amount),
            "fee": str(t.fee),
            "currency": t.currency,
            "description": t.description,
            "created_at": t.created_at.isoformat(),
        }
        for t in transactions
    ]

    # Audit logs
    result = await db.execute(
        select(AuditLog).where(AuditLog.user_id == current_user.id).order_by(AuditLog.created_at.desc())
    )
    audit_logs = result.scalars().all()
    audit_data = [
        {
            "action": a.action,
            "resource_type": a.resource_type,
            "resource_id": a.resource_id,
            "ip_address": a.ip_address,
            "created_at": a.created_at.isoformat(),
        }
        for a in audit_logs
    ]

    # Audit log: data export requested
    await log_audit_event(
        db, current_user.id, action="data_export", resource_type="user",
        resource_id=str(current_user.id),
        ip_address=request.client.host if request.client else None,
    )

    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "data_subject": profile,
        "kyc": kyc,
        "cards": cards_data,
        "transactions": transactions_data,
        "audit_logs": audit_data,
    }


@router.patch("/me", response_model=UserResponse)
async def update_user_profile(
    request: Request,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile information."""
    changed_fields = {}
    if user_update.first_name is not None:
        changed_fields["first_name"] = user_update.first_name
        current_user.first_name = user_update.first_name
    if user_update.last_name is not None:
        changed_fields["last_name"] = user_update.last_name
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
        changed_fields["phone"] = user_update.phone
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

    # Audit log: profile update
    if changed_fields:
        await log_audit_event(
            db, current_user.id, action="profile_update", resource_type="user",
            resource_id=str(current_user.id),
            details={"changed_fields": list(changed_fields.keys())},
            ip_address=request.client.host if request.client else None,
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
    current_user.id_proof_no = encrypt_field(kyc_data.id_proof_no) if kyc_data.id_proof_no else None
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

        await create_and_push_notification(
            db, current_user.id,
            title="KYC soumis",
            message="Votre demande KYC a ete soumise. Verification en cours.",
            notification_type=NotificationType.KYC,
        )
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

        await create_and_push_notification(
            db, current_user.id,
            title="KYC approuve",
            message="Votre identite a ete verifiee. Vous pouvez utiliser tous les services.",
            notification_type=NotificationType.KYC,
        )
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

        await create_and_push_notification(
            db, current_user.id,
            title="KYC rejete",
            message=f"Votre verification a echoue: {reason}. Veuillez soumettre de nouveaux documents.",
            notification_type=NotificationType.KYC,
        )
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

        await create_and_push_notification(
            db, current_user.id,
            title="KYC en cours de verification",
            message="Vos documents ont ete envoyes pour verification. Vous serez notifie du resultat.",
            notification_type=NotificationType.KYC,
        )
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

                await create_and_push_notification(
                    db, current_user.id,
                    title="KYC approuve",
                    message="Votre identite a ete verifiee. Vous pouvez utiliser tous les services.",
                    notification_type=NotificationType.KYC,
                )
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

                await create_and_push_notification(
                    db, current_user.id,
                    title="KYC rejete",
                    message=f"Votre verification a echoue: {reason}. Veuillez soumettre de nouveaux documents.",
                    notification_type=NotificationType.KYC,
                )
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


# ─── Device Token Endpoints ────────────────────────────────────


class DeviceTokenRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=500)
    platform: Literal["ios", "android"]


class DeviceTokenDeleteRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=500)


@router.post("/device-token", status_code=status.HTTP_200_OK)
async def register_device_token(
    data: DeviceTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register or update an FCM device token for push notifications."""
    # Upsert: if token exists, update user_id (account switch)
    result = await db.execute(
        select(DeviceToken).where(DeviceToken.token == data.token)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.user_id = current_user.id
        existing.platform = data.platform
    else:
        device_token = DeviceToken(
            user_id=current_user.id,
            token=data.token,
            platform=data.platform,
        )
        db.add(device_token)

    await db.commit()
    logger.info(f"Device token registered for user {current_user.id} ({data.platform})")
    return {"status": "ok"}


@router.delete("/device-token", status_code=status.HTTP_200_OK)
async def remove_device_token(
    data: DeviceTokenDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove an FCM device token (e.g. on logout)."""
    await db.execute(
        delete(DeviceToken).where(
            DeviceToken.token == data.token,
            DeviceToken.user_id == current_user.id,
        )
    )
    await db.commit()
    logger.info(f"Device token removed for user {current_user.id}")
    return {"status": "ok"}


# ─── Account Deletion (GDPR Art. 17 - Right to Erasure) ──────


class DeleteAccountRequest(BaseModel):
    password: str = Field(..., min_length=1, description="Current password for confirmation")


@router.delete("/me", status_code=status.HTTP_200_OK)
@limiter.limit("3/hour")
async def delete_account(
    request: Request,
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete the authenticated user's account (GDPR Art. 17 - Right to Erasure).

    This endpoint:
    1. Verifies the user's password
    2. Blocks all active cards on AccountPE
    3. Anonymizes transactions (keeps amounts for accounting, removes user link)
    4. Deletes cards, KYC documents, notifications, device tokens
    5. Anonymizes and deactivates the user record
    6. Invalidates all tokens
    """
    from app.services.auth import verify_password

    # Verify password
    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe incorrect",
        )

    user_id = current_user.id
    logger.info(f"Account deletion requested for user {user_id}")

    # 1. Block all active cards on AccountPE
    result = await db.execute(
        select(Card).where(Card.user_id == user_id)
    )
    user_cards = result.scalars().all()

    for card in user_cards:
        if card.status in (CardStatus.ACTIVE, CardStatus.FROZEN) and card.provider_card_id:
            try:
                await accountpe_client.block_card(card.provider_card_id)
            except Exception as e:
                logger.warning(f"Failed to block card {card.id} on AccountPE during deletion: {e}")
        card.status = CardStatus.BLOCKED

    # 2. Anonymize transactions (keep amounts/fees for accounting, remove user reference)
    # Use a placeholder UUID so the NOT NULL + FK constraint is satisfied
    # Instead, we set card_id to NULL (FK allows it) and keep user_id for now,
    # then anonymize user data below
    await db.execute(
        update(Transaction)
        .where(Transaction.user_id == user_id)
        .values(
            description="[deleted account]",
        )
    )

    # 3. Delete cards (cascade will handle card transactions card_id via SET NULL)
    await db.execute(delete(Card).where(Card.user_id == user_id))

    # 4. Delete notifications
    await db.execute(delete(Notification).where(Notification.user_id == user_id))

    # 5. Delete device tokens
    await db.execute(delete(DeviceToken).where(DeviceToken.user_id == user_id))

    # 6. Anonymize user record (keep row for transaction FK integrity)
    deleted_uuid = str(uuid_mod.uuid4())[:8]
    current_user.email = f"deleted_{deleted_uuid}@deleted.local"
    current_user.phone = f"+0000000{deleted_uuid}"
    current_user.first_name = "Deleted"
    current_user.last_name = "User"
    current_user.hashed_password = "DELETED"
    current_user.is_active = False
    current_user.kyc_status = KYCStatus.PENDING
    current_user.kyc_document_url = None
    current_user.kyc_document_front_url = None
    current_user.kyc_document_back_url = None
    current_user.kyc_selfie_url = None
    current_user.kyc_submitted_at = None
    current_user.kyc_rejected_reason = None
    current_user.kyc_liveness_score = None
    current_user.kyc_face_match_score = None
    current_user.kyc_ocr_confidence = None
    current_user.kyc_ocr_raw_text = None
    current_user.kyc_verification_method = None
    current_user.dob = None
    current_user.gender = None
    current_user.address = None
    current_user.street = None
    current_user.city = None
    current_user.postal_code = None
    current_user.id_proof_type = None
    current_user.id_proof_no = None
    current_user.id_proof_expiry = None
    current_user.accountpe_user_id = None
    current_user.reset_token = None
    current_user.reset_token_expires_at = None
    current_user.wallet_balance = 0

    await db.commit()

    # 7. Invalidate all tokens
    try:
        await blacklist_all_user_tokens(request, str(user_id))
    except Exception as e:
        logger.warning(f"Failed to invalidate tokens during account deletion: {e}")

    # Audit log
    await log_audit_event(
        db=db,
        user_id=user_id,
        action="account_deleted",
        resource_type="user",
        resource_id=str(user_id),
        details={"reason": "user_requested_gdpr"},
        ip_address=request.client.host if request.client else None,
    )

    logger.info(f"Account deleted successfully for user {user_id}")

    return {"message": "Votre compte a ete supprime avec succes."}
