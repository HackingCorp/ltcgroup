"""A country whose Mobile Money has no push provider, but E-nkap's hosted page.

Chad, 2026-10-12: SebPay's partner refused GCL Express's Moov payments and
quoted the payer ~10% on top of the amount, so Chad's Mobile Money moved to
E-nkap, whose hosted page lets the customer pick their operator. The
checkout must offer that page as the Mobile Money option, and a Direct API
request must say what to send instead of a bare "not available".
"""
import uuid
from decimal import Decimal
from unittest.mock import PropertyMock, patch

import pytest
from sqlalchemy import select

from app.models.payment import Payment, PaymentStatus
from app.models.provider import CountryProvider, ProviderConfig, ProviderGroup


@pytest.fixture
async def hosted_only(db_session):
    """CM with E-nkap as card provider and its push provider switched off."""
    db_session.add(ProviderConfig(
        code="ENKAP", name="E-nkap", provider_group=ProviderGroup.CARD, is_active=True,
        config={"consumer_key": "k", "consumer_secret": "s"},
    ))
    db_session.add(CountryProvider(country_code="CM", provider_code="ENKAP", priority=1, is_active=True))
    link = (await db_session.execute(select(CountryProvider).where(
        CountryProvider.country_code == "CM", CountryProvider.provider_code == "TOUCHPAY",
    ))).scalar_one()
    link.is_active = False
    await db_session.commit()


async def test_direct_api_is_told_to_use_the_hosted_page(client, auth_headers, hosted_only):
    response = await client.post("/api/v1/payments", headers=auth_headers, json={
        "amount": 5000, "currency": "XAF", "country": "CM",
        "payment_mode": "DIRECT_API", "operator": "MTN", "customer_phone": "237670000000",
    })
    assert response.status_code == 400
    assert "payment_method BANK_CARD" in response.json()["detail"]


async def test_checkout_offers_the_hosted_page_as_mobile_money(client, db_session, demo_merchant, hosted_only):
    from tests.conftest import TestSessionLocal

    payment = Payment(
        merchant_id=demo_merchant.id, reference=f"PAY-{uuid.uuid4().hex[:16].upper()}",
        payment_token=uuid.uuid4().hex, amount=Decimal("5000.00"), currency="XAF",
        country="CM", status=PaymentStatus.PENDING,
    )
    db_session.add(payment)
    await db_session.commit()

    with patch("app.main.async_session", TestSessionLocal), \
         patch("app.services.stripe_service.StripeService.is_configured",
               new_callable=PropertyMock, return_value=False):
        # Even with Stripe off, the hosted page alone is enough.
        page = await client.get(f"/pay/{payment.reference}")
    assert page.status_code == 200
    assert "Mobile Money ou carte bancaire" in page.text
    assert 'id="momo-methods"' not in page.text      # no empty operator list
    assert 'data-method="card"' in page.text


async def test_a_push_country_keeps_its_operators(client, db_session, demo_merchant):
    from tests.conftest import TestSessionLocal

    payment = Payment(
        merchant_id=demo_merchant.id, reference=f"PAY-{uuid.uuid4().hex[:16].upper()}",
        payment_token=uuid.uuid4().hex, amount=Decimal("5000.00"), currency="XAF",
        country="CM", status=PaymentStatus.PENDING,
    )
    db_session.add(payment)
    await db_session.commit()
    with patch("app.main.async_session", TestSessionLocal):
        page = await client.get(f"/pay/{payment.reference}")
    assert 'id="momo-methods"' in page.text
    assert "Mobile Money ou carte bancaire" not in page.text
