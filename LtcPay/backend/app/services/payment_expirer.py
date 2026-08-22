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

Started from the app lifespan, cancelled on shutdown.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, or_, select, update

from app.core.database import async_session
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
            .returning(Payment.reference)
        )
        references = [row[0] for row in result.all()]
        await db.commit()

    if references:
        logger.info(
            "Expiry sweep: %d payment(s) marked EXPIRED (%s%s)",
            len(references),
            ", ".join(references[:10]),
            ", ..." if len(references) > 10 else "",
        )
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
