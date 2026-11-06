"""Currencies with minor units must be collected to the cent.

PAY-BBDC394E435A4B89 (2026-11-05, Sino Sourcing, Ghana): 763.13 GHS were
due, int() sent AccountPE 763, AccountPE collected 763.00 and said
"successful", and the merchant was credited 763.13 — nothing compared the
two amounts. Same on two Kenyan payins (1.03 KES).
"""
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.api.v1.endpoints.accountpe_callbacks import amount_paid_matches
from app.services import payment_router
from app.services.accountpe_service import wire_amount
from app.services.touchpay_direct_service import TouchPayDirectError


def test_accountpe_gets_the_cents():
    assert wire_amount(Decimal("763.13")) == 763.13
    assert wire_amount(Decimal("5000.00")) == 5000
    assert isinstance(wire_amount(Decimal("5000.00")), int)


async def _dispatch(code, amount):
    return await payment_router._dispatch(
        db=None, provider=SimpleNamespace(code=code),
        payment=SimpleNamespace(payment_token="tok"), reference="PAY-DEC",
        amount=amount, phone_number="244150716", operator_code="MTN",
        country_code="GH", customer_info={}, description=None,
    )


async def test_accountpe_receives_the_exact_amount():
    initiate = AsyncMock(return_value={"status": "pending"})
    with patch.object(payment_router.accountpe_service, "initiate_payment", new=initiate):
        await _dispatch("ACCOUNTPE", Decimal("763.13"))
    assert initiate.await_args.kwargs["amount"] == Decimal("763.13")


async def test_a_whole_number_provider_refuses_cents_instead_of_dropping_them():
    initiate = AsyncMock()
    with patch.object(payment_router.touchpay_direct_service, "initiate_payment", new=initiate):
        with pytest.raises(TouchPayDirectError):
            await _dispatch("TOUCHPAY", Decimal("763.13"))
    initiate.assert_not_awaited()


async def test_a_whole_amount_still_reaches_touchpay_as_an_integer():
    initiate = AsyncMock(return_value={"status": "INITIATED"})
    with patch.object(payment_router.touchpay_direct_service, "initiate_payment", new=initiate):
        await _dispatch("TOUCHPAY", Decimal("5000.00"))
    assert initiate.await_args.kwargs["amount"] == 5000
    assert isinstance(initiate.await_args.kwargs["amount"], int)


def _payment(amount, created):
    return SimpleNamespace(amount=Decimal(amount), created_at=created)


NEW = datetime(2026, 11, 7, tzinfo=timezone.utc)
OLD = datetime(2026, 11, 5, 21, 42, tzinfo=timezone.utc)


def test_a_short_collection_is_not_credited():
    assert not amount_paid_matches(_payment("763.13", NEW), 763.0)


def test_the_full_amount_is_credited():
    assert amount_paid_matches(_payment("763.13", NEW), 763.13)


def test_a_payin_sent_truncated_before_the_fix_still_settles():
    assert amount_paid_matches(_payment("763.13", OLD), 763.0)
    assert not amount_paid_matches(_payment("763.13", OLD), 700.0)
