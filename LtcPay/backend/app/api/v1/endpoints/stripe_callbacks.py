"""
LtcPay - Stripe Webhook Callbacks

Handles incoming payment notifications from Stripe.

Endpoint: POST /api/v1/callbacks/stripe
- Verifies Stripe-Signature header
- Processes payment_intent.succeeded, payment_intent.payment_failed,
  payment_intent.canceled events
- Uses atomic conditional update (same pattern as TouchPay callbacks)
- Triggers merchant notification on terminal states
"""
import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select, update, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.models.payment import Payment, PaymentStatus, PaymentProvider
from app.services.stripe_service import stripe_service, StripeServiceError

logger = logging.getLogger(__name__)
router = APIRouter()

# Map Stripe event types to our PaymentStatus
_STRIPE_EVENT_STATUS_MAP = {
    "payment_intent.succeeded": PaymentStatus.COMPLETED,
    "payment_intent.payment_failed": PaymentStatus.FAILED,
    "payment_intent.canceled": PaymentStatus.CANCELLED,
}

TERMINAL_STATES = (PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.CANCELLED)


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events.

    Verifies the webhook signature, maps the event to a payment status,
    and updates the payment atomically.
    """
    # 1. Read raw body and signature header
    raw_body = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header",
        )

    # 2. Verify signature and construct event
    try:
        event = stripe_service.construct_webhook_event(raw_body, sig_header)
    except StripeServiceError as exc:
        logger.warning("Stripe webhook signature verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    # 3. Check if this is a payment intent event we handle
    event_type = event["type"]
    new_status = _STRIPE_EVENT_STATUS_MAP.get(event_type)

    if new_status is None:
        # Event type we don't handle — acknowledge it
        logger.info("Stripe webhook: ignoring event type %s", event_type)
        return {"status": "ok", "message": f"Event {event_type} ignored"}

    # 4. Extract payment intent data
    payment_intent = event["data"]["object"]
    pi_id = payment_intent["id"]
    metadata = getattr(payment_intent, "metadata", None) or {}
    ltcpay_reference = metadata.get("ltcpay_reference", "") if isinstance(metadata, dict) else getattr(metadata, "ltcpay_reference", "")

    logger.info(
        "Stripe webhook: %s for pi=%s ref=%s",
        event_type, pi_id, ltcpay_reference,
    )

    # 5. Find the payment by stripe_payment_intent_id or reference from metadata
    async with async_session() as db:
        conditions = [Payment.stripe_payment_intent_id == pi_id]
        if ltcpay_reference:
            conditions.append(Payment.reference == ltcpay_reference)

        result = await db.execute(
            select(Payment).where(or_(*conditions))
        )
        payment = result.scalar_one_or_none()

        if not payment:
            logger.warning(
                "Stripe webhook: Payment not found for pi=%s ref=%s",
                pi_id, ltcpay_reference,
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found",
            )

        # 6. Idempotency: skip if already in a terminal state
        if payment.status in TERMINAL_STATES:
            logger.info(
                "Stripe webhook: Payment %s already %s, skipping",
                payment.reference, payment.status.value,
            )
            return {"status": "ok", "message": "Already processed"}

        # 7. Build update values
        old_status = payment.status
        update_values: dict = {
            "status": new_status,
            "stripe_payment_intent_id": pi_id,
        }

        if new_status == PaymentStatus.COMPLETED:
            update_values["completed_at"] = datetime.now(timezone.utc)

        # Store full Stripe webhook data
        stripe_data = payment.stripe_data or {}
        stripe_data["webhook_event"] = {
            "type": event_type,
            "id": event["id"],
            "data": dict(payment_intent),
        }
        update_values["stripe_data"] = stripe_data

        # 8. Atomic conditional update
        result = await db.execute(
            update(Payment)
            .where(
                Payment.id == payment.id,
                Payment.status == old_status,
            )
            .values(**update_values)
            .returning(Payment.id)
        )

        updated_row = result.first()
        if updated_row is None:
            logger.info(
                "Stripe webhook: Concurrent update detected for %s",
                payment.reference,
            )
            return {"status": "ok", "message": "Concurrent update"}

        await db.commit()

        logger.info(
            "Stripe webhook: Payment %s updated %s -> %s",
            payment.reference, old_status.value, new_status.value,
        )

        # 9. Trigger merchant notification (fire-and-forget)
        if new_status in TERMINAL_STATES:
            try:
                from app.services.notification import notify_merchant
                asyncio.create_task(notify_merchant(str(payment.id)))
            except Exception as e:
                logger.warning("Failed to trigger merchant notification: %s", e)

    return {"status": "ok", "reference": payment.reference}
