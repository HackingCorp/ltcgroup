"""The account-level AccountPE webhook is signed with X-Webhook-Signature-V2.

Until 2026-11-15 the handler read the legacy X-Webhook-Signature header
instead — which AccountPE's own docs (app.swychrconnect.com/gateway/
webhook_doc) say signs only the event name "payment_link_status_updated",
never the body. Every delivery was therefore compared against a signature
computed over the wrong thing and always came back "invalid signature",
silently falling back to the unsigned per-request path or the
reconciliation sweep instead.
"""
import hashlib
import hmac
import json
import time
import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.security import generate_api_secret, hash_api_secret
from app.models.merchant import Merchant, generate_api_key_live, generate_api_key_test
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.models.provider import ProviderConfig, ProviderGroup

SECRET = "accountpe-webhook-secret"


@pytest.fixture
async def provider(db_session):
    p = ProviderConfig(
        code="ACCOUNTPE", name="AccountPE", provider_group=ProviderGroup.MOBILE,
        is_active=True, config={"api_key": "k", "base_url": "https://x/api", "webhook_secret": SECRET},
    )
    db_session.add(p)
    await db_session.commit()
    return p


@pytest.fixture
async def payment(db_session, provider):
    merchant = Merchant(
        name="m", email=f"{uuid.uuid4().hex[:8]}@example.com",
        api_key_live=generate_api_key_live(), api_key_test=generate_api_key_test(),
        api_secret_hash=hash_api_secret(generate_api_secret()),
        is_active=True, is_verified=True,
    )
    db_session.add(merchant)
    await db_session.commit()
    await db_session.refresh(merchant)
    p = Payment(
        merchant_id=merchant.id,
        reference=f"PAY-{uuid.uuid4().hex[:16].upper()}",
        payment_token=uuid.uuid4().hex,
        amount=Decimal("5000.00"), currency="XAF",
        status=PaymentStatus.PROCESSING, provider=PaymentProvider.ACCOUNTPE,
    )
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


def _body(payment, status: int) -> bytes:
    return json.dumps({
        "event": "payment_link_status_updated",
        "timestamp": "2026-11-15T10:00:00+00:00",
        "data": {"data": {"id": "1", "type": "payment-links", "attributes": {
            "id": 1, "transaction_id": payment.reference, "status": status,
            "amount": 5000.0, "currency_code": "XAF",
        }}},
    }).encode()


def _v2_headers(raw_body: bytes, secret: str = SECRET, timestamp: str | None = None) -> dict:
    ts = timestamp or str(int(time.time()))
    sig = hmac.new(secret.encode(), f"{ts}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return {"X-Webhook-Timestamp": ts, "X-Webhook-Signature-V2": sig}


async def _row(db_session, payment_id):
    db_session.expire_all()
    return (await db_session.execute(select(Payment).where(Payment.id == payment_id))).scalar_one()


async def test_a_correctly_signed_v2_webhook_is_accepted(client, db_session, payment):
    raw = _body(payment, status=1)  # SUCCESSFUL
    response = await client.post(
        "/api/v1/callbacks/accountpe", content=raw,
        headers={"Content-Type": "application/json", **_v2_headers(raw)},
    )
    assert response.status_code == 200, response.text
    assert (await _row(db_session, payment.id)).status == PaymentStatus.COMPLETED


async def test_the_legacy_header_alone_does_not_authenticate(client, db_session, payment):
    """The pre-fix bug, pinned the other way: a delivery carrying only the
    legacy event-name signature (what AccountPE actually still sends
    alongside V2) must not be mistaken for a verified one."""
    raw = _body(payment, status=1)
    legacy_sig = hmac.new(
        SECRET.encode(), b"payment_link_status_updated", hashlib.sha256,
    ).hexdigest()
    response = await client.post(
        "/api/v1/callbacks/accountpe", content=raw,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Timestamp": str(int(time.time())),
            "X-Webhook-Signature": legacy_sig,  # legacy header only, no V2
        },
    )
    # Unsigned (from this handler's point of view): falls back to the
    # token path, which this request has none of, so it is ignored, not
    # trusted as a verified SUCCESS.
    assert (await _row(db_session, payment.id)).status == PaymentStatus.PROCESSING


async def test_a_tampered_v2_body_is_refused(client, db_session, payment):
    raw = _body(payment, status=1)
    headers = _v2_headers(raw)
    tampered = raw.replace(b'"status": 1', b'"status": 2')
    response = await client.post(
        "/api/v1/callbacks/accountpe", content=tampered,
        headers={"Content-Type": "application/json", **headers},
    )
    assert (await _row(db_session, payment.id)).status == PaymentStatus.PROCESSING
