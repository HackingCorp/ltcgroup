"""
LtcPay - Merchant notification service tests.

Tests the webhook notification system that sends payment status
updates to merchant callback URLs.
"""
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.merchant import Merchant
from app.models.payment import Payment, PaymentStatus
from app.services.notification import (
    _sign_payload,
    _build_webhook_payload,
    notify_merchant,
)


class TestSignPayload:
    """Test HMAC-SHA256 payload signing."""

    def test_sign_deterministic(self):
        sig1 = _sign_payload('{"event": "test"}', "secret")
        sig2 = _sign_payload('{"event": "test"}', "secret")
        assert sig1 == sig2

    def test_sign_different_payloads(self):
        sig1 = _sign_payload("payload-a", "secret")
        sig2 = _sign_payload("payload-b", "secret")
        assert sig1 != sig2

    def test_sign_different_secrets(self):
        sig1 = _sign_payload("same-payload", "secret-a")
        sig2 = _sign_payload("same-payload", "secret-b")
        assert sig1 != sig2

    def test_sign_format(self):
        sig = _sign_payload("test", "secret")
        assert all(c in "0123456789abcdef" for c in sig)
        assert len(sig) == 64


class TestBuildWebhookPayload:
    """Test webhook payload construction."""

    def test_payload_structure(self):
        payment = MagicMock(spec=Payment)
        payment.id = uuid.uuid4()
        payment.reference = "PAY-TEST123"
        payment.merchant_reference = "ORD-456"
        payment.provider_transaction_id = "TP-789"
        payment.amount = Decimal("5000.00")
        payment.fee = Decimal("75.00")
        payment.currency = "XAF"
        payment.status = PaymentStatus.COMPLETED
        payment.method = None
        payment.customer_name = "John Doe"
        payment.customer_email = "john@example.com"
        payment.customer_phone = "237670000000"
        payment.description = "Test order"
        payment.completed_at = datetime(2026, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        payment.created_at = datetime(2026, 1, 15, 11, 0, 0, tzinfo=timezone.utc)

        payload = _build_webhook_payload(payment)

        assert payload["event"] == "payment.status_changed"
        assert "timestamp" in payload
        data = payload["data"]
        assert data["payment_id"] == str(payment.id)
        assert data["reference"] == "PAY-TEST123"
        assert data["merchant_reference"] == "ORD-456"
        assert data["amount"] == 5000.0
        assert data["fee"] == 75.0
        assert data["currency"] == "XAF"
        assert data["status"] == "COMPLETED"
        assert data["customer_name"] == "John Doe"
        assert data["customer_email"] == "john@example.com"

    def test_payload_with_null_fields(self):
        payment = MagicMock(spec=Payment)
        payment.id = uuid.uuid4()
        payment.reference = "PAY-MIN"
        payment.merchant_reference = None
        payment.provider_transaction_id = None
        payment.amount = Decimal("1000.00")
        payment.fee = Decimal("0")
        payment.currency = "XAF"
        payment.status = PaymentStatus.PENDING
        payment.method = None
        payment.customer_name = None
        payment.customer_email = None
        payment.customer_phone = None
        payment.description = None
        payment.completed_at = None
        payment.created_at = None

        payload = _build_webhook_payload(payment)
        data = payload["data"]
        assert data["merchant_reference"] is None
        assert data["completed_at"] is None
        assert data["method"] is None


class TestNotifyMerchant:
    """Test the full notify_merchant flow with mocked DB and HTTP."""

    @pytest.mark.asyncio
    async def test_notify_success(self):
        """Test successful notification delivery."""
        mock_payment = MagicMock(spec=Payment)
        mock_payment.id = uuid.uuid4()
        mock_payment.reference = "PAY-NOTIFY-OK"
        mock_payment.merchant_reference = None
        mock_payment.provider_transaction_id = None
        mock_payment.amount = Decimal("5000")
        mock_payment.fee = Decimal("75")
        mock_payment.currency = "XAF"
        mock_payment.status = PaymentStatus.COMPLETED
        mock_payment.method = None
        mock_payment.customer_name = "Test"
        mock_payment.customer_email = None
        mock_payment.customer_phone = None
        mock_payment.description = None
        mock_payment.completed_at = datetime.now(timezone.utc)
        mock_payment.created_at = datetime.now(timezone.utc)
        mock_payment.callback_url = "https://merchant.example.com/webhook"
        mock_payment.metadata = {}

        mock_merchant = MagicMock(spec=Merchant)
        mock_merchant.callback_url = "https://merchant.example.com/webhook"
        mock_merchant.webhook_secret = "test-secret-123"
        mock_merchant.name = "Test Merchant"
        mock_payment.merchant = mock_merchant

        # Mock the database session
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_payment
        mock_session.execute = AsyncMock(return_value=mock_result)
        mock_session.commit = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)

        # Mock HTTP response
        mock_http_response = MagicMock()
        mock_http_response.status_code = 200
        mock_http_response.text = "OK"

        mock_http_client = AsyncMock()
        mock_http_client.post = AsyncMock(return_value=mock_http_response)
        mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
        mock_http_client.__aexit__ = AsyncMock(return_value=None)

        with patch("app.services.notification.async_session", return_value=mock_session):
            with patch("httpx.AsyncClient", return_value=mock_http_client):
                result = await notify_merchant(str(mock_payment.id))

        assert result is True
        mock_http_client.post.assert_called_once()

        # Verify headers include signature
        call_kwargs = mock_http_client.post.call_args
        headers = call_kwargs.kwargs.get("headers", {}) if call_kwargs.kwargs else {}
        assert "X-LtcPay-Signature" in headers
        assert "X-LtcPay-Event" in headers
        assert headers["X-LtcPay-Event"] == "payment.status_changed"

    @pytest.mark.asyncio
    async def test_notify_payment_not_found(self):
        """Test notification when payment doesn't exist."""
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=mock_result)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)

        with patch("app.services.notification.async_session", return_value=mock_session):
            result = await notify_merchant(str(uuid.uuid4()))

        assert result is False

    @pytest.mark.asyncio
    async def test_notify_no_callback_url(self):
        """Test notification when no callback URL is configured."""
        mock_payment = MagicMock(spec=Payment)
        mock_payment.id = uuid.uuid4()
        mock_payment.reference = "PAY-NO-CALLBACK"
        mock_payment.callback_url = None

        mock_merchant = MagicMock(spec=Merchant)
        mock_merchant.callback_url = None
        mock_merchant.name = "No Webhook Merchant"
        mock_payment.merchant = mock_merchant

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_payment
        mock_session.execute = AsyncMock(return_value=mock_result)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)

        with patch("app.services.notification.async_session", return_value=mock_session):
            result = await notify_merchant(str(mock_payment.id))

        assert result is False

    @pytest.mark.asyncio
    async def test_notify_retries_on_failure(self):
        """Test that notification retries on HTTP errors."""
        mock_payment = MagicMock(spec=Payment)
        mock_payment.id = uuid.uuid4()
        mock_payment.reference = "PAY-RETRY"
        mock_payment.merchant_reference = None
        mock_payment.provider_transaction_id = None
        mock_payment.amount = Decimal("1000")
        mock_payment.fee = Decimal("15")
        mock_payment.currency = "XAF"
        mock_payment.status = PaymentStatus.COMPLETED
        mock_payment.method = None
        mock_payment.customer_name = None
        mock_payment.customer_email = None
        mock_payment.customer_phone = None
        mock_payment.description = None
        mock_payment.completed_at = None
        mock_payment.created_at = datetime.now(timezone.utc)
        mock_payment.callback_url = "https://merchant.example.com/webhook"
        mock_payment.metadata = {}

        mock_merchant = MagicMock(spec=Merchant)
        mock_merchant.callback_url = "https://merchant.example.com/webhook"
        mock_merchant.webhook_secret = "secret"
        mock_merchant.name = "Retry Merchant"
        mock_payment.merchant = mock_merchant

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_payment
        mock_session.execute = AsyncMock(return_value=mock_result)
        mock_session.commit = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)

        # Fail first call, succeed second
        mock_fail_response = MagicMock()
        mock_fail_response.status_code = 500
        mock_fail_response.text = "Internal Server Error"

        mock_ok_response = MagicMock()
        mock_ok_response.status_code = 200
        mock_ok_response.text = "OK"

        mock_http_client = AsyncMock()
        mock_http_client.post = AsyncMock(
            side_effect=[mock_fail_response, mock_ok_response]
        )
        mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
        mock_http_client.__aexit__ = AsyncMock(return_value=None)

        with patch("app.services.notification.async_session", return_value=mock_session):
            with patch("httpx.AsyncClient", return_value=mock_http_client):
                with patch("asyncio.sleep", new_callable=AsyncMock):
                    result = await notify_merchant(str(mock_payment.id))

        assert result is True
        assert mock_http_client.post.call_count == 2
