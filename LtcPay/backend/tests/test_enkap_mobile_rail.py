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


async def test_a_currency_other_than_xaf_or_xof_is_refused_before_calling_enkap(db_session):
    from app.services.enkap_service import EnkapError
    from app.services.payment_router import _dispatch_enkap

    create = AsyncMock()
    with patch("app.services.enkap_service.enkap_service.create_order", new=create):
        with pytest.raises(EnkapError):
            await _dispatch_enkap(
                db_session, SimpleNamespace(code="ENKAP"), SimpleNamespace(currency="CDF"),
                "PAY-X", 5000, "2250700000000", "CM", None, None,
            )
    create.assert_not_awaited()


async def test_a_hosted_country_says_so_and_the_checkout_asks_nothing(
    client, db_session, demo_merchant, enkap_mobile,
):
    import uuid
    from app.models.payment import Payment, PaymentStatus
    from tests.conftest import TestSessionLocal

    cm = lambda: next(c for c in listing if c["code"] == "CM")  # noqa: E731
    listing = (await client.get("/api/v1/payments/countries")).json()
    assert cm()["hosted_payment_page"] is False      # TouchPay pushes first

    link = (await db_session.execute(select(CountryProvider).where(
        CountryProvider.country_code == "CM", CountryProvider.provider_code == "TOUCHPAY"))).scalar_one()
    link.is_active = False
    await db_session.commit()
    listing = (await client.get("/api/v1/payments/countries")).json()
    assert cm()["hosted_payment_page"] is True

    payment = Payment(
        merchant_id=demo_merchant.id, reference=f"PAY-{uuid.uuid4().hex[:16].upper()}",
        payment_token=uuid.uuid4().hex, amount=Decimal("5000.00"), currency="XAF",
        country="CM", status=PaymentStatus.PENDING,
    )
    db_session.add(payment)
    await db_session.commit()
    with patch("app.main.async_session", TestSessionLocal):
        page = await client.get(f"/pay/{payment.reference}")
    assert 'id="momo-methods"' not in page.text      # no operator buttons
    assert 'id="phone-input"' not in page.text       # no phone field
    assert "Mobile Money ou carte bancaire" in page.text


@pytest.fixture
def as_admin():
    from app.api.v1.auth import get_current_admin
    from app.main import app

    app.dependency_overrides[get_current_admin] = lambda: SimpleNamespace(email="admin@ltcgroup.site")
    yield
    app.dependency_overrides.pop(get_current_admin, None)


async def test_admin_sees_and_toggles_hosted_mobile_money(client, db_session, enkap_mobile, as_admin):
    providers = (await client.get("/api/v1/admin/providers")).json()
    enkap = next(p for p in providers if p["code"] == "ENKAP")
    cm = next(l for l in enkap["countries"] if l["country_code"] == "CM")
    assert enkap["mobile_hosted"] is True
    assert (cm["mobile_rows_active"], cm["mobile_rows_total"]) == (2, 2)

    r = await client.put("/api/v1/admin/providers/ENKAP/countries/CM/mobile", json={"is_active": False})
    assert r.status_code == 200, r.text
    assert await provider_service.resolve_mobile_providers(db_session, "CM", "MTN") and \
        [p.code for p, _ in await provider_service.resolve_mobile_providers(db_session, "CM", "MTN")] == ["TOUCHPAY"]
    # The card-rail link is untouched.
    link = (await db_session.execute(select(CountryProvider).where(
        CountryProvider.country_code == "CM", CountryProvider.provider_code == "ENKAP"))).scalar_one()
    assert link.is_active is True

    # A push provider cannot be toggled this way, nor a country without rows.
    assert (await client.put("/api/v1/admin/providers/TOUCHPAY/countries/CM/mobile", json={"is_active": False})).status_code == 400
    assert (await client.put("/api/v1/admin/providers/ENKAP/countries/CI/mobile", json={"is_active": True})).status_code == 400  # no rows


async def test_an_xof_payment_goes_through_as_an_xaf_order(db_session):
    from app.services.enkap_service import enkap_service

    sent = {}

    async def fake_request(method, config, path, json_payload=None, **kw):
        sent.update(json_payload)
        return SimpleNamespace(status_code=200, text="", json=lambda: {
            "orderTransactionId": "ENK-XOF", "redirectUrl": "https://enkap.test/x"})

    provider = SimpleNamespace(code="ENKAP", config={"consumer_key": "k", "consumer_secret": "s"})
    with patch.object(enkap_service, "_request_with_fallbacks", new=fake_request):
        order = await enkap_service.create_order(
            provider, payment_reference="PAY-XOF", amount=5000, currency="XOF",
            customer_name=None, customer_email=None, customer_phone="2250700000000",
            description=None, return_url="https://r", notification_url="https://n",
            country_phone_prefix="225",
        )
    assert order["txid"] == "ENK-XOF"
    assert sent["currency"] == "XAF" and sent["totalAmount"] == 5000   # 1:1 parity


async def test_hosted_mobile_needs_no_country_link(db_session, enkap_mobile):
    # Its rows alone make it a Mobile Money provider; a link would also make
    # it the country's card provider.
    link = (await db_session.execute(select(CountryProvider).where(
        CountryProvider.country_code == "CM", CountryProvider.provider_code == "ENKAP"))).scalar_one()
    await db_session.delete(link)
    await db_session.commit()
    cands = await provider_service.resolve_mobile_providers(db_session, "CM", "MTN")
    assert [p.code for p, _ in cands] == ["TOUCHPAY", "ENKAP"]

    # ...but a link turned off still turns it off in that country.
    db_session.add(CountryProvider(country_code="CM", provider_code="ENKAP", priority=1, is_active=False))
    await db_session.commit()
    cands = await provider_service.resolve_mobile_providers(db_session, "CM", "MTN")
    assert [p.code for p, _ in cands] == ["TOUCHPAY"]


async def test_admin_can_make_the_hosted_page_the_default(client, db_session, enkap_mobile, as_admin):
    r = await client.put("/api/v1/admin/providers/ENKAP/countries/CM/mobile", json={"default": True})
    assert r.status_code == 200, r.text
    assert r.json()["default"] is True
    db_session.expire_all()
    cands = await provider_service.resolve_mobile_providers(db_session, "CM", "MTN")
    assert [p.code for p, _ in cands] == ["ENKAP", "TOUCHPAY"]
    assert await provider_service.mobile_is_hosted(db_session, "CM") is True

    listing = (await client.get("/api/v1/admin/providers")).json()
    enkap = next(p for p in listing if p["code"] == "ENKAP")
    assert enkap["mobile_countries"]["CM"] == {"active": 2, "total": 2, "default": True}

    await client.put("/api/v1/admin/providers/ENKAP/countries/CM/mobile", json={"default": False})
    db_session.expire_all()
    cands = await provider_service.resolve_mobile_providers(db_session, "CM", "MTN")
    assert [p.code for p, _ in cands] == ["TOUCHPAY", "ENKAP"]


async def _unlink_enkap(db_session):
    link = (await db_session.execute(select(CountryProvider).where(
        CountryProvider.country_code == "CM", CountryProvider.provider_code == "ENKAP"))).scalar_one()
    await db_session.delete(link)
    await db_session.commit()


async def test_bank_card_reaches_an_unlinked_hosted_page(client, auth_headers, db_session, enkap_mobile):
    """2026-10-14: E-nkap served Côte d'Ivoire's Mobile Money without a link,
    the country said hosted_payment_page, and BANK_CARD fell to Stripe."""
    await _unlink_enkap(db_session)
    with patch("app.services.enkap_service.enkap_service.create_order", new=AsyncMock(return_value=ORDER)):
        response = await client.post("/api/v1/payments", headers=auth_headers, json={
            "amount": 5000, "currency": "XAF", "country": "CM", "payment_method": "BANK_CARD",
        })
    assert response.status_code == 201, response.text
    assert response.json()["payment_mode"] == "REDIRECT"
    assert response.json()["payment_url"] == ORDER["redirect_url"]


async def test_bank_card_without_country_reads_it_off_the_phone(client, auth_headers, db_session, enkap_mobile):
    with patch("app.services.enkap_service.enkap_service.create_order", new=AsyncMock(return_value=ORDER)):
        response = await client.post("/api/v1/payments", headers=auth_headers, json={
            "amount": 5000, "currency": "XAF", "payment_method": "BANK_CARD",
            "customer_info": {"name": "A", "phone": "237670000000"},
        })
    assert response.status_code == 201, response.text
    assert response.json()["country"] == "CM"
    assert response.json()["payment_mode"] == "REDIRECT"


async def test_bank_card_xof_without_any_country_is_refused(client, auth_headers, db_session, enkap_mobile):
    response = await client.post("/api/v1/payments", headers=auth_headers, json={
        "amount": 5000, "currency": "XOF", "payment_method": "BANK_CARD",
        "customer_info": {"name": "A", "email": "a@example.com"},
    })
    assert response.status_code == 400
    assert "country" in response.json()["detail"]
    from app.models.payment import Payment
    assert (await db_session.execute(select(Payment))).scalars().first() is None
