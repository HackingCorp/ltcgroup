"""
LtcPay - Authentication tests.

Tests API key + secret authentication for merchant endpoints.
"""
import pytest
from httpx import AsyncClient

from app.core.security import (
    hash_api_secret,
    verify_api_secret,
    generate_api_secret,
    generate_webhook_signature,
    verify_webhook_signature,
    generate_transaction_ref,
    generate_payment_token,
    verify_payment_token,
    compute_touchpay_signature,
)


# ---------------------------------------------------------------------------
# Unit tests for security functions
# ---------------------------------------------------------------------------

class TestApiSecretHashing:
    """Test bcrypt API secret hash/verify."""

    def test_hash_and_verify(self):
        raw = generate_api_secret()
        hashed = hash_api_secret(raw)
        assert verify_api_secret(raw, hashed) is True

    def test_verify_wrong_secret(self):
        raw = generate_api_secret()
        hashed = hash_api_secret(raw)
        assert verify_api_secret("wrong-secret", hashed) is False

    def test_hash_is_different_each_time(self):
        raw = "same-secret"
        h1 = hash_api_secret(raw)
        h2 = hash_api_secret(raw)
        assert h1 != h2  # bcrypt uses random salt


class TestWebhookSignature:
    """Test HMAC-SHA256 webhook signatures."""

    def test_generate_and_verify(self):
        payload = b'{"event": "payment.completed"}'
        secret = "test-webhook-secret"
        sig = generate_webhook_signature(payload, secret)
        assert verify_webhook_signature(payload, sig, secret) is True

    def test_wrong_signature(self):
        payload = b'{"event": "payment.completed"}'
        secret = "test-webhook-secret"
        assert verify_webhook_signature(payload, "bad-sig", secret) is False

    def test_wrong_secret(self):
        payload = b'{"event": "payment.completed"}'
        sig = generate_webhook_signature(payload, "correct-secret")
        assert verify_webhook_signature(payload, sig, "wrong-secret") is False

    def test_signature_is_hex(self):
        sig = generate_webhook_signature(b"test", "secret")
        assert all(c in "0123456789abcdef" for c in sig)
        assert len(sig) == 64  # SHA256 produces 64 hex chars


class TestTransactionRef:
    """Test transaction reference generation."""

    def test_format(self):
        ref = generate_transaction_ref()
        assert ref.startswith("LTCPAY-")

    def test_uniqueness(self):
        refs = {generate_transaction_ref() for _ in range(100)}
        assert len(refs) == 100


class TestPaymentToken:
    """Test payment token generation and verification."""

    def test_generate_and_verify(self):
        token = generate_payment_token("PAY-TEST123", 5000.0)
        assert isinstance(token, str)
        assert len(token) > 0
        payload = verify_payment_token(token)
        assert payload is not None
        assert payload["sub"] == "PAY-TEST123"
        assert payload["amount"] == 5000.0

    def test_verify_invalid_token(self):
        result = verify_payment_token("invalid.token.here")
        assert result is None

    def test_verify_empty_token(self):
        result = verify_payment_token("")
        assert result is None


class TestTouchPaySignature:
    """Test TouchPay HMAC signature computation."""

    def test_signature_deterministic(self):
        sig1 = compute_touchpay_signature("test-data-123")
        sig2 = compute_touchpay_signature("test-data-123")
        assert sig1 == sig2

    def test_signature_different_for_different_data(self):
        sig1 = compute_touchpay_signature("data-a")
        sig2 = compute_touchpay_signature("data-b")
        assert sig1 != sig2

    def test_signature_format(self):
        sig = compute_touchpay_signature("test")
        assert all(c in "0123456789abcdef" for c in sig)
        assert len(sig) == 64


# ---------------------------------------------------------------------------
# Integration tests for API key auth on endpoints
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_payments_endpoint_requires_auth(client: AsyncClient):
    """Test that payment endpoints reject unauthenticated requests."""
    response = await client.get("/api/v1/payments")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_payments_endpoint_rejects_bad_key(client: AsyncClient):
    """Test that invalid API key is rejected."""
    response = await client.get(
        "/api/v1/payments",
        headers={"X-API-Key": "ltcpay_bad_key", "X-API-Secret": "bad_secret"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_payments_endpoint_rejects_wrong_secret(
    client: AsyncClient, merchant_credentials: dict
):
    """Test that correct API key but wrong secret is rejected."""
    response = await client.get(
        "/api/v1/payments",
        headers={
            "X-API-Key": merchant_credentials["api_key"],
            "X-API-Secret": "completely-wrong-secret",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_payments_endpoint_accepts_valid_auth(
    client: AsyncClient, auth_headers: dict
):
    """Test that valid API key + secret grants access."""
    response = await client.get("/api/v1/payments", headers=auth_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_merchant_me_requires_auth(client: AsyncClient):
    """Test that /merchants/me requires authentication."""
    response = await client.get("/api/v1/merchants/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_merchant_me_with_valid_auth(
    client: AsyncClient, auth_headers: dict
):
    """Test that /merchants/me returns the authenticated merchant."""
    response = await client.get("/api/v1/merchants/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Merchant"
    assert "api_key_live" in data


@pytest.mark.asyncio
async def test_inactive_merchant_rejected(
    client: AsyncClient, db_session, merchant_credentials: dict
):
    """Test that inactive merchant is rejected with 403."""
    merchant = merchant_credentials["merchant"]
    merchant.is_active = False
    db_session.add(merchant)
    await db_session.commit()

    response = await client.get(
        "/api/v1/payments",
        headers={
            "X-API-Key": merchant_credentials["api_key"],
            "X-API-Secret": merchant_credentials["api_secret"],
        },
    )
    assert response.status_code == 403
