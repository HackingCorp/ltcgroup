"""
LtcPay - Security utility tests.

Kept for backward compatibility - main auth tests are in test_auth.py.
"""
import pytest
from app.core.security import (
    hash_api_secret,
    verify_api_secret,
    generate_api_secret,
    generate_transaction_ref,
    generate_payment_token,
    verify_payment_token,
    compute_touchpay_signature,
    generate_webhook_signature,
    verify_webhook_signature,
)


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
        token = generate_payment_token("PAY-TEST", 5000.0)
        assert isinstance(token, str)
        assert len(token) > 0
        payload = verify_payment_token(token)
        assert payload is not None
        assert payload["sub"] == "PAY-TEST"
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


class TestBcryptApiSecret:
    """Test bcrypt-based API secret hashing."""

    def test_hash_and_verify(self):
        raw = generate_api_secret()
        hashed = hash_api_secret(raw)
        assert verify_api_secret(raw, hashed) is True

    def test_wrong_secret_fails(self):
        raw = generate_api_secret()
        hashed = hash_api_secret(raw)
        assert verify_api_secret("wrong", hashed) is False


class TestWebhookSignature:
    """Test HMAC webhook signature generation and verification."""

    def test_roundtrip(self):
        payload = b'{"event": "test"}'
        secret = "my-secret"
        sig = generate_webhook_signature(payload, secret)
        assert verify_webhook_signature(payload, sig, secret) is True

    def test_bad_signature(self):
        assert verify_webhook_signature(b"data", "badsig", "secret") is False
