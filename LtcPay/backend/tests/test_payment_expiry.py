"""
LtcPay - expiry sweep and duplicate-window guard tests.

Covers the two defects observed in production on 2026-08-22:
- abandoned checkouts stayed PENDING forever because nothing applied
  `expires_at` (4 payments, 2,024,700 XAF)
- customers retrying immediately after a failure spent a TouchPay round-trip
  only to be refused by its 5-minute duplicate guard (9 payments)
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.core import velocity
from app.models.merchant import Merchant
from app.models.payment import Payment, PaymentStatus
from app.services import payment_expirer
from app.services.payment_expirer import PROCESSING_GRACE_MINUTES, expire_once
from app.services.touchpay_direct_service import (
    TouchPayDirectError,
    duplicate_retry_after,
    friendly_initiation_error,
    is_customer_error,
)

from tests.conftest import TestSessionLocal


@pytest_asyncio.fixture(autouse=True)
def _use_test_session():
    """Point the sweep at the in-memory test database."""
    with patch.object(payment_expirer, "async_session", TestSessionLocal):
        yield


async def _make_payment(
    db, merchant: Merchant, status: PaymentStatus, expires_in_minutes: float,
) -> Payment:
    reference = f"PAY-{uuid.uuid4().hex[:16].upper()}"
    payment = Payment(
        merchant_id=merchant.id,
        reference=reference,
        payment_token=reference,
        amount=Decimal("510000.00"),
        currency="XAF",
        status=status,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes),
        payment_url=f"http://test/pay/{reference}",
    )
    db.add(payment)
    await db.commit()
    return payment


async def _status_of(db, payment: Payment) -> PaymentStatus:
    """Read the status back from a fresh session, bypassing the identity map."""
    async with TestSessionLocal() as fresh:
        row = await fresh.execute(
            select(Payment.status).where(Payment.id == payment.id)
        )
        return row.scalar_one()


class TestExpirySweep:
    """The job that finally applies expires_at."""

    async def test_expires_past_due_pending_payment(self, db_session, demo_merchant):
        payment = await _make_payment(
            db_session, demo_merchant, PaymentStatus.PENDING, -30,
        )

        assert await expire_once() == 1
        assert await _status_of(db_session, payment) == PaymentStatus.EXPIRED

    async def test_leaves_pending_payment_still_within_its_window(
        self, db_session, demo_merchant,
    ):
        payment = await _make_payment(
            db_session, demo_merchant, PaymentStatus.PENDING, 30,
        )

        assert await expire_once() == 0
        assert await _status_of(db_session, payment) == PaymentStatus.PENDING

    async def test_processing_payment_keeps_its_grace_period(
        self, db_session, demo_merchant,
    ):
        """An operator prompt may still be answered just after expiry."""
        payment = await _make_payment(
            db_session, demo_merchant, PaymentStatus.PROCESSING,
            -(PROCESSING_GRACE_MINUTES - 5),
        )

        assert await expire_once() == 0
        assert await _status_of(db_session, payment) == PaymentStatus.PROCESSING

    async def test_processing_payment_expires_after_the_grace_period(
        self, db_session, demo_merchant,
    ):
        payment = await _make_payment(
            db_session, demo_merchant, PaymentStatus.PROCESSING,
            -(PROCESSING_GRACE_MINUTES + 5),
        )

        assert await expire_once() == 1
        assert await _status_of(db_session, payment) == PaymentStatus.EXPIRED

    @pytest.mark.parametrize(
        "settled",
        [PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.CANCELLED],
    )
    async def test_never_touches_a_settled_payment(
        self, db_session, demo_merchant, settled,
    ):
        """A payment that got its verdict must survive its own expiry date."""
        payment = await _make_payment(db_session, demo_merchant, settled, -600)

        assert await expire_once() == 0
        assert await _status_of(db_session, payment) == settled

    async def test_ignores_payments_without_an_expiry(self, db_session, demo_merchant):
        payment = await _make_payment(
            db_session, demo_merchant, PaymentStatus.PENDING, -30,
        )
        payment.expires_at = None
        await db_session.commit()

        assert await expire_once() == 0
        assert await _status_of(db_session, payment) == PaymentStatus.PENDING

    async def test_second_sweep_is_a_no_op(self, db_session, demo_merchant):
        await _make_payment(db_session, demo_merchant, PaymentStatus.PENDING, -30)

        assert await expire_once() == 1
        assert await expire_once() == 0


class TestDuplicateWindow:
    """The 5-minute guard mirrored from TouchPay."""

    def _cache(self, ttl: int = -2):
        """Stand in for the cache service; its `redis` is a read-only property."""
        fake = MagicMock()
        fake.ttl.return_value = ttl
        return SimpleNamespace(redis=fake), fake

    def test_no_wait_when_the_window_was_never_opened(self):
        cache, _ = self._cache(ttl=-2)
        with patch.object(velocity, "cache", cache):
            assert velocity.duplicate_payin_status("MTN", "670000000", 5000) == (0, None)

    def test_returns_remaining_seconds_while_the_window_is_open(self):
        cache, fake = self._cache(ttl=212)
        fake.get.return_value = "1"
        with patch.object(velocity, "cache", cache):
            assert velocity.duplicate_payin_status("MTN", "670000000", 5000) == (212, None)

    def test_carries_the_previous_rejection_reason(self):
        cache, fake = self._cache(ttl=180)
        fake.get.return_value = "Le solde du compte du payeur est insuffisant"
        with patch.object(velocity, "cache", cache):
            wait, reason = velocity.duplicate_payin_status("ORANGE", "690000000", 5000)
        assert wait == 180
        assert "insuffisant" in reason

    def test_annotation_keeps_the_original_ttl(self):
        """The window must not be extended by learning why it failed."""
        cache, fake = self._cache()
        with patch.object(velocity, "cache", cache):
            velocity.annotate_payin_attempt("MTN", "670000000", 5000, "solde insuffisant")

        kwargs = fake.set.call_args.kwargs
        assert kwargs["keepttl"] is True
        assert kwargs["xx"] is True
        assert "ex" not in kwargs

    def test_window_is_scoped_to_operator_phone_and_amount(self):
        """A different order for the same customer must not be blocked."""
        cache, fake = self._cache()
        with patch.object(velocity, "cache", cache):
            velocity.record_payin_attempt("MTN", "670000000", 5000)
            velocity.duplicate_payin_status("MTN", "670000000", 7500)

        opened = fake.set.call_args[0][0]
        checked = fake.ttl.call_args[0][0]
        assert opened != checked
        assert opened.endswith(":MTN:670000000:5000")

    def test_fails_open_without_redis(self):
        """TouchPay's own guard stays the backstop when Redis is down."""
        with patch.object(velocity, "cache", SimpleNamespace(redis=None)):
            assert velocity.duplicate_payin_status("MTN", "670000000", 5000) == (0, None)
            velocity.record_payin_attempt("MTN", "670000000", 5000)  # no raise

    def test_recording_sets_the_five_minute_ttl(self):
        cache, fake = self._cache()
        with patch.object(velocity, "cache", cache):
            velocity.record_payin_attempt("ORANGE", "690000000", 1200)

        assert fake.set.call_args.kwargs["ex"] == velocity.DUPLICATE_WINDOW_SECONDS


class TestDuplicateRejectionSurface:
    """How the pre-flight rejection reaches the customer and the merchant."""

    def _preflight_error(self, wait: int) -> TouchPayDirectError:
        return TouchPayDirectError(
            "Une operation similaire a ete envoyee il y a moins de 5 minutes",
            status_code=300,
            raw_response={"retry_after": wait},
        )

    def test_message_states_the_remaining_delay(self):
        message = friendly_initiation_error(self._preflight_error(212))
        assert "3 min 32 s" in message

    def test_message_under_a_minute_is_in_seconds(self):
        message = friendly_initiation_error(self._preflight_error(45))
        assert "45 secondes" in message

    def test_touchpays_own_rejection_keeps_the_generic_message(self):
        """TouchPay never tells us how much of its window is left."""
        exc = TouchPayDirectError(
            "Une operation similaire a ete envoyee il y a moins de 5 minutes",
            status_code=300,
        )
        assert duplicate_retry_after(exc) is None
        assert "Patientez 5 minutes" in friendly_initiation_error(exc)

    def test_rejection_stays_classified_as_customer_caused(self):
        """It must not count toward the operator-outage alert nor fail over."""
        assert is_customer_error(self._preflight_error(212)) is True

    def test_retry_after_is_read_back_as_an_int(self):
        assert duplicate_retry_after(self._preflight_error(212)) == 212


class TestRetryIsNotPunished:
    """The 2026-08-23 partner complaint: customers locked out while retrying.

    A shopper with an empty Orange wallet retried 7 times in 11 minutes and hit
    three different walls — TouchPay's duplicate window, then our own 30-minute
    velocity lockout — without ever being told their balance was the problem.
    """

    def test_the_window_opens_even_when_the_operator_rejects_outright(self):
        """Orange refuses 'solde insuffisant' synchronously (HTTP 300) and
        still holds its window: opening ours only on success missed the most
        common case entirely."""
        import inspect
        from app.services.touchpay_direct_service import TouchPayDirectService

        source = inspect.getsource(TouchPayDirectService.initiate_payment)
        opened = source.index("record_payin_attempt(")
        sent = source.index("client.put(")
        assert opened < sent, "the window must open before the request leaves"

    def test_local_refusal_does_not_consume_a_velocity_slot(self):
        """Ordering matters: a retry we block ourselves never reached TouchPay,
        so counting it as an attempt is what produced the 30-minute lockout."""
        import inspect
        from app.services.touchpay_direct_service import TouchPayDirectService

        source = inspect.getsource(TouchPayDirectService.initiate_payment)
        assert source.index("duplicate_payin_status(") < source.index("check_phone_velocity(")

    def test_customer_is_told_the_real_problem_not_the_duplicate(self):
        exc = TouchPayDirectError(
            "Une operation similaire a ete envoyee il y a moins de 5 minutes",
            status_code=300,
            raw_response={
                "retry_after": 200,
                "previous_error": "Le solde du compte du payeur est insuffisant| MP2608",
            },
        )
        message = friendly_initiation_error(exc)

        assert "Solde insuffisant" in message
        assert "Rechargez" in message
        assert "3 min 20 s" in message

    def test_unknown_previous_reason_falls_back_to_the_plain_wait(self):
        exc = TouchPayDirectError(
            "Une operation similaire a ete envoyee il y a moins de 5 minutes",
            status_code=300,
            raw_response={"retry_after": 200, "previous_error": None},
        )
        assert "Patientez encore 3 min 20 s" in friendly_initiation_error(exc)

    def test_lockout_message_states_the_real_remaining_time(self):
        from app.core.velocity import velocity_lockout_message

        assert "2 min 05 s" in velocity_lockout_message(125)
