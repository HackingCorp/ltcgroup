"""
Smobilpay (Maviance S3P) webhook receiver.

When a collection reaches a final state Smobilpay POSTs to the callbackUrl
given at collectstd (or the one registered with Maviance ops):

  headers  X-Delivery (UUID, stable across retries), X-Ptn, X-Signature
  body     {"timestamp", "trid", "errorCode", "status"}   (strings)

X-Signature is the lowercase hex HMAC-SHA1 of the raw body keyed with the
shared secret configured with Maviance — and an EMPTY string when none was
configured. So the body is never trusted for the verdict: it only says which
payment to look at, and the status is read back from GET /v2/verifytx. A
forged callback can then at most trigger a status check. When we do hold a
webhook_secret, a delivery that does not carry a valid signature is refused.

Acknowledge rules (Maviance): any 2xx stops retries, 5xx/408/429 are retried
(5 attempts, backoff), other 4xx are not. A payment we do not know is
acknowledged; a status we could not read yet answers 503 so the delivery
comes back, and the reconciliation sweep covers the rest.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.services.provider_service import provider_service
from app.services.smobilpay_service import (
    STATUS_ERRORED, STATUS_PENDING, STATUS_REVERSED, STATUS_SUCCESS,
    amount_covers, effective_config, error_code_message, smobilpay_service,
    verify_webhook_signature,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# EXPIRED is our own timeout, not a verdict: a late success still wins.
_TERMINAL = (PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.CANCELLED)


def _is_stale_failure(payment: Payment, message: str) -> bool:
    """A refusal that must not settle the payment, see payment_router._initiating."""
    from app.services.payment_router import hold_failure_during_initiation

    if payment.status == PaymentStatus.PENDING:
        return hold_failure_during_initiation(payment.reference, "SMOBILPAY", message)
    if payment.provider != PaymentProvider.SMOBILPAY:
        logger.info(
            "Smobilpay: failure for %s ignored, the payin now runs on %s",
            payment.reference, payment.provider.value,
        )
        return True
    return False


async def settle_from_smobilpay(
    db: AsyncSession, payment: Payment, data: dict, source: str,
) -> PaymentStatus | None:
    """Apply a verifytx PaymentStatus to a payment. Idempotent.

    Returns the new status when the payment changed, None otherwise.
    """
    status = str(data.get("status") or "").upper()
    if data.get("trid") and str(data["trid"]) != payment.reference:
        logger.error(
            "Smobilpay %s: status for trid %s offered to %s — ignored",
            source, data.get("trid"), payment.reference,
        )
        return None

    if status == STATUS_PENDING:
        return None
    if status == STATUS_SUCCESS:
        new_status = PaymentStatus.COMPLETED
    elif status in (STATUS_ERRORED, STATUS_REVERSED):
        new_status = PaymentStatus.FAILED
    else:
        logger.warning("Smobilpay %s: unknown status %r for %s", source, status, payment.reference)
        return None

    if status == STATUS_REVERSED and payment.status == PaymentStatus.COMPLETED:
        logger.error(
            "Smobilpay %s: %s was REVERSED after completion (ptn %s) — the merchant "
            "was already credited; manual review needed.",
            source, payment.reference, data.get("ptn"),
        )
        return None

    if payment.status in _TERMINAL:
        logger.info(
            "Smobilpay %s: payment %s already %s, skipping",
            source, payment.reference, payment.status.value,
        )
        return None

    if new_status == PaymentStatus.COMPLETED and not amount_covers(
        data.get("priceLocalCur"), payment.amount,
    ):
        # Never credit a merchant for less than we asked for.
        logger.error(
            "Smobilpay %s: amount mismatch for %s — Smobilpay says %s %s, payment is %s %s. "
            "Left untouched for manual review.",
            source, payment.reference, data.get("priceLocalCur"), data.get("localCur"),
            payment.amount, payment.currency,
        )
        return None

    if new_status == PaymentStatus.FAILED:
        message = (
            "Smobilpay: paiement annule (REVERSED)" if status == STATUS_REVERSED
            else error_code_message(data.get("errorCode"))
        )
        if payment.status == PaymentStatus.EXPIRED:
            return None  # already settled from the merchant's point of view
        if _is_stale_failure(payment, message):
            return None
    else:
        message = "Smobilpay: paiement confirme"

    old_status = payment.status
    merged = dict(payment.touchpay_data or {})
    merged.update({
        "provider": "SMOBILPAY",
        "smobilpay_status": status,
        "message": message,
        "smobilpay_payload": data,
    })
    values: dict = {
        "status": new_status,
        "touchpay_data": merged,
        # A fast success can land while the initiation is still in flight.
        "provider": PaymentProvider.SMOBILPAY,
    }
    if data.get("ptn"):
        values["provider_transaction_id"] = str(data["ptn"])
    if new_status == PaymentStatus.COMPLETED:
        values["completed_at"] = datetime.now(timezone.utc)

    result = await db.execute(
        update(Payment)
        .where(Payment.id == payment.id, Payment.status == old_status)
        .values(**values)
        .returning(Payment.id)
    )
    if result.first() is None:
        logger.info("Smobilpay %s: concurrent update for %s", source, payment.reference)
        return None
    await db.commit()

    logger.info(
        "Smobilpay %s: payment %s updated %s -> %s",
        source, payment.reference, old_status.value, new_status.value,
    )
    try:
        from app.services.notification import notify_merchant
        asyncio.create_task(notify_merchant(str(payment.id)))
    except Exception as exc:
        logger.warning("Failed to trigger merchant notification: %s", exc)
    return new_status


@router.post("/smobilpay")
async def smobilpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    raw_body = await request.body()

    provider = await provider_service.get_provider(db, "SMOBILPAY")
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not configured")
    secret = effective_config(provider).get("webhook_secret") or ""
    signature = request.headers.get("X-Signature") or ""
    if secret and not verify_webhook_signature(raw_body, signature, secret):
        logger.warning(
            "Smobilpay webhook: invalid or missing signature (has_signature=%s) delivery=%s",
            bool(signature), request.headers.get("X-Delivery"),
        )
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        data = json.loads(raw_body or b"{}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    trid = str(data.get("trid") or "").strip()
    ptn = (request.headers.get("X-Ptn") or str(data.get("ptn") or "")).strip()
    conditions = []
    if trid:
        conditions.append(Payment.reference == trid)
    if ptn:
        conditions.append(Payment.provider_transaction_id == ptn)
    payment = None
    if conditions:
        payment = (await db.execute(
            select(Payment).where(or_(*conditions)).limit(1)
        )).scalar_one_or_none()
    if payment is None:
        # Not ours: acknowledge so it is not retried (Maviance's guidance).
        logger.warning("Smobilpay webhook: payment not found (trid=%s ptn=%s)", trid, ptn)
        return {"status": "ignored"}

    logger.info(
        "Smobilpay webhook for %s: status=%s errorCode=%s signed=%s",
        payment.reference, data.get("status"), data.get("errorCode"), bool(secret),
    )
    if str(data.get("status") or "").upper() == STATUS_PENDING:
        return {"status": "ok", "reference": payment.reference, "new_status": payment.status.value}

    verified = await smobilpay_service.verify_transaction(
        provider, trid=payment.reference if not ptn else None, ptn=ptn or None,
    )
    if verified is None:
        # Could not read the verdict yet (or throttled): have it redelivered.
        raise HTTPException(status_code=503, detail="Status not available yet")

    new_status = await settle_from_smobilpay(db, payment, verified, "webhook")
    return {
        "status": "ok",
        "reference": payment.reference,
        "new_status": new_status.value if new_status else payment.status.value,
    }
