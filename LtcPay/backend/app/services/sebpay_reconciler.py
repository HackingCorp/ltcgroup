"""
SebPay reconciliation sweep.

SebPay documents no retry policy for its webhooks, and recommends not
relying on them alone. Every SWEEP_INTERVAL seconds, recent SEBPAY payments
still PROCESSING — or EXPIRED by our own timeout, which a late approval must
still overturn — are checked with GET /collections/{reference} and settled
through settle_from_sebpay, the same path as the webhook.

Started from the app lifespan; cancelled on shutdown.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.database import async_session
from app.models.payment import Payment, PaymentProvider, PaymentStatus

logger = logging.getLogger(__name__)

SWEEP_INTERVAL_SECONDS = 300      # every 5 minutes
SWEEP_WINDOW_HOURS = 48           # only payments created in the last 48h
SWEEP_BATCH_LIMIT = 50            # bounded work per sweep


async def sweep_once() -> int:
    """Check one batch of unsettled SebPay payments. Returns settled count."""
    from app.api.v1.endpoints.sebpay_callbacks import settle_from_sebpay
    from app.services.provider_service import provider_service
    from app.services.sebpay_service import sebpay_service

    settled = 0
    cutoff = datetime.now(timezone.utc) - timedelta(hours=SWEEP_WINDOW_HOURS)
    async with async_session() as db:
        provider = await provider_service.get_provider(db, "SEBPAY")
        if provider is None:
            return 0
        payments = list((await db.execute(
            select(Payment)
            .where(
                Payment.provider == PaymentProvider.SEBPAY,
                Payment.status.in_([PaymentStatus.PROCESSING, PaymentStatus.EXPIRED]),
                Payment.created_at >= cutoff,
            )
            # Newest first: old ones still pending at SebPay must not starve
            # the batch.
            .order_by(Payment.created_at.desc())
            .limit(SWEEP_BATCH_LIMIT)
        )).scalars().all())

        for payment in payments:
            data = await sebpay_service.get_collection(provider, payment.reference)
            if data is None:
                continue
            try:
                if await settle_from_sebpay(db, payment, data, "sweep"):
                    settled += 1
            except Exception as exc:
                await db.rollback()
                logger.warning("SebPay sweep: settle failed for %s: %s", payment.reference, exc)

    if payments:
        logger.info(
            "SebPay sweep: checked %d payment(s), settled %d", len(payments), settled,
        )
    return settled


async def reconciliation_loop():
    """Run sweep_once forever, spaced by SWEEP_INTERVAL_SECONDS."""
    logger.info(
        "SebPay reconciliation sweep started (every %ss, window %sh)",
        SWEEP_INTERVAL_SECONDS, SWEEP_WINDOW_HOURS,
    )
    while True:
        try:
            await sweep_once()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("SebPay sweep iteration failed: %s", exc)
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
