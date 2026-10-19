"""AccountPE Orange CI/SN/BF needs the payer's OTP as om_otp (2026-10-19).

Its Direct API doc: "om_otp is required when payment_method is ORANGE and
country_code is CI, SN, or BF". Senegal on 2026-10-17: AccountPE first for
Orange, refused "customer.otp must not be null" on every payment.
"""
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.models.country import CountryOperator
from app.models.provider import CountryProvider, ProviderConfig, ProviderGroup
from app.services.accountpe_service import AccountPEError, accountpe_service
from app.services.payment_router import otp_requirement


@pytest.fixture
async def ap(db_session):
    p = ProviderConfig(code="ACCOUNTPE", name="AccountPE", provider_group=ProviderGroup.MOBILE,
                       is_active=True, config={"api_key": "k", "base_url": "https://ap.test/api"})
    db_session.add(p)
    db_session.add(CountryProvider(country_code="CM", provider_code="ACCOUNTPE", priority=0, is_active=True))
    db_session.add(CountryOperator(country_code="CM", operator_code="ORANGE", operator_name="Orange Money",
                                   service_code="Orange", provider_code="ACCOUNTPE", is_active=True,
                                   otp_required=True, ussd_code="#144*391#"))
    await db_session.commit()
    return p


def _phone():
    return "69" + str(uuid.uuid4().int)[:7]


async def _initiate(db_session, ap, otp=None):
    return await accountpe_service.initiate_payment(
        db=db_session, provider=ap, payment_reference="PAY-AP-OTP", amount=5000,
        phone_number=_phone(), operator_code="ORANGE", country_code="CM", otp_code=otp,
    )


async def test_the_otp_is_sent_as_om_otp(db_session, ap):
    post = AsyncMock(return_value=SimpleNamespace(status_code=200, text="", json=lambda: {
        "status": 200, "message": "ok", "data": {"id": 1}}))
    with patch("httpx.AsyncClient.post", new=post):
        await _initiate(db_session, ap, otp=" 12 34 ")
    assert post.await_args.kwargs["json"]["om_otp"] == "1234"


async def test_no_otp_is_refused_before_calling_accountpe(db_session, ap):
    post = AsyncMock()
    with patch("httpx.AsyncClient.post", new=post):
        with pytest.raises(AccountPEError) as exc:
            await _initiate(db_session, ap)
    post.assert_not_awaited()
    assert "#144*391#" in str(exc.value) and not exc.value.outcome_unknown


async def test_checkout_asks_when_the_default_needs_it_but_api_falls_back(db_session, ap):
    # TouchPay (the conftest's CM provider) serves Orange with no OTP, behind AccountPE.
    assert (await otp_requirement(db_session, "CM", "ORANGE", strict=False)) is not None
    assert (await otp_requirement(db_session, "CM", "ORANGE", strict=True)) is None
