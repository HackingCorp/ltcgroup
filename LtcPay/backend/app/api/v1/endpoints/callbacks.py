"""
LtcPay - Callback Endpoints (TouchPay webhooks)

Handles incoming payment notifications from TouchPay.

Two callback mechanisms are supported:

1. POST /api/v1/callbacks/touchpay
   - Server-to-server webhook with JSON body
   - HMAC-SHA256 signature verification
   - Used when TouchPay sends async status updates

2. GET /webhooks/touchpay/callback  (registered on the app, not here)
   - Browser redirect callback from TouchPay SDK
   - Query params: payment_token, payment_status, paid_amount,
     command_number, payment_mode, paid_sum, payment_validation_date
   - payment_status=200 means success
   - Identifies payment by payment_token

Both handlers share the same core processing logic.
"""
import asyncio
import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select, update, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.payment import Payment, PaymentStatus

logger = logging.getLogger(__name__)
router = APIRouter()


class TouchPayCallbackData:
    """
    Parse TouchPay callback payload.

    Supports multiple formats:
    - SDK redirect: payment_token, payment_status (200=success), paid_amount,
      command_number, payment_mode, paid_sum, payment_validation_date
    - Server webhook: transaction_id/reference, status, amount, operator_id, phone
    """

    def __init__(self, **kwargs):
        # Payment identification -- try payment_token first, then reference fields
        # TouchPay browser redirect sends: num_transaction_from_gu (their tx id),
        #   num_command (our reference), amount, errorCode
        # TouchPay server POST sends: payment_token, payment_status, paid_amount,
        #   command_number, payment_mode, paid_sum, payment_validation_date
        self.payment_token = (
            kwargs.get("payment_token")
            or kwargs.get("num_transaction_from_gu")
            or ""
        )
        self.transaction_id = (
            kwargs.get("transaction_id")
            or kwargs.get("transactionRef")
            or kwargs.get("reference")
            or ""
        )

        # num_command / command_number = our payment reference (PAY-xxx)
        self.command_number = (
            kwargs.get("command_number")
            or kwargs.get("num_command")
            or ""
        )

        # Status -- TouchPay SDK redirect uses errorCode (202 = success)
        # TouchPay server POST uses payment_status (200 = success)
        raw_status = (
            kwargs.get("payment_status")
            or kwargs.get("errorCode")
            or kwargs.get("status")
            or ""
        )
        self.raw_status = str(raw_status)
        self.status = self.raw_status

        # Amount -- SDK POST uses paid_amount, redirect uses amount
        self.paid_amount = kwargs.get("paid_amount") or kwargs.get("amount") or ""
        self.paid_sum = kwargs.get("paid_sum") or ""

        # Operator / provider reference
        self.operator_id = (
            kwargs.get("operator_id")
            or kwargs.get("operatorId")
            or kwargs.get("operator_ref")
            or kwargs.get("num_transaction_from_gu")
            or self.command_number
        )

        # Payment mode (e.g., 'OM' for Orange Money, 'MOMO' for MTN)
        self.payment_mode = kwargs.get("payment_mode") or ""

        # Validation date from TouchPay
        self.payment_validation_date = kwargs.get("payment_validation_date") or ""

        # Contact info
        self.phone = kwargs.get("phone") or kwargs.get("msisdn") or ""
        self.message = kwargs.get("message") or kwargs.get("status_message") or ""

        # Keep raw data for logging/storage
        self.raw = kwargs


def _verify_touchpay_signature(body: bytes, signature: str) -> bool:
    """Verify HMAC-SHA256 signature from TouchPay."""
    if not settings.TOUCHPAY_SECRET:
        return False
    expected = hmac.new(
        settings.TOUCHPAY_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(signature, expected)


def _map_touchpay_status(raw_status: str) -> PaymentStatus:
    """
    Map TouchPay status to our PaymentStatus enum.

    TouchPay uses different codes depending on the callback type:
    - Server POST: payment_status=200 means success
    - Browser redirect: errorCode=202 means success
    Server webhooks may use text: success, failed, cancelled, etc.
    """
    normalized = raw_status.strip().lower()

    # Numeric status codes from TouchPay
    # 200 = success (server POST), 202 = success (browser redirect)
    if normalized in ("200", "202"):
        return PaymentStatus.COMPLETED

    # Text statuses
    if normalized in ("success", "successful", "completed", "approved"):
        return PaymentStatus.COMPLETED
    elif normalized in ("failed", "error", "declined", "rejected"):
        return PaymentStatus.FAILED
    elif normalized in ("cancelled", "canceled"):
        return PaymentStatus.CANCELLED
    else:
        # Any other numeric code or unknown string = FAILED
        if normalized.isdigit() and normalized not in ("200", "202"):
            return PaymentStatus.FAILED
        return PaymentStatus.PENDING


async def _find_payment(
    db: AsyncSession,
    callback: TouchPayCallbackData,
) -> Optional[Payment]:
    """
    Find a payment by payment_token or reference.

    Tries payment_token first (used by SDK redirect callbacks),
    then falls back to reference/transaction_id (used by server webhooks).
    """
    conditions = []
    if callback.payment_token:
        conditions.append(Payment.payment_token == callback.payment_token)
        conditions.append(Payment.reference == callback.payment_token)
    if callback.transaction_id:
        conditions.append(Payment.reference == callback.transaction_id)
    # command_number / num_command = our PAY-xxx reference
    if callback.command_number:
        conditions.append(Payment.reference == callback.command_number)

    if not conditions:
        return None

    result = await db.execute(
        select(Payment).where(or_(*conditions))
    )
    return result.scalar_one_or_none()


async def _process_callback(
    db: AsyncSession,
    callback: TouchPayCallbackData,
) -> dict:
    """
    Core callback processing logic shared by both POST and GET handlers.

    Returns a dict with processing results.
    """
    # 1. Find the payment
    payment = await _find_payment(db, callback)

    if not payment:
        identifier = callback.payment_token or callback.transaction_id
        logger.warning("TouchPay callback: Payment not found: %s", identifier)
        raise HTTPException(status_code=404, detail="Payment not found")

    # 2. Idempotency: skip if already in a terminal state
    new_status = _map_touchpay_status(callback.status)

    terminal_states = (PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.CANCELLED)
    if payment.status in terminal_states:
        logger.info(
            "TouchPay callback: Payment %s already %s, skipping",
            payment.reference,
            payment.status.value,
        )
        return {
            "status": "ok",
            "message": "Already processed",
            "reference": payment.reference,
            "payment": payment,
            "new_status": payment.status,
        }

    # 3. Build update values
    old_status = payment.status
    update_values: dict = {
        "status": new_status,
    }

    if callback.operator_id:
        update_values["provider_transaction_id"] = callback.operator_id

    if new_status == PaymentStatus.COMPLETED:
        update_values["completed_at"] = datetime.now(timezone.utc)

    # Store full TouchPay response data
    touchpay_data = dict(callback.raw)
    if payment.touchpay_data:
        # Merge with existing data
        existing = payment.touchpay_data.copy()
        existing.update(touchpay_data)
        touchpay_data = existing
    update_values["touchpay_data"] = touchpay_data

    # 4. Atomic conditional update to prevent race conditions
    result = await db.execute(
        update(Payment)
        .where(
            Payment.id == payment.id,
            Payment.status == old_status,
        )
        .values(**update_values)
        .returning(Payment.id)
    )

    if result.rowcount == 0:
        logger.info("TouchPay callback: Concurrent update detected for %s", payment.reference)
        return {
            "status": "ok",
            "message": "Concurrent update",
            "reference": payment.reference,
            "payment": payment,
            "new_status": new_status,
        }

    await db.commit()

    logger.info(
        "TouchPay callback: Payment %s updated %s -> %s (token=%s, command=%s)",
        payment.reference,
        old_status.value,
        new_status.value,
        callback.payment_token,
        callback.command_number,
    )

    # 5. Trigger merchant notification (fire-and-forget)
    if new_status in terminal_states:
        try:
            from app.services.notification import notify_merchant
            asyncio.create_task(
                notify_merchant(str(payment.id))
            )
        except Exception as e:
            logger.warning("Failed to trigger merchant notification: %s", e)

    return {
        "status": "ok",
        "reference": payment.reference,
        "payment": payment,
        "new_status": new_status,
    }


# ---------------------------------------------------------------------------
# POST /api/v1/callbacks/touchpay -- Server-to-server webhook
# ---------------------------------------------------------------------------
@router.post("/touchpay")
async def touchpay_callback_post(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle TouchPay server-to-server webhook (POST with JSON/form body).

    Verifies HMAC signature, parses payload, updates payment status,
    and triggers merchant notification.
    """
    # 1. Read raw body for signature verification
    raw_body = await request.body()

    # 2. Verify webhook signature
    signature = (
        request.headers.get("X-TouchPay-Signature", "")
        or request.headers.get("X-Signature", "")
    )

    if settings.TOUCHPAY_SECRET:
        if not signature:
            logger.warning("TouchPay callback POST: Missing signature header")
            if settings.environment != "development":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Missing webhook signature",
                )
            logger.warning("TouchPay callback POST: Skipping signature check (development mode)")
        elif not _verify_touchpay_signature(raw_body, signature):
            logger.warning("TouchPay callback POST: Invalid signature")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature",
            )
    elif settings.environment != "development":
        logger.error("TouchPay callback POST: TOUCHPAY_SECRET not configured in production")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook secret not configured",
        )

    # 3. Parse callback data (JSON or form)
    try:
        body = await request.json()
    except Exception:
        body = dict(await request.form())

    logger.info("TouchPay callback POST received: %s", body)

    callback = TouchPayCallbackData(**body)

    if not callback.transaction_id and not callback.payment_token:
        raise HTTPException(
            status_code=400,
            detail="Missing payment_token or transaction_id",
        )

    # 4. Process the callback
    result = await _process_callback(db, callback)
    return {"status": result["status"], "reference": result.get("reference", "")}
