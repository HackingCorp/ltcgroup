"""
Data retention enforcement script.

Runs as a scheduled task (cron) to purge data that has exceeded its retention period.

Retention periods:
- KYC documents: 6 months after approval
- Audit logs (non-financial): 1 year
- Financial transaction audit logs: 5 years
- Anonymize deleted accounts: 30 days after deactivation

Usage: docker exec ltc-backend python -m scripts.purge_old_data
Cron:  0 3 * * * docker exec ltc-backend python -m scripts.purge_old_data
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, update, delete, and_
from app.database import async_session
from app.models.user import User, KYCStatus
from app.models.audit_log import AuditLog


# Financial audit actions that follow 5-year retention
FINANCIAL_ACTIONS = {
    "wallet_topup", "wallet_transfer_to_card", "wallet_withdrawal",
    "card_purchase", "card_topup", "card_withdraw", "card_freeze",
    "card_unfreeze", "card_block",
}


async def purge_kyc_documents(db, now):
    """Delete KYC document URLs and verification data 6 months after approval."""
    cutoff = now - timedelta(days=180)

    result = await db.execute(
        select(User).where(
            User.kyc_status == KYCStatus.APPROVED,
            User.kyc_submitted_at.isnot(None),
            User.kyc_submitted_at < cutoff,
            User.kyc_document_url.isnot(None),
        )
    )
    users = result.scalars().all()

    count = 0
    for user in users:
        user.kyc_document_url = None
        user.kyc_document_front_url = None
        user.kyc_document_back_url = None
        user.kyc_selfie_url = None
        user.kyc_liveness_score = None
        user.kyc_face_match_score = None
        user.kyc_ocr_confidence = None
        user.kyc_ocr_raw_text = None
        # Keep id_proof_type and encrypted id_proof_no for regulatory reference
        count += 1

    if count:
        await db.commit()
    print(f"KYC documents purged: {count} users")
    return count


async def purge_old_audit_logs(db, now):
    """Delete non-financial audit logs older than 1 year, financial logs older than 5 years."""
    # Non-financial: 1 year
    cutoff_1y = now - timedelta(days=365)
    result = await db.execute(
        delete(AuditLog).where(
            AuditLog.created_at < cutoff_1y,
            AuditLog.action.notin_(FINANCIAL_ACTIONS),
        )
    )
    non_financial_count = result.rowcount
    await db.commit()
    print(f"Non-financial audit logs purged: {non_financial_count}")

    # Financial: 5 years
    cutoff_5y = now - timedelta(days=365 * 5)
    result = await db.execute(
        delete(AuditLog).where(
            AuditLog.created_at < cutoff_5y,
            AuditLog.action.in_(FINANCIAL_ACTIONS),
        )
    )
    financial_count = result.rowcount
    await db.commit()
    print(f"Financial audit logs purged: {financial_count}")

    return non_financial_count + financial_count


async def anonymize_deleted_accounts(db, now):
    """Anonymize personal data for accounts deactivated > 30 days ago."""
    cutoff = now - timedelta(days=30)

    result = await db.execute(
        select(User).where(
            User.is_active == False,
            User.updated_at < cutoff,
            User.email.notlike("deleted_%@anonymized.local"),  # skip already anonymized
        )
    )
    users = result.scalars().all()

    count = 0
    for user in users:
        anon_id = user.id.hex[:12]
        user.email = f"deleted_{anon_id}@anonymized.local"
        user.phone = f"+0000000{anon_id[:8]}"
        user.first_name = "Deleted"
        user.last_name = "User"
        user.dob = None
        user.gender = None
        user.address = None
        user.street = None
        user.city = None
        user.postal_code = None
        user.id_proof_no = None
        user.id_proof_type = None
        user.id_proof_expiry = None
        user.kyc_document_url = None
        user.kyc_document_front_url = None
        user.kyc_document_back_url = None
        user.kyc_selfie_url = None
        user.kyc_liveness_score = None
        user.kyc_face_match_score = None
        user.kyc_ocr_confidence = None
        user.kyc_ocr_raw_text = None
        user.reset_token = None
        user.reset_token_expires_at = None
        count += 1

    if count:
        await db.commit()
    print(f"Deleted accounts anonymized: {count}")
    return count


async def main():
    now = datetime.now(timezone.utc)
    print(f"Data retention purge started at {now.isoformat()}")
    print("=" * 60)

    async with async_session() as db:
        await purge_kyc_documents(db, now)
        await purge_old_audit_logs(db, now)
        await anonymize_deleted_accounts(db, now)

    print("=" * 60)
    print("Data retention purge completed.")


if __name__ == "__main__":
    asyncio.run(main())
