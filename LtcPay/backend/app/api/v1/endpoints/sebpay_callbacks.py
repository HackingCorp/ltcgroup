"""
SebPay webhook receiver.

SebPay POSTs to the callback_url given at initiation when a collection
changes status:

  {"transaction_id", "external_reference", "status", "amount", "currency",
   "customer_phone", "created_at", "updated_at"}

signed HMAC-SHA256 over the raw body with our secret key (hex) in
X-SebPay-Signature. Unsigned or mis-signed deliveries are rejected.

status is approved, rejected or pending. A rejection carries no reason.
settle_from_sebpay() is shared with the reconciliation sweep, so a webhook
and a status check can never reach different verdicts.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.services.provider_service import provider_service
from app.services.sebpay_service import (
    STATUS_APPROVED, STATUS_PENDING, STATUS_REJECTED, verify_webhook_signature,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# EXPIRED is our own timeout, not a verdict: a late approval still wins.
_TERMINAL = (PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.CANCELLED)

REJECTED_MESSAGE = "SebPay: paiement refuse"


def _amount_matches(payment: Payment, reported) -> bool:
    if reported is None:
        return True  # nothing to compare; the signature vouches for the rest
    try:
        return Decimal(str(reported)) == Decimal(int(payment.amount))
    except (InvalidOperation, ValueError, TypeError):
        return False


def _is_stale_failure(payment: Payment, message: str | None) -> bool:
    """A refusal that must not settle the payment, see payment_router._initiating."""
    from app.services.payment_router import hold_failure_during_initiation

    # While PENDING the provider column still holds its creation default.
    if payment.status == PaymentStatus.PENDING:
        return hold_failure_during_initiation(payment.reference, "SEBPAY", message)
    if payment.provider != PaymentProvider.SEBPAY:
        logger.info(
            "SebPay: failure for %s ignored, the payin now runs on %s",
            payment.reference, payment.provider.value,
        )
        return True
    return False


async def settle_from_sebpay(
    db: AsyncSession, payment: Payment, data: dict, source: str,
) -> PaymentStatus | None:
    """Apply a SebPay collection state to a payment. Idempotent.

    Returns the new status when the payment changed, None otherwise.
    """
    status = str(data.get("status") or "").lower()
    if status == STATUS_APPROVED:
        new_status = PaymentStatus.COMPLETED
    elif status == STATUS_REJECTED:
        new_status = PaymentStatus.FAILED
    elif status == STATUS_PENDING:
        # Nothing to record: the router moves the payment to PROCESSING
        # itself, and doing it here would beat it to the row and leave the
        # provider column on its creation default.
        return None
    else:
        logger.warning(
            "SebPay %s: unknown status %r for %s", source, status, payment.reference,
        )
        return None

    if payment.status in _TERMINAL:
        logger.info(
            "SebPay %s: payment %s already %s, skipping",
            source, payment.reference, payment.status.value,
        )
        return None

    if new_status == PaymentStatus.COMPLETED and not _amount_matches(payment, data.get("amount")):
        # Never credit a merchant for an amount we did not ask for.
        logger.error(
            "SebPay %s: amount mismatch for %s — SebPay says %s %s, payment is %s %s. "
            "Left untouched for manual review.",
            source, payment.reference, data.get("amount"), data.get("currency"),
            payment.amount, payment.currency,
        )
        return None

    message = data.get("message") or data.get("reason")
    if new_status == PaymentStatus.FAILED:
        if payment.status == PaymentStatus.EXPIRED:
            return None  # already settled from the merchant's point of view
        if _is_stale_failure(payment, message or REJECTED_MESSAGE):
            return None

    old_status = payment.status
    merged = dict(payment.touchpay_data or {})
    merged.update({
        "provider": "SEBPAY",
        "sebpay_status": status,
        "message": message or (REJECTED_MESSAGE if new_status == PaymentStatus.FAILED else "SebPay: approved"),
        "sebpay_payload": data,
    })
    values: dict = {
        "status": new_status,
        "touchpay_data": merged,
        # A fast approval can land while the initiation is still in flight
        # and the column still says TOUCHPAY.
        "provider": PaymentProvider.SEBPAY,
    }
    if data.get("transaction_id"):
        values["provider_transaction_id"] = str(data["transaction_id"])
    if new_status == PaymentStatus.COMPLETED:
        values["completed_at"] = datetime.now(timezone.utc)

    result = await db.execute(
        update(Payment)
        .where(Payment.id == payment.id, Payment.status == old_status)
        .values(**values)
        .returning(Payment.id)
    )
    if result.first() is None:
        logger.info("SebPay %s: concurrent update for %s", source, payment.reference)
        return None
    await db.commit()

    logger.info(
        "SebPay %s: payment %s updated %s -> %s",
        source, payment.reference, old_status.value, new_status.value,
    )
    try:
        from app.services.notification import notify_merchant
        asyncio.create_task(notify_merchant(str(payment.id)))
    except Exception as exc:
        logger.warning("Failed to trigger merchant notification: %s", exc)
    return new_status


@router.post("/sebpay")
async def sebpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    raw_body = await request.body()

    provider = await provider_service.get_provider(db, "SEBPAY")
    secret = ""
    if provider:
        secret = provider_service.decrypted_config(provider).get("secret_key") or ""
    signature = request.headers.get("X-SebPay-Signature")
    if not verify_webhook_signature(raw_body, signature, secret):
        logger.warning(
            "SebPay webhook: invalid or missing signature (has_signature=%s) body=%s",
            bool(signature), raw_body[:300],
        )
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        data = json.loads(raw_body or b"{}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    if isinstance(data, dict) and isinstance(data.get("data"), dict):
        data = data["data"]  # tolerate the API envelope
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    reference = data.get("external_reference")
    transaction_id = data.get("transaction_id")
    conditions = []
    if reference:
        conditions.append(Payment.reference == str(reference))
    if transaction_id:
        conditions.append(Payment.provider_transaction_id == str(transaction_id))
    payment = None
    if conditions:
        payment = (await db.execute(
            select(Payment).where(or_(*conditions)).limit(1)
        )).scalar_one_or_none()
    if payment is None:
        logger.warning(
            "SebPay webhook: payment not found (external_reference=%s transaction_id=%s)",
            reference, transaction_id,
        )
        raise HTTPException(status_code=404, detail="Payment not found")

    new_status = await settle_from_sebpay(db, payment, data, "webhook")
    return {
        "status": "ok",
        "reference": payment.reference,
        "new_status": new_status.value if new_status else payment.status.value,
    }
