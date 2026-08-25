"""
LtcPay - initiation/callback race and futile-failover tests.

Both came out of PAY-F03636F7EC554970 on 2026-08-24:

    14:26:41  TouchPay fails ("Aucun frais de service defini| MP2608...")
    14:26:41  router fails over to AccountPE
    14:26:42  TouchPay callback settles the payment PENDING -> FAILED
    14:26:43  AccountPE is called anyway, and refuses for "operation similaire"

Orange had already opened a transaction (the MP reference proves it), so no
other provider could ever have taken it — and the initiation handler was one
successful failover away from writing PROCESSING over a settled verdict.
"""
import uuid
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.api.v1.payments import record_initiation_outcome
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.services.payment_router import initiate_mobile_payment
from app.services.provider_service import ProviderRoutingError
from app.services.touchpay_direct_service import TouchPayDirectError

from tests.conftest import TestSessionLocal


def _provider(code):
    return SimpleNamespace(code=code, config={})


@pytest_asyncio.fixture
async def two_providers():
    """TouchPay first, AccountPE as the failover candidate."""
    candidates = [(_provider("TOUCHPAY"), None), (_provider("ACCOUNTPE"), None)]
    with patch(
        "app.services.payment_router.provider_service.resolve_mobile_providers",
        new=AsyncMock(return_value=candidates),
    ), patch(
        "app.services.payment_router.provider_service.apply_merchant_prefs",
        new=lambda c, *a, **k: c,
    ):
        yield


async def _initiate(**kwargs):
    return await initiate_mobile_payment(
        db=None, payment=SimpleNamespace(payment_token="tok"), reference="PAY-TEST",
        amount=25500, phone_number="659000000", operator_code="ORANGE",
        country_code="CM", **kwargs,
    )


class TestFailoverStopsAtTheOperator:

    async def test_no_failover_once_the_operator_registered_the_transaction(
        self, two_providers,
    ):
        """The MP reference means Orange took it; AccountPE fronts the same
        Orange and would only be bounced for 'operation similaire'."""
        touchpay_error = TouchPayDirectError(
            "Aucun frais de service defini.| MP260824A2A717E84FC4D0597E00",
            status_code=300,
        )
        dispatch = AsyncMock(side_effect=touchpay_error)

        with patch("app.services.payment_router._dispatch", dispatch):
            with pytest.raises(TouchPayDirectError) as caught:
                await _initiate()

        assert dispatch.await_count == 1, "AccountPE must not be called"
        assert "frais de service" in str(caught.value), "the real cause must survive"

    async def test_failover_still_happens_without_an_operator_reference(
        self, two_providers,
    ):
        """A provider-side failure that never reached the operator is exactly
        what failover is for."""
        outcomes = [
            TouchPayDirectError("HTTP error: connection refused"),
            {"status": "INITIATED"},
        ]
        dispatch = AsyncMock(side_effect=outcomes)

        with patch("app.services.payment_router._dispatch", dispatch):
            provider_used, response = await _initiate()

        assert dispatch.await_count == 2
        assert provider_used == "ACCOUNTPE"
        assert response["failover_trail"][0]["provider"] == "TOUCHPAY"

    async def test_customer_errors_still_abort_immediately(self, two_providers):
        dispatch = AsyncMock(side_effect=TouchPayDirectError(
            "Le solde du compte du payeur est insuffisant"
        ))

        with patch("app.services.payment_router._dispatch", dispatch):
            with pytest.raises(TouchPayDirectError):
                await _initiate()

        assert dispatch.await_count == 1


    async def test_a_customer_rejection_is_not_credited_to_the_guard(
        self, two_providers, caplog,
    ):
        """"Solde insuffisant" carries an MP reference but aborts on its own.

        Logging the operator-reference guard there claimed credit for a
        failover that was never going to happen, and it fired on most Orange
        traffic (7 times in 14 hours on 2026-08-25).
        """
        import logging as _logging

        dispatch = AsyncMock(side_effect=TouchPayDirectError(
            "Le solde du compte du payeur est insuffisant| MP260825E9CBF8B619206F1E0540"
        ))

        with caplog.at_level(_logging.INFO, logger="app.services.payment_router"):
            with patch("app.services.payment_router._dispatch", dispatch):
                with pytest.raises(TouchPayDirectError):
                    await _initiate()

        assert dispatch.await_count == 1
        assert "not failing over" not in caplog.text

    async def test_the_guard_is_logged_when_it_is_the_deciding_factor(
        self, two_providers, caplog,
    ):
        """A provider-side error carrying a reference: only the guard stops it."""
        import logging as _logging

        dispatch = AsyncMock(side_effect=TouchPayDirectError(
            "Aucun frais de service defini.| MP260824A2A717E84FC4D0597E00"
        ))

        with caplog.at_level(_logging.INFO, logger="app.services.payment_router"):
            with patch("app.services.payment_router._dispatch", dispatch):
                with pytest.raises(TouchPayDirectError):
                    await _initiate()

        assert dispatch.await_count == 1
        assert "not failing over" in caplog.text


class TestInitiationNeverClobbersACallback:

    async def _payment(self, db, merchant, status=PaymentStatus.PENDING):
        reference = f"PAY-{uuid.uuid4().hex[:16].upper()}"
        payment = Payment(
            merchant_id=merchant.id, reference=reference, payment_token=reference,
            amount=Decimal("25500.00"), currency="XAF", status=status,
            payment_url=f"http://test/pay/{reference}",
        )
        db.add(payment)
        await db.commit()
        await db.refresh(payment)
        return payment

    async def _status(self, payment):
        async with TestSessionLocal() as fresh:
            row = await fresh.execute(
                select(Payment.status).where(Payment.id == payment.id)
            )
            return row.scalar_one()

    async def test_pending_payment_takes_the_initiation_result(
        self, db_session, demo_merchant,
    ):
        payment = await self._payment(db_session, demo_merchant)

        decided = await record_initiation_outcome(
            db_session, payment,
            status_if_pending=PaymentStatus.PROCESSING,
            values={"provider": PaymentProvider.TOUCHPAY},
        )

        assert decided is True
        assert await self._status(payment) == PaymentStatus.PROCESSING

    async def test_a_completed_callback_is_not_pushed_back_to_processing(
        self, db_session, demo_merchant,
    ):
        """The dangerous one: money collected, status walked backwards."""
        payment = await self._payment(db_session, demo_merchant, PaymentStatus.COMPLETED)

        decided = await record_initiation_outcome(
            db_session, payment,
            status_if_pending=PaymentStatus.PROCESSING,
            values={"provider": PaymentProvider.ACCOUNTPE},
        )

        assert decided is False
        assert await self._status(payment) == PaymentStatus.COMPLETED

    async def test_a_completed_callback_is_not_overwritten_by_a_failure(
        self, db_session, demo_merchant,
    ):
        """Our HTTP call can time out on a payment the operator confirmed."""
        payment = await self._payment(db_session, demo_merchant, PaymentStatus.COMPLETED)

        decided = await record_initiation_outcome(
            db_session, payment,
            status_if_pending=PaymentStatus.FAILED,
            values={"direct_api_data": {"error": "Request timed out"}},
        )

        assert decided is False
        assert await self._status(payment) == PaymentStatus.COMPLETED

    async def test_the_provider_is_still_backfilled_when_the_race_is_lost(
        self, db_session, demo_merchant,
    ):
        payment = await self._payment(db_session, demo_merchant, PaymentStatus.COMPLETED)

        await record_initiation_outcome(
            db_session, payment,
            status_if_pending=PaymentStatus.PROCESSING,
            values={"provider": PaymentProvider.TOUCHPAY},
        )

        async with TestSessionLocal() as fresh:
            row = await fresh.execute(
                select(Payment.provider).where(Payment.id == payment.id)
            )
            assert row.scalar_one() == PaymentProvider.TOUCHPAY
