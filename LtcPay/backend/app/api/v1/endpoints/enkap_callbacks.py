"""
E-nkap webhook receiver and settlement logic.

E-nkap webhooks are UNSIGNED, so the payload is never trusted: any
delivery is only a wake-up signal. The actual state change always comes
from a server-side GET /api/order re-verification (verify_and_settle),
which is also reused by the hosted-checkout return page and by the lazy
check in GET /payments/{reference}.
"""
import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.services.enkap_service import EnkapError, enkap_service
from app.services.provider_service import provider_service

logger = logging.getLogger(__name__)

router = APIRouter()

_TERMINAL = (PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.CANCELLED)


async def verify_and_settle(db: AsyncSession, payment: Payment) -> PaymentStatus:
    """Re-verify an E-nkap payment server-side and settle it (idempotent).

    Returns the payment's (possibly unchanged) status. Never trusts webhook
    content — only the E-nkap status API decides.
    """
    if payment.status in _TERMINAL:
        return payment.status

    provider = await provider_service.get_provider(db, "ENKAP")
    if provider is None:
        return payment.status

    txid = payment.provider_transaction_id
    try:
        status_info = await enkap_service.check_order_status(
            provider,
            txid=txid,
            merchant_reference=None if txid else payment.reference,
        )
    except EnkapError as exc:
        logger.warning("E-nkap verify failed for %s: %s", payment.reference, exc)
        return payment.status

    payment_status = status_info.get("payment_status")
    if status_info.get("is_paid"):
        new_status = PaymentStatus.COMPLETED
    elif (
        status_info.get("is_failed")
        or status_info.get("is_cancelled")
        or status_info.get("is_expired")
    ):
        # Attempt-level outcome: a declined card or dead session must not
        # kill the payment link — the customer can retry with a new hosted
        # session (create-intent opens one). Payment links stay payable
        # until confirmed, matching the platform-wide behavior where
        # expires_at is informative, never enforced.
        merged = dict(payment.touchpay_data or {})
        merged.update({
            "provider": "ENKAP",
            "last_attempt_status": payment_status,
            "message": f"E-nkap: tentative {(payment_status or '').lower()}"
                       + (f" ({status_info.get('provider_name')})"
                          if status_info.get("provider_name") else "")
                       + " — nouvelle tentative possible",
        })
        payment.touchpay_data = merged
        await db.commit()
        return payment.status
    else:
        return payment.status  # CREATED / PENDING / PROCESSING / unknown

    old_status = payment.status
    provider_name = status_info.get("provider_name")
    merged = dict(payment.touchpay_data or {})
    merged.update({
        "provider": "ENKAP",
        "enkap_status": payment_status,
        "message": f"E-nkap: {(payment_status or '').lower()}"
                   + (f" ({provider_name})" if provider_name else ""),
    })
    update_values: dict = {"status": new_status, "touchpay_data": merged}
    if new_status == PaymentStatus.COMPLETED:
        update_values["completed_at"] = datetime.now(timezone.utc)

    result = await db.execute(
        update(Payment)
        .where(Payment.id == payment.id, Payment.status == old_status)
        .values(**update_values)
        .returning(Payment.id)
    )
    if result.first() is None:  # concurrent settle (webhook + poll) — fine
        await db.rollback()
        await db.refresh(payment)
        return payment.status
    await db.commit()

    logger.info(
        "E-nkap: payment %s settled %s -> %s (enkap status %s, sub-provider %s)",
        payment.reference, old_status.value, new_status.value,
        payment_status, provider_name,
    )

    try:
        from app.services.notification import notify_merchant
        asyncio.create_task(notify_merchant(str(payment.id)))
    except Exception as exc:
        logger.warning("Failed to trigger merchant notification: %s", exc)

    payment.status = new_status
    return new_status


@router.api_route("/enkap/instant/{merchant_reference}", methods=["PUT", "POST"])
async def enkap_instant_webhook(
    merchant_reference: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Undocumented delivery path observed in production: E-nkap PUTs to
    {notificationUrl}/instant/{merchantReference}. Same contract as the main
    webhook: wake-up only, the status API decides."""
    import re as _re
    match = _re.match(r"(PAY-[0-9A-F]{16})", merchant_reference.upper())
    base_ref = match.group(1) if match else merchant_reference

    result = await db.execute(
        select(Payment).where(
            Payment.provider == PaymentProvider.ENKAP,
            Payment.reference == base_ref,
        )
    )
    payment = result.scalars().first()
    if payment is None:
        logger.warning("E-nkap instant webhook: payment not found: %s", merchant_reference)
        return {"status": "ok"}

    new_status = await verify_and_settle(db, payment)
    logger.info(
        "E-nkap instant webhook: %s -> %s", payment.reference, new_status.value,
    )
    return {"status": "ok", "reference": payment.reference, "payment_status": new_status.value}


@router.post("/enkap")
async def enkap_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Unsigned wake-up signal: extract an identifier, re-verify, settle."""
    payload: dict = {}
    try:
        data = await request.json()
        if isinstance(data, dict):
            payload = data
    except Exception:
        try:
            payload = dict(await request.form())
        except Exception:
            payload = {}

    txid = payload.get("txid") or payload.get("orderTransactionId")
    merchant_ref = payload.get("merchantReference") or payload.get("merchantReferenceId")

    if not txid and not merchant_ref:
        logger.warning("E-nkap webhook: no identifier in payload: %s", str(payload)[:300])
        return {"status": "ok"}  # always ACK fast; nothing to do

    conditions = []
    if merchant_ref:
        conditions.append(Payment.reference == merchant_ref)
    if txid:
        conditions.append(Payment.provider_transaction_id == str(txid))
    result = await db.execute(
        select(Payment).where(
            Payment.provider == PaymentProvider.ENKAP, or_(*conditions),
        )
    )
    payment = result.scalars().first()
    if payment is None:
        logger.warning(
            "E-nkap webhook: payment not found (txid=%s ref=%s)", txid, merchant_ref,
        )
        return {"status": "ok"}

    new_status = await verify_and_settle(db, payment)
    return {"status": "ok", "reference": payment.reference, "payment_status": new_status.value}
