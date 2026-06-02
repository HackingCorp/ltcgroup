"""
LtcPay - Stripe Payment Service

Handles Stripe Payment Intents for card payments.
XAF is a zero-decimal currency — amounts are passed as-is (no x100).
"""
import logging
from typing import Any

import stripe

from app.core.config import settings

logger = logging.getLogger(__name__)


class StripeServiceError(Exception):
    """Error from Stripe API."""

    def __init__(self, message: str, code: str | None = None, raw: dict | None = None):
        super().__init__(message)
        self.code = code
        self.raw = raw or {}


class StripeService:
    """Client for Stripe Payment Intents."""

    def __init__(self):
        self._configured: bool | None = None

    @property
    def is_configured(self) -> bool:
        """Check if Stripe keys are present."""
        if self._configured is None:
            self._configured = bool(
                settings.STRIPE_SECRET_KEY and settings.STRIPE_PUBLISHABLE_KEY
            )
        return self._configured

    def _ensure_configured(self):
        if not self.is_configured:
            raise StripeServiceError("Stripe is not configured (missing API keys)")
        stripe.api_key = settings.STRIPE_SECRET_KEY

    async def create_payment_intent(
        self,
        amount: int,
        currency: str,
        payment_reference: str,
        customer_email: str | None = None,
        description: str | None = None,
    ) -> dict[str, Any]:
        """Create a Stripe PaymentIntent.

        Args:
            amount: Amount in smallest currency unit. XAF is zero-decimal,
                    so 5000 XAF = 5000 (no multiplication).
            currency: ISO currency code (e.g. "XAF").
            payment_reference: LtcPay payment reference (stored in metadata).
            customer_email: Optional customer email for receipt.
            description: Optional payment description.

        Returns:
            Dict with id, client_secret, status.

        Raises:
            StripeServiceError: On Stripe API errors.
        """
        self._ensure_configured()

        try:
            intent_params: dict[str, Any] = {
                "amount": amount,
                "currency": currency.lower(),
                "metadata": {"ltcpay_reference": payment_reference},
                "automatic_payment_methods": {"enabled": True},
            }

            if customer_email:
                intent_params["receipt_email"] = customer_email
            if description:
                intent_params["description"] = description

            intent = stripe.PaymentIntent.create(**intent_params)

            logger.info(
                "Stripe: PaymentIntent created id=%s ref=%s amount=%s %s",
                intent.id, payment_reference, amount, currency,
            )

            return {
                "id": intent.id,
                "client_secret": intent.client_secret,
                "status": intent.status,
            }

        except stripe.error.CardError as e:
            logger.warning("Stripe card error for ref=%s: %s", payment_reference, e)
            raise StripeServiceError(
                str(e.user_message or e),
                code=e.code,
                raw={"type": "card_error", "message": str(e)},
            ) from e
        except stripe.error.StripeError as e:
            logger.error("Stripe API error for ref=%s: %s", payment_reference, e)
            raise StripeServiceError(
                f"Stripe error: {e}",
                raw={"type": type(e).__name__, "message": str(e)},
            ) from e

    def construct_webhook_event(
        self, payload: bytes, sig_header: str
    ) -> stripe.Event:
        """Verify and construct a Stripe webhook event.

        Args:
            payload: Raw request body bytes.
            sig_header: Value of the Stripe-Signature header.

        Returns:
            Verified stripe.Event object.

        Raises:
            StripeServiceError: On signature verification failure.
        """
        self._ensure_configured()

        if not settings.STRIPE_WEBHOOK_SECRET:
            raise StripeServiceError("STRIPE_WEBHOOK_SECRET not configured")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            return event
        except stripe.error.SignatureVerificationError as e:
            logger.warning("Stripe webhook signature verification failed: %s", e)
            raise StripeServiceError(
                "Invalid Stripe webhook signature",
                raw={"error": str(e)},
            ) from e
        except Exception as e:
            logger.error("Stripe webhook event construction failed: %s", e)
            raise StripeServiceError(
                f"Failed to construct webhook event: {e}",
                raw={"error": str(e)},
            ) from e


stripe_service = StripeService()
