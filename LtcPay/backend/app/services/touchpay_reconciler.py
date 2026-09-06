"""
TouchPay reconciliation sweep — the callback is not guaranteed.

A payin can be collected and never produce a callback. Observed:
  - PAY-3433A41AF4E24354, verdict 18 h late (2026-08-28/29)
  - PAY-571A98041C254880, 6 899 XAF SUCCEED at TouchPay while we still had
    it PROCESSING; found only by querying them by hand (2026-09-02)
A read-only pass over 512 abandoned payments that day found exactly one
such case — rare, but the merchant was owed the money and nothing would
ever have told them.

Every SWEEP_INTERVAL seconds, ask TouchPay's check_status about recent
payments still PROCESSING or already given up on, and settle those whose
real verdict differs. EXPIRED is included on purpose: our expiry sweep is
a local timeout, not a verdict, and a late SUCCEED must still win.

Settling goes through the same atomic guard as the callback path, and
notifies the merchant. Started from the app lifespan; cancelled on
shutdown. Does nothing at all while the partner API is unconfigured, so
it is safe to run before the credentials land.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update

from app.core.database import async_session
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.services.touchpay_partner_service import (
    TouchPayPartnerError, touchpay_partner_service,
)

logger = logging.getLogger(__name__)

SWEEP_INTERVAL_SECONDS = 900      # every 15 minutes
SWEEP_WINDOW_HOURS = 48           # only payments created in the last 48h
SWEEP_BATCH_LIMIT = 40            # bounded work per sweep

# Statuses worth re-asking about: still in flight, or abandoned by our own
# timeout rather than by the operator.
_UNSETTLED = (PaymentStatus.PROCESSING, PaymentStatus.EXPIRED)


async def _settle(payment_id, reference: str, old_status, new_status, verdict: dict) -> bool:
    """Write a verdict without ever overwriting one that arrived meanwhile."""
    async with async_session() as db:
        values = {
            "status": new_status,
            "touchpay_data": {
                "provider": "TOUCHPAY",
                "status": verdict["status"],
                "message": f"Reconcilie via check_status: {verdict['status']}",
            },
        }
        if new_status == PaymentStatus.COMPLETED:
            values["completed_at"] = datetime.now(timezone.utc)

        result = await db.execute(
            update(Payment)
            .where(Payment.id == payment_id, Payment.status == old_status)
            .values(**values)
            .returning(Payment.id)
        )
        if result.first() is None:
            await db.rollback()
            return False
        await db.commit()

    logger.info(
        "TouchPay reconciliation: %s %s -> %s (check_status said %s)",
        reference, old_status.value, new_status.value, verdict["status"],
    )
    try:
        from app.services.notification import notify_merchant
        await notify_merchant(str(payment_id))
    except Exception as exc:  # noqa: BLE001 - delivery is not the sweep's job
        logger.warning("Reconciliation webhook failed for %s: %s", reference, exc)
    return True


async def sweep_once() -> int:
    """Re-verify one batch of unsettled TouchPay payments. Returns settled count."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=SWEEP_WINDOW_HOURS)

    async with async_session() as db:
        rows = (await db.execute(
            select(Payment)
            .where(
                Payment.provider == PaymentProvider.TOUCHPAY,
                Payment.status.in_(_UNSETTLED),
                Payment.country.isnot(None),
                Payment.created_at >= cutoff,
            )
            .order_by(Payment.created_at)
            .limit(SWEEP_BATCH_LIMIT)
        )).scalars().all()
        candidates = [(p.id, p.reference, p.country, p.status) for p in rows]

    if not candidates:
        return 0

    settled = 0
    unconfigured: set[str] = set()
    for payment_id, reference, country, old_status in candidates:
        if country in unconfigured:
            continue
        async with async_session() as db:
            try:
                verdict = await touchpay_partner_service.check_status(db, country, reference)
            except TouchPayPartnerError as exc:
                # Missing credentials is a per-country fact: stop asking for
                # that country this round instead of repeating the same
                # failure for every payment in the batch.
                if "not configured" in str(exc):
                    unconfigured.add(country)
                    logger.info("TouchPay reconciliation: %s not configured, skipped", country)
                else:
                    logger.warning(
                        "TouchPay reconciliation: check_status failed for %s: %s",
                        reference, exc,
                    )
                continue

        if verdict is None or verdict["is_pending"]:
            continue
        if verdict["is_paid"]:
            new_status = PaymentStatus.COMPLETED
        elif verdict["is_failed"]:
            new_status = PaymentStatus.FAILED
        else:
            logger.info(
                "TouchPay reconciliation: unknown status %s for %s, left alone",
                verdict["status"], reference,
            )
            continue
        if new_status == old_status:
            continue
        if await _settle(payment_id, reference, old_status, new_status, verdict):
            settled += 1

    if settled:
        logger.info("TouchPay reconciliation: %d payment(s) settled", settled)
    return settled


async def reconciliation_loop():
    """Run sweep_once forever, spaced by SWEEP_INTERVAL_SECONDS."""
    logger.info(
        "TouchPay reconciliation sweep started (every %ss, window %sh)",
        SWEEP_INTERVAL_SECONDS, SWEEP_WINDOW_HOURS,
    )
    while True:
        try:
            await sweep_once()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("TouchPay reconciliation iteration failed: %s", exc)
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
