"""
Expiry sweep — applies `expires_at`, which nothing enforced until now.

Every payment gets an `expires_at` and the schema has an `EXPIRED` status,
but no job ever moved a payment into it: abandoned checkouts stayed PENDING
forever. On 2026-08-05 that had accumulated 721 stale rows dating back to
April, overstating pending volume by ~29M XAF; four more (2,024,700 XAF)
had piled up again by 2026-08-22.

A PENDING payment is expired as soon as it is past `expires_at` — the
customer never picked a payment method, so no operator is holding anything.
A PROCESSING payment was already pushed to an operator, so it gets an extra
grace period before we give up on it; a late callback still wins, because
EXPIRED is not one of the terminal states `_process_callback` skips on.

Expiry sends a merchant webhook only to merchants that opted in
(`webhook_on_expiry`). It is our own timeout rather than an operator
verdict, and firing it for everyone would push an event existing
integrations do not expect — but without it a merchant has no way to
notice an abandoned checkout except by polling.

Started from the app lifespan, cancelled on shutdown.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, or_, select, update

from app.core.database import async_session
from app.models.merchant import Merchant
from app.models.payment import Payment, PaymentStatus

logger = logging.getLogger(__name__)

SWEEP_INTERVAL_SECONDS = 300      # every 5 minutes
PROCESSING_GRACE_MINUTES = 30     # extra delay before abandoning an in-flight payment
SWEEP_BATCH_LIMIT = 500           # bounded work per sweep


def _expired_predicate(now: datetime):
    """Rows eligible for expiry: past due, and not already settled."""
    return or_(
        and_(
            Payment.status == PaymentStatus.PENDING,
            Payment.expires_at < now,
        ),
        and_(
            Payment.status == PaymentStatus.PROCESSING,
            Payment.expires_at < now - timedelta(minutes=PROCESSING_GRACE_MINUTES),
        ),
    )


async def _notify_opted_in(expired: list[tuple]) -> int:
    """Send payment.status_changed for merchants that asked for expiries.

    Off by default, so this is a no-op for everyone who has not opted in —
    the event would otherwise reach integrations that never expected it.
    Delivery failures are the notifier's business (it retries with backoff);
    they must never abort the sweep, whose job is the status write.
    """
    if not expired:
        return 0

    merchant_ids = {row[2] for row in expired if row[2] is not None}
    if not merchant_ids:
        return 0

    async with async_session() as db:
        opted_in = set(
            (
                await db.execute(
                    select(Merchant.id).where(
                        Merchant.id.in_(merchant_ids),
                        Merchant.webhook_on_expiry.is_(True),
                    )
                )
            ).scalars().all()
        )
    if not opted_in:
        return 0

    from app.services.notification import notify_merchant

    sent = 0
    for payment_id, reference, merchant_id in expired:
        if merchant_id not in opted_in:
            continue
        try:
            await notify_merchant(str(payment_id))
            sent += 1
        except Exception as exc:  # noqa: BLE001 - never break the sweep
            logger.warning(
                "Expiry sweep: webhook failed for %s: %s", reference, exc,
            )
    if sent:
        logger.info("Expiry sweep: %d expiry webhook(s) sent", sent)
    return sent


async def expire_once() -> int:
    """Expire one batch of past-due payments. Returns the number updated."""
    now = datetime.now(timezone.utc)
    predicate = _expired_predicate(now)

    async with async_session() as db:
        due = (
            select(Payment.id)
            .where(Payment.expires_at.isnot(None), predicate)
            .order_by(Payment.expires_at)
            .limit(SWEEP_BATCH_LIMIT)
        )
        # The predicate is repeated on the outer UPDATE so a callback that
        # settles a row between the subquery and the write is not clobbered.
        result = await db.execute(
            update(Payment)
            .where(Payment.id.in_(due), predicate)
            .values(status=PaymentStatus.EXPIRED)
            .returning(Payment.id, Payment.reference, Payment.merchant_id)
        )
        expired = list(result.all())
        await db.commit()

    references = [row[1] for row in expired]
    if references:
        logger.info(
            "Expiry sweep: %d payment(s) marked EXPIRED (%s%s)",
            len(references),
            ", ".join(references[:10]),
            ", ..." if len(references) > 10 else "",
        )
        # After the commit: the webhook must describe a payment already
        # written, or a merchant could call back and read the old status.
        await _notify_opted_in(expired)
    return len(references)


async def expiry_loop():
    """Run expire_once forever, spaced by SWEEP_INTERVAL_SECONDS."""
    logger.info(
        "Payment expiry sweep started (every %ss, PROCESSING grace %smin)",
        SWEEP_INTERVAL_SECONDS, PROCESSING_GRACE_MINUTES,
    )
    while True:
        try:
            await expire_once()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("Expiry sweep iteration failed: %s", exc)
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
