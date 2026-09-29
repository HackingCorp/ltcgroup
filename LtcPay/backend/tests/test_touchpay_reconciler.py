"""The TouchPay reconciliation sweep must settle only what it can prove.

A payin can be collected and never produce a callback: PAY-571A98041C254880
was SUCCEED at TouchPay while we had it PROCESSING, and was found only by
hand. EXPIRED is swept too — our expiry is a local timeout, not a verdict.
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
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.services import touchpay_reconciler
from app.services.touchpay_reconciler import sweep_once
from tests.conftest import TestSessionLocal


@pytest_asyncio.fixture(autouse=True)
def _use_test_session():
    with patch.object(touchpay_reconciler, "async_session", TestSessionLocal):
        yield


@pytest_asyncio.fixture(autouse=True)
def _no_webhooks():
    with patch("app.services.notification.notify_merchant", new=AsyncMock(return_value=True)):
        yield


async def _payment(db_session, status, *, country="CM", age_hours=1):
    merchant = Merchant(
        name="m", email=f"{uuid.uuid4().hex[:8]}@example.com",
        api_key_live=generate_api_key_live(), api_key_test=generate_api_key_test(),
        api_secret_hash=hash_api_secret(generate_api_secret()),
        is_active=True, is_verified=True,
    )
    db_session.add(merchant)
    await db_session.commit()

    payment = Payment(
        merchant_id=merchant.id,
        reference=f"PAY-{uuid.uuid4().hex[:16].upper()}",
        payment_token=uuid.uuid4().hex,
        amount=Decimal("6899.00"), currency="XAF",
        status=status, provider=PaymentProvider.TOUCHPAY, country=country,
        created_at=datetime.now(timezone.utc) - timedelta(hours=age_hours),
    )
    db_session.add(payment)
    await db_session.commit()
    await db_session.refresh(payment)
    return payment


def _verdict(status, **flags):
    return {
        "status": status,
        "is_paid": flags.get("paid", False),
        "is_failed": flags.get("failed", False),
        "is_pending": flags.get("pending", False),
        "raw": {},
    }


def _check(return_value):
    return patch(
        "app.services.touchpay_partner_service.touchpay_partner_service.check_status",
        new=AsyncMock(return_value=return_value),
    )


async def _status_of(db_session, payment_id):
    return (await db_session.execute(
        select(Payment.status).where(Payment.id == payment_id)
    )).scalar_one()


# --------------------------------------------------------------------------

async def test_a_processing_payment_touchpay_calls_paid_is_completed(db_session):
    payment = await _payment(db_session, PaymentStatus.PROCESSING)
    with _check(_verdict("SUCCEED", paid=True)):
        assert await sweep_once() == 1
    assert await _status_of(db_session, payment.id) == PaymentStatus.COMPLETED


async def test_an_expired_payment_can_still_be_recovered(db_session):
    # The whole reason EXPIRED is swept: it is our timeout, not a verdict.
    payment = await _payment(db_session, PaymentStatus.EXPIRED)
    with _check(_verdict("SUCCESSFUL", paid=True)):
        assert await sweep_once() == 1
    assert await _status_of(db_session, payment.id) == PaymentStatus.COMPLETED


async def test_completed_at_is_stamped_on_recovery(db_session):
    payment = await _payment(db_session, PaymentStatus.PROCESSING)
    with _check(_verdict("SUCCEED", paid=True)):
        await sweep_once()
    stamped = (await db_session.execute(
        select(Payment.completed_at).where(Payment.id == payment.id)
    )).scalar_one()
    assert stamped is not None


async def test_a_failed_verdict_settles_as_failed(db_session):
    payment = await _payment(db_session, PaymentStatus.PROCESSING)
    with _check(_verdict("FAILED", failed=True)):
        assert await sweep_once() == 1
    assert await _status_of(db_session, payment.id) == PaymentStatus.FAILED


async def test_a_pending_verdict_changes_nothing(db_session):
    payment = await _payment(db_session, PaymentStatus.PROCESSING)
    with _check(_verdict("PENDING", pending=True)):
        assert await sweep_once() == 0
    assert await _status_of(db_session, payment.id) == PaymentStatus.PROCESSING


async def test_an_unreadable_status_changes_nothing(db_session):
    payment = await _payment(db_session, PaymentStatus.EXPIRED)
    with _check(None):
        assert await sweep_once() == 0
    assert await _status_of(db_session, payment.id) == PaymentStatus.EXPIRED


async def test_a_verdict_matching_our_status_is_not_rewritten(db_session):
    payment = await _payment(db_session, PaymentStatus.EXPIRED)
    with _check(_verdict("FAILED", failed=True)):
        # EXPIRED -> FAILED is a real transition, so this one does settle.
        assert await sweep_once() == 1
    assert await _status_of(db_session, payment.id) == PaymentStatus.FAILED


async def test_settled_payments_are_left_alone(db_session):
    completed = await _payment(db_session, PaymentStatus.COMPLETED)
    with _check(_verdict("FAILED", failed=True)) as mock:
        assert await sweep_once() == 0
    assert await _status_of(db_session, completed.id) == PaymentStatus.COMPLETED


async def test_payments_older_than_the_window_are_ignored(db_session):
    payment = await _payment(db_session, PaymentStatus.EXPIRED, age_hours=72)
    with _check(_verdict("SUCCEED", paid=True)):
        assert await sweep_once() == 0
    assert await _status_of(db_session, payment.id) == PaymentStatus.EXPIRED


async def test_an_unconfigured_country_is_skipped_without_crashing(db_session):
    from app.services.touchpay_partner_service import TouchPayPartnerError
    payment = await _payment(db_session, PaymentStatus.PROCESSING)
    with patch(
        "app.services.touchpay_partner_service.touchpay_partner_service.check_status",
        new=AsyncMock(side_effect=TouchPayPartnerError(
            "TouchPay partner API not configured for CM: missing partner_id")),
    ):
        assert await sweep_once() == 0
    assert await _status_of(db_session, payment.id) == PaymentStatus.PROCESSING


async def test_a_provider_error_does_not_abort_the_sweep(db_session):
    from app.services.touchpay_partner_service import TouchPayPartnerError
    payment = await _payment(db_session, PaymentStatus.PROCESSING)
    with patch(
        "app.services.touchpay_partner_service.touchpay_partner_service.check_status",
        new=AsyncMock(side_effect=TouchPayPartnerError("check_status unreachable: boom")),
    ):
        assert await sweep_once() == 0  # returns, does not raise
    assert await _status_of(db_session, payment.id) == PaymentStatus.PROCESSING


async def test_the_merchant_is_notified_on_recovery(db_session):
    payment = await _payment(db_session, PaymentStatus.EXPIRED)
    notify = AsyncMock(return_value=True)
    with _check(_verdict("SUCCEED", paid=True)):
        with patch("app.services.notification.notify_merchant", new=notify):
            await sweep_once()
    assert notify.await_count == 1
    assert notify.await_args[0][0] == str(payment.id)


async def test_a_webhook_failure_does_not_undo_the_settlement(db_session):
    payment = await _payment(db_session, PaymentStatus.EXPIRED)
    with _check(_verdict("SUCCEED", paid=True)):
        with patch("app.services.notification.notify_merchant",
                   new=AsyncMock(side_effect=RuntimeError("merchant down"))):
            assert await sweep_once() == 1
    assert await _status_of(db_session, payment.id) == PaymentStatus.COMPLETED


# --------------------------------------------------------------------------
# Falling back to the payin status endpoint
# --------------------------------------------------------------------------
# check_status is provisioned per agency: only Cameroon has it, and Benin's
# own key answers 401. GET /{agency}/transaction/{reference} needs nothing
# but the agent credentials every country already has, so it covers the
# other ten — including Orange RDC, where TouchPay sends no failure
# callback at all.

def _payin(return_value=None, side_effect=None):
    return patch(
        "app.services.touchpay_direct_service.touchpay_direct_service.check_transaction_status",
        new=AsyncMock(return_value=return_value, side_effect=side_effect),
    )


def _partner_unavailable(message="Unauthorized."):
    from app.services.touchpay_partner_service import TouchPayPartnerError
    return patch(
        "app.services.touchpay_partner_service.touchpay_partner_service.check_status",
        new=AsyncMock(side_effect=TouchPayPartnerError(message)),
    )


async def test_the_payin_endpoint_settles_when_the_partner_api_is_unavailable(db_session):
    payment = await _payment(db_session, PaymentStatus.EXPIRED)
    with _partner_unavailable(), _payin(_verdict("SUCCEED", paid=True)):
        assert await sweep_once() == 1
    assert await _status_of(db_session, payment.id) == PaymentStatus.COMPLETED


async def test_the_payin_endpoint_is_not_called_when_the_partner_api_answers(db_session):
    payment = await _payment(db_session, PaymentStatus.PROCESSING)
    fallback = AsyncMock(return_value=_verdict("FAILED", failed=True))
    with _check(_verdict("SUCCEED", paid=True)), patch(
        "app.services.touchpay_direct_service.touchpay_direct_service.check_transaction_status",
        new=fallback,
    ):
        assert await sweep_once() == 1
    assert fallback.await_count == 0
    assert await _status_of(db_session, payment.id) == PaymentStatus.COMPLETED


async def test_notfound_from_the_payin_endpoint_settles_nothing(db_session):
    """A basket the customer never submitted is not a failure."""
    payment = await _payment(db_session, PaymentStatus.EXPIRED)
    verdict = {"status": "NOTFOUND", "is_paid": False, "is_failed": False,
               "is_pending": True, "raw": {}}
    with _partner_unavailable(), _payin(verdict):
        assert await sweep_once() == 0
    assert await _status_of(db_session, payment.id) == PaymentStatus.EXPIRED


async def test_a_country_missing_agent_credentials_is_skipped(db_session):
    from app.services.touchpay_direct_service import TouchPayDirectError
    payment = await _payment(db_session, PaymentStatus.PROCESSING)
    with _partner_unavailable(), _payin(
        side_effect=TouchPayDirectError("TouchPay not configured for CM: missing password"),
    ):
        assert await sweep_once() == 0
    assert await _status_of(db_session, payment.id) == PaymentStatus.PROCESSING


async def test_both_routes_failing_leaves_the_payment_alone(db_session):
    from app.services.touchpay_direct_service import TouchPayDirectError
    payment = await _payment(db_session, PaymentStatus.EXPIRED)
    with _partner_unavailable(), _payin(
        side_effect=TouchPayDirectError("Status lookup unreachable: boom"),
    ):
        assert await sweep_once() == 0   # returns, does not raise
    assert await _status_of(db_session, payment.id) == PaymentStatus.EXPIRED


async def test_a_late_failure_verdict_is_recorded(db_session):
    """Orange RDC's case: TouchPay holds a FAILED it never sent us."""
    payment = await _payment(db_session, PaymentStatus.EXPIRED, country="CD")
    with _partner_unavailable(), _payin(_verdict("FAILED", failed=True)):
        assert await sweep_once() == 1
    assert await _status_of(db_session, payment.id) == PaymentStatus.FAILED


# --------------------------------------------------------------------------
# The deep pass
# --------------------------------------------------------------------------
# TouchPay can sit on PENDING for weeks, so a 48-hour window quietly gives
# up on money that is still moving. PAY-45199C50ABB04456 was SUCCEED there
# and EXPIRED here for 17 days, found only by a hand sweep on 2026-09-29:
# 10 613 XAF collected from the customer and never credited.

from app.services.touchpay_reconciler import DEEP_SWEEP_WINDOW_DAYS


async def test_the_fast_pass_still_ignores_old_payments(db_session):
    payment = await _payment(db_session, PaymentStatus.EXPIRED, age_hours=72)
    with _check(_verdict("SUCCEED", paid=True)):
        assert await sweep_once() == 0
    assert await _status_of(db_session, payment.id) == PaymentStatus.EXPIRED


async def test_the_deep_pass_recovers_what_the_fast_one_aged_out_of(db_session):
    payment = await _payment(db_session, PaymentStatus.EXPIRED, age_hours=17 * 24)
    with _check(_verdict("SUCCEED", paid=True)):
        assert await sweep_once(deep=True) == 1
    assert await _status_of(db_session, payment.id) == PaymentStatus.COMPLETED


async def test_the_deep_pass_leaves_the_recent_window_to_the_fast_one(db_session):
    """Asking twice about the same payment every six hours is waste."""
    payment = await _payment(db_session, PaymentStatus.EXPIRED, age_hours=2)
    with _check(_verdict("SUCCEED", paid=True)):
        assert await sweep_once(deep=True) == 0
    assert await _status_of(db_session, payment.id) == PaymentStatus.EXPIRED


async def test_the_deep_pass_stops_at_its_own_horizon(db_session):
    older = (DEEP_SWEEP_WINDOW_DAYS + 2) * 24
    payment = await _payment(db_session, PaymentStatus.EXPIRED, age_hours=older)
    with _check(_verdict("SUCCEED", paid=True)):
        assert await sweep_once(deep=True) == 0
    assert await _status_of(db_session, payment.id) == PaymentStatus.EXPIRED


async def test_a_pending_verdict_still_settles_nothing_in_the_deep_pass(db_session):
    """Five payins have been PENDING at TouchPay for weeks; leave them."""
    payment = await _payment(db_session, PaymentStatus.EXPIRED, age_hours=20 * 24)
    with _check(_verdict("PENDING", pending=True)):
        assert await sweep_once(deep=True) == 0
    assert await _status_of(db_session, payment.id) == PaymentStatus.EXPIRED
