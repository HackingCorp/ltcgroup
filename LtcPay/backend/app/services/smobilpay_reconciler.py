"""
Smobilpay reconciliation sweep.

Smobilpay's callbacks are opt-in (configured by Maviance ops) and its docs
say to always keep polling as a fallback. Every SWEEP_INTERVAL seconds,
recent SMOBILPAY payments still PROCESSING — or EXPIRED by our own timeout,
which a late success must still overturn — are checked with GET /v2/verifytx
and settled through settle_from_smobilpay, the same path as the webhook.

verifytx is limited to one call per 10 s per transaction (the service
enforces it); a 5-minute sweep stays far below.

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
    """Check one batch of unsettled Smobilpay payments. Returns settled count."""
    from app.api.v1.endpoints.smobilpay_callbacks import settle_from_smobilpay
    from app.services.provider_service import provider_service
    from app.services.smobilpay_service import smobilpay_service

    settled = 0
    cutoff = datetime.now(timezone.utc) - timedelta(hours=SWEEP_WINDOW_HOURS)
    async with async_session() as db:
        provider = await provider_service.get_provider(db, "SMOBILPAY")
        if provider is None:
            return 0
        payments = list((await db.execute(
            select(Payment)
            .where(
                Payment.provider == PaymentProvider.SMOBILPAY,
                Payment.status.in_([PaymentStatus.PROCESSING, PaymentStatus.EXPIRED]),
                Payment.created_at >= cutoff,
            )
            .order_by(Payment.created_at.desc())
            .limit(SWEEP_BATCH_LIMIT)
        )).scalars().all())

        for payment in payments:
            data = await smobilpay_service.verify_transaction(
                provider, trid=payment.reference if not payment.provider_transaction_id else None,
                ptn=payment.provider_transaction_id or None,
            )
            if data is None:
                continue
            try:
                if await settle_from_smobilpay(db, payment, data, "sweep"):
                    settled += 1
            except Exception as exc:
                await db.rollback()
                logger.warning("Smobilpay sweep: settle failed for %s: %s", payment.reference, exc)

    if payments:
        logger.info("Smobilpay sweep: checked %d payment(s), settled %d", len(payments), settled)
    return settled


async def reconciliation_loop():
    """Run sweep_once forever, spaced by SWEEP_INTERVAL_SECONDS."""
    logger.info(
        "Smobilpay reconciliation sweep started (every %ss, window %sh)",
        SWEEP_INTERVAL_SECONDS, SWEEP_WINDOW_HOURS,
    )
    while True:
        try:
            await sweep_once()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("Smobilpay sweep iteration failed: %s", exc)
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
