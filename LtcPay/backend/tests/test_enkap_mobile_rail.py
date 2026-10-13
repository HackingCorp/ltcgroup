"""E-nkap as the fourth Mobile Money provider (hosted page, XAF only).

It is tried after every push provider whatever its link priority, and what
it returns is a redirect_url: the merchant — even a mobile app — has to
open it, nothing reaches the customer's phone.
"""
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select

from app.models.country import CountryOperator
from app.models.provider import CountryProvider, ProviderConfig, ProviderGroup
from app.services.provider_service import provider_service
from app.services.touchpay_direct_service import TouchPayDirectError

ORDER = {"txid": "ENK-TX-1", "redirect_url": "https://enkap.test/pay/ENK-TX-1", "raw": {}}


@pytest.fixture
async def enkap_mobile(db_session):
    db_session.add(ProviderConfig(
        code="ENKAP", name="E-nkap", provider_group=ProviderGroup.CARD, is_active=True,
        config={"consumer_key": "k", "consumer_secret": "s"},
    ))
    # Same priority number as TouchPay's link: the card rail's ranking must
    # not put a hosted page ahead of a push provider.
    db_session.add(CountryProvider(country_code="CM", provider_code="ENKAP", priority=1, is_active=True))
    for op in ("MTN", "ORANGE"):
        db_session.add(CountryOperator(
            country_code="CM", operator_code=op, operator_name=op, service_code="ENKAP",
            provider_code="ENKAP", is_active=True,
        ))
    await db_session.commit()


async def test_hosted_page_comes_after_push_providers(db_session, enkap_mobile):
    cands = await provider_service.resolve_mobile_providers(db_session, "CM", "MTN")
    assert [p.code for p, _ in cands] == ["TOUCHPAY", "ENKAP"]


async def test_push_failure_falls_over_to_the_hosted_page(client, auth_headers, db_session, enkap_mobile):
    with patch("app.services.payment_router.touchpay_direct_service.initiate_payment",
               new=AsyncMock(side_effect=TouchPayDirectError("[19] Unable to process payment at this time."))), \
         patch("app.services.enkap_service.enkap_service.create_order", new=AsyncMock(return_value=ORDER)):
        response = await client.post("/api/v1/payments", headers=auth_headers, json={
            "amount": 5000, "currency": "XAF", "country": "CM",
            "payment_mode": "DIRECT_API", "operator": "MTN", "customer_phone": "237670000000",
        })
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["redirect_url"] == ORDER["redirect_url"]
    assert body["status"] == "PROCESSING"

    from app.models.payment import Payment, PaymentProvider
    db_session.expire_all()
    p = (await db_session.execute(select(Payment).where(Payment.reference == body["reference"]))).scalar_one()
    assert p.provider == PaymentProvider.ENKAP
    assert p.provider_transaction_id == "ENK-TX-1"   # what E-nkap's settlement keys on


async def test_hosted_only_country_collects_through_the_page(client, auth_headers, db_session, enkap_mobile):
    link = (await db_session.execute(select(CountryProvider).where(
        CountryProvider.country_code == "CM", CountryProvider.provider_code == "TOUCHPAY"))).scalar_one()
    link.is_active = False
    await db_session.commit()
    with patch("app.services.enkap_service.enkap_service.create_order", new=AsyncMock(return_value=ORDER)) as create:
        response = await client.post("/api/v1/payments", headers=auth_headers, json={
            "amount": 5000, "currency": "XAF", "country": "CM",
            "payment_mode": "DIRECT_API", "operator": "ORANGE", "customer_phone": "237690000000",
        })
    assert response.status_code == 201, response.text
    assert response.json()["redirect_url"] == ORDER["redirect_url"]
    assert create.await_args.kwargs["currency"] == "XAF"
    assert create.await_args.kwargs["return_url"].endswith("/return")


async def test_a_non_xaf_payment_is_refused_before_calling_enkap(db_session):
    from app.services.enkap_service import EnkapError
    from app.services.payment_router import _dispatch_enkap

    create = AsyncMock()
    with patch("app.services.enkap_service.enkap_service.create_order", new=create):
        with pytest.raises(EnkapError):
            await _dispatch_enkap(
                db_session, SimpleNamespace(code="ENKAP"), SimpleNamespace(currency="XOF"),
                "PAY-X", 5000, "2250700000000", "CM", None, None,
            )
    create.assert_not_awaited()
