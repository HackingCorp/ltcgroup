"""The expiry sweep notifies only merchants that asked for it.

Entering EXPIRED is our own timeout, not an operator verdict, and a late
callback can still turn the payment into COMPLETED — so the event is
off by default and must never reach an integration that did not opt in.
Without it a merchant can only notice an abandoned checkout by polling.
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.core.security import generate_api_secret, hash_api_secret
from app.models.merchant import Merchant, generate_api_key_live, generate_api_key_test
from app.models.payment import Payment, PaymentStatus
from app.services import payment_expirer
from app.services.payment_expirer import expire_once
from tests.conftest import TestSessionLocal


@pytest_asyncio.fixture(autouse=True)
def _use_test_session():
    """Point the sweep at the in-memory test database."""
    with patch.object(payment_expirer, "async_session", TestSessionLocal):
        yield


def _past(minutes=60):
    return datetime.now(timezone.utc) - timedelta(minutes=minutes)


async def _merchant(db_session, *, opted_in: bool) -> Merchant:
    merchant = Merchant(
        name=f"m-{uuid.uuid4().hex[:6]}",
        email=f"{uuid.uuid4().hex[:8]}@example.com",
        callback_url="https://merchant.example.com/webhook",
        api_key_live=generate_api_key_live(),
        api_key_test=generate_api_key_test(),
        api_secret_hash=hash_api_secret(generate_api_secret()),
        is_active=True,
        is_verified=True,
        webhook_on_expiry=opted_in,
    )
    db_session.add(merchant)
    await db_session.commit()
    await db_session.refresh(merchant)
    return merchant


async def _payment(db_session, merchant, *, status=PaymentStatus.PENDING, expires_at=None):
    reference = f"PAY-{uuid.uuid4().hex[:16].upper()}"
    payment = Payment(
        merchant_id=merchant.id,
        reference=reference,
        payment_token=uuid.uuid4().hex,
        amount=Decimal("5000.00"),
        currency="XAF",
        status=status,
        expires_at=expires_at if expires_at is not None else _past(),
    )
    db_session.add(payment)
    await db_session.commit()
    await db_session.refresh(payment)
    return payment


@pytest.fixture
def notifier():
    with patch.object(payment_expirer, "_notify_opted_in", wraps=payment_expirer._notify_opted_in):
        with patch("app.services.notification.notify_merchant", new=AsyncMock(return_value=True)) as mock:
            yield mock


async def _references_notified(mock, db_session):
    refs = []
    for call in mock.await_args_list:
        payment = (await db_session.execute(
            select(Payment).where(Payment.id == uuid.UUID(call.args[0]))
        )).scalar_one()
        refs.append(payment.reference)
    return refs


# --------------------------------------------------------------------------

async def test_opted_in_merchant_is_notified(db_session, notifier):
    merchant = await _merchant(db_session, opted_in=True)
    payment = await _payment(db_session, merchant)

    assert await expire_once() == 1
    assert await _references_notified(notifier, db_session) == [payment.reference]


async def test_merchant_who_did_not_opt_in_is_not_notified(db_session, notifier):
    merchant = await _merchant(db_session, opted_in=False)
    await _payment(db_session, merchant)

    assert await expire_once() == 1
    notifier.assert_not_awaited()


async def test_only_the_opted_in_merchants_payments_are_notified(db_session, notifier):
    wants = await _merchant(db_session, opted_in=True)
    does_not = await _merchant(db_session, opted_in=False)
    notified = await _payment(db_session, wants)
    await _payment(db_session, does_not)

    assert await expire_once() == 2
    assert await _references_notified(notifier, db_session) == [notified.reference]


async def test_status_is_still_written_when_the_webhook_fails(db_session):
    # The sweep's job is the status write; delivery is best-effort.
    merchant = await _merchant(db_session, opted_in=True)
    payment = await _payment(db_session, merchant)

    with patch("app.services.notification.notify_merchant", new=AsyncMock(side_effect=RuntimeError("down"))):
        assert await expire_once() == 1

    refreshed = (await db_session.execute(
        select(Payment.status).where(Payment.id == payment.id)
    )).scalar_one()
    assert refreshed == PaymentStatus.EXPIRED


async def test_nothing_is_sent_when_nothing_expires(db_session, notifier):
    merchant = await _merchant(db_session, opted_in=True)
    await _payment(
        db_session, merchant,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )

    assert await expire_once() == 0
    notifier.assert_not_awaited()


async def test_a_processing_payment_still_gets_its_grace_period(db_session, notifier):
    # Opting in must not shorten the delay before abandoning an in-flight
    # payment — the operator may still answer.
    merchant = await _merchant(db_session, opted_in=True)
    await _payment(
        db_session, merchant,
        status=PaymentStatus.PROCESSING,
        expires_at=_past(minutes=5),
    )

    assert await expire_once() == 0
    notifier.assert_not_awaited()


async def test_default_is_off(db_session):
    merchant = Merchant(
        name="default",
        email=f"{uuid.uuid4().hex[:8]}@example.com",
        api_key_live=generate_api_key_live(),
        api_key_test=generate_api_key_test(),
        api_secret_hash=hash_api_secret(generate_api_secret()),
    )
    db_session.add(merchant)
    await db_session.commit()
    await db_session.refresh(merchant)
    assert merchant.webhook_on_expiry is False
