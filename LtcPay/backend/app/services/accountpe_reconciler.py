"""
AccountPE reconciliation sweep.

AccountPE's webhooks are the only thing that settled its payins, and on
2026-10-15/16 they were all refused with "invalid signature" (our
webhook_secret no longer matched the account's Webhook Hash): four payins
AccountPE reports successful — 207 901 CDF and 152 KES — sat PROCESSING
until our expiry sweep called them EXPIRED, and the merchant was never told.

Every SWEEP_INTERVAL seconds, recent ACCOUNTPE payments still PROCESSING, or
EXPIRED by our own timeout, are checked with AccountPE's status API and
settled through settle_from_accountpe, the webhook's own path. An EXPIRED
payment is only ever moved to COMPLETED: a late failure changes nothing for
the merchant and would only send a needless notification.

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

_SUCCESS_LABELS = {"successful", "success", "completed", "1"}


async def sweep_once() -> int:
    """Check one batch of unsettled AccountPE payments. Returns settled count."""
    from app.api.v1.endpoints.accountpe_callbacks import settle_from_accountpe
    from app.services.accountpe_service import accountpe_service
    from app.services.provider_service import provider_service

    settled = 0
    cutoff = datetime.now(timezone.utc) - timedelta(hours=SWEEP_WINDOW_HOURS)
    async with async_session() as db:
        provider = await provider_service.get_provider(db, "ACCOUNTPE")
        if provider is None:
            return 0
        payments = list((await db.execute(
            select(Payment)
            .where(
                Payment.provider == PaymentProvider.ACCOUNTPE,
                Payment.status.in_([PaymentStatus.PROCESSING, PaymentStatus.EXPIRED]),
                Payment.created_at >= cutoff,
            )
            # Newest first: old ones still pending there must not starve it.
            .order_by(Payment.created_at.desc())
            .limit(SWEEP_BATCH_LIMIT)
        )).scalars().all())

        for payment in payments:
            attrs = await accountpe_service.check_payment_status(provider, payment.reference)
            if not attrs or attrs.get("status") is None:
                continue
            raw = attrs["status"]
            if (
                payment.status == PaymentStatus.EXPIRED
                and str(raw).strip().lower() not in _SUCCESS_LABELS
            ):
                continue
            before = payment.status
            try:
                await settle_from_accountpe(db, payment, attrs, raw, "sweep")
            except Exception as exc:
                await db.rollback()
                logger.warning("AccountPE sweep: settle failed for %s: %s", payment.reference, exc)
                continue
            await db.refresh(payment)
            if payment.status != before:
                settled += 1
                logger.info(
                    "AccountPE sweep: %s %s -> %s (AccountPE says %r)",
                    payment.reference, before.value, payment.status.value, raw,
                )

    if payments:
        logger.info("AccountPE sweep: checked %d payment(s), settled %d", len(payments), settled)
    return settled


async def reconciliation_loop():
    """Run sweep_once forever, spaced by SWEEP_INTERVAL_SECONDS."""
    logger.info(
        "AccountPE reconciliation sweep started (every %ss, window %sh)",
        SWEEP_INTERVAL_SECONDS, SWEEP_WINDOW_HOURS,
    )
    while True:
        try:
            await sweep_once()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("AccountPE sweep iteration failed: %s", exc)
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
