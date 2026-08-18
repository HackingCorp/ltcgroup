"""
E-nkap reconciliation sweep — the guide's "job de rattrapage".

E-nkap webhooks are best-effort (5 retries then abandoned) and customers
close their browser before the return page: a paid order can leave our
payment stuck PENDING, as happened on 2026-08-18 with two confirmed
payments (617k XAF) whose webhooks were lost.

Every SWEEP_INTERVAL seconds, re-verify recent ENKAP payments still in
PENDING/PROCESSING against the E-nkap status API and settle them through
the exact same verify_and_settle path as webhooks (idempotent, notifies
the merchant). Started from the app lifespan; cancelled on shutdown.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.database import async_session
from app.models.payment import Payment, PaymentProvider, PaymentStatus

logger = logging.getLogger(__name__)

SWEEP_INTERVAL_SECONDS = 600      # every 10 minutes
SWEEP_WINDOW_HOURS = 48           # only payments created in the last 48h
SWEEP_BATCH_LIMIT = 25            # bounded work per sweep


async def sweep_once() -> int:
    """Verify one batch of stuck E-nkap payments. Returns settled count."""
    from app.api.v1.endpoints.enkap_callbacks import verify_and_settle

    settled = 0
    cutoff = datetime.now(timezone.utc) - timedelta(hours=SWEEP_WINDOW_HOURS)
    async with async_session() as db:
        result = await db.execute(
            select(Payment)
            .where(
                Payment.provider == PaymentProvider.ENKAP,
                Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.PROCESSING]),
                Payment.provider_transaction_id.isnot(None),
                Payment.created_at >= cutoff,
            )
            .order_by(Payment.created_at)
            .limit(SWEEP_BATCH_LIMIT)
        )
        payments = list(result.scalars().all())
        for payment in payments:
            before = payment.status
            try:
                after = await verify_and_settle(db, payment)
            except Exception as exc:
                logger.warning(
                    "E-nkap sweep: verify failed for %s: %s", payment.reference, exc,
                )
                continue
            if after != before:
                settled += 1
    if payments:
        logger.info(
            "E-nkap sweep: checked %d pending payment(s), settled %d",
            len(payments), settled,
        )
    return settled


async def reconciliation_loop():
    """Run sweep_once forever, spaced by SWEEP_INTERVAL_SECONDS."""
    logger.info(
        "E-nkap reconciliation sweep started (every %ss, window %sh)",
        SWEEP_INTERVAL_SECONDS, SWEEP_WINDOW_HOURS,
    )
    while True:
        try:
            await sweep_once()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("E-nkap sweep iteration failed: %s", exc)
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
