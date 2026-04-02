"""
LtcPay - Merchant Notification Service

Sends webhook notifications to merchants when payment status changes.
Features:
- HMAC-SHA256 signed payloads for merchant verification
- Exponential backoff retries (up to 5 attempts)
- Delivery tracking (webhook_attempts, webhook_delivered_at)
- Async fire-and-forget with error logging
"""
import asyncio
import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import async_session
from app.models.payment import Payment
from app.models.merchant import Merchant

logger = logging.getLogger(__name__)

MAX_RETRIES = settings.merchant_webhook_max_retries
TIMEOUT = settings.merchant_webhook_timeout
BACKOFF_BASE = 2  # seconds; retries at 2s, 4s, 8s, 16s, 32s


def _sign_payload(payload: str, secret: str) -> str:
    """Compute HMAC-SHA256 signature for the webhook payload."""
    return hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _build_webhook_payload(payment: Payment) -> dict:
    """Build the webhook payload to send to the merchant."""
    return {
        "event": "payment.status_changed",
        "data": {
            "payment_id": str(payment.id),
            "reference": payment.reference,
            "merchant_reference": payment.merchant_reference,
            "provider_transaction_id": payment.provider_transaction_id,
            "amount": float(payment.amount) if payment.amount else 0,
            "fee": float(payment.fee) if payment.fee else 0,
            "currency": payment.currency or "XAF",
            "status": payment.status.value,
            "method": (
                payment.method.value
                if payment.method
                else None
            ),
            "customer_name": payment.customer_name,
            "customer_email": payment.customer_email,
            "customer_phone": payment.customer_phone,
            "description": payment.description,
            "completed_at": (
                payment.completed_at.isoformat()
                if payment.completed_at
                else None
            ),
            "created_at": (
                payment.created_at.isoformat()
                if payment.created_at
                else None
            ),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def notify_merchant(payment_id: str) -> bool:
    """
    Send a webhook notification to the merchant for a given payment.

    Looks up the payment and its merchant, determines the callback URL
    (payment-level override or merchant default), signs the payload,
    and sends it with exponential backoff retries.

    Returns True if delivery succeeded, False otherwise.
    """
    async with async_session() as db:
        # Load payment with merchant relationship
        result = await db.execute(
            select(Payment)
            .options(selectinload(Payment.merchant))
            .where(Payment.id == payment_id)
        )
        payment = result.scalar_one_or_none()

        if not payment:
            logger.warning("notify_merchant: Payment not found: %s", payment_id)
            return False

        # Determine callback URL: payment-level override > merchant callback_url
        callback_url = payment.callback_url
        if not callback_url and payment.merchant:
            callback_url = payment.merchant.callback_url

        if not callback_url:
            logger.info(
                "notify_merchant: No callback URL for payment %s (merchant: %s)",
                payment.reference,
                payment.merchant.name if payment.merchant else "unknown",
            )
            return False

        # Determine signing secret: merchant webhook_secret > global secret
        signing_secret = "dev-secret"
        if payment.merchant and payment.merchant.webhook_secret:
            signing_secret = payment.merchant.webhook_secret
        elif settings.touchpay_webhook_secret:
            signing_secret = settings.touchpay_webhook_secret

        # Build and sign the payload
        payload = _build_webhook_payload(payment)
        payload_json = json.dumps(payload, default=str)
        signature = _sign_payload(payload_json, signing_secret)

        headers = {
            "Content-Type": "application/json",
            "X-LtcPay-Signature": signature,
            "X-LtcPay-Event": "payment.status_changed",
            "X-LtcPay-Delivery-Id": f"{payment.reference}-{int(datetime.now(timezone.utc).timestamp())}",
            "User-Agent": "LtcPay-Webhook/1.0",
        }

        # Attempt delivery with retries
        delivered = False
        last_error = None

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            for attempt in range(MAX_RETRIES):
                try:
                    response = await client.post(
                        callback_url,
                        content=payload_json,
                        headers=headers,
                    )

                    if response.status_code < 300:
                        delivered = True
                        logger.info(
                            "notify_merchant: Delivered webhook for %s to %s (attempt %d, HTTP %d)",
                            payment.reference,
                            callback_url,
                            attempt + 1,
                            response.status_code,
                        )
                        break
                    else:
                        last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                        logger.warning(
                            "notify_merchant: Webhook delivery failed for %s (attempt %d/%d): %s",
                            payment.reference,
                            attempt + 1,
                            MAX_RETRIES,
                            last_error,
                        )

                except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout) as e:
                    last_error = str(e)
                    logger.warning(
                        "notify_merchant: Webhook delivery error for %s (attempt %d/%d): %s",
                        payment.reference,
                        attempt + 1,
                        MAX_RETRIES,
                        last_error,
                    )
                except Exception as e:
                    last_error = str(e)
                    logger.error(
                        "notify_merchant: Unexpected error for %s (attempt %d/%d): %s",
                        payment.reference,
                        attempt + 1,
                        MAX_RETRIES,
                        last_error,
                        exc_info=True,
                    )

                # Exponential backoff before retry
                if attempt < MAX_RETRIES - 1:
                    wait = BACKOFF_BASE * (2 ** attempt)
                    await asyncio.sleep(wait)

    # Update delivery tracking in a fresh session
    async with async_session() as db:
        try:
            update_values = {
                "webhook_reference": f"notify:{payment.reference}:{payment.status.value}",
            }

            if delivered:
                # Store delivery metadata in the metadata JSON field
                existing_meta = payment.payment_metadata or {}
                existing_meta["webhook_delivered"] = True
                existing_meta["webhook_delivered_at"] = datetime.now(timezone.utc).isoformat()
                update_values["payment_metadata"] = existing_meta

            await db.execute(
                update(Payment)
                .where(Payment.id == payment.id)
                .values(**update_values)
            )
            await db.commit()
        except Exception as e:
            logger.warning("notify_merchant: Failed to update delivery tracking: %s", e)

    if not delivered:
        logger.error(
            "notify_merchant: All %d attempts failed for %s. Last error: %s",
            MAX_RETRIES,
            payment.reference,
            last_error,
        )

    return delivered
