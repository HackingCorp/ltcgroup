"""Mali, 2026-11-02: two defects found in one afternoon's payments.

1. Wave lives on any number (an Orange or Moov SIM), so its rows carry no
   prefixes. The wrong-operator guard matched the number to Orange and
   refused it: 12 Wave attempts out of 12, all time.
2. AccountPE timed out twice on the same Moov payer. The router rightly did
   not fail over, but the API then wrote the payment FAILED with the provider
   column still on its TOUCHPAY default — so no sweep ever asked AccountPE,
   and the customer says one of the two was paid. A payment with no answer
   now stays PROCESSING on the provider that may hold it.
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from sqlalchemy import select

from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.services.country_service import CountryService
from app.services.touchpay_direct_service import TouchPayDirectError


def _op(code, prefixes):
    return SimpleNamespace(operator_code=code, operator_name=code.title(),
                           phone_prefixes=prefixes, is_active=True)


ML = [
    _op("ORANGE", ["7", "82", "83", "90", "91", "92", "93", "94"]),
    _op("MOOV", ["6", "89", "95", "96", "97", "98", "99"]),
    _op("WAVE", []),
]


def test_wave_on_an_orange_sim_is_not_a_mismatch():
    assert CountryService.operator_mismatch(ML, "74372409", "WAVE") is None


def test_a_moov_number_sent_as_orange_is_still_caught():
    mismatch = CountryService.operator_mismatch(ML, "66077675", "ORANGE")
    assert mismatch is not None and mismatch.operator_code == "MOOV"


def _no_answer(provider_code):
    exc = TouchPayDirectError("Request timed out: ", outcome_unknown=True)
    exc.provider_code = provider_code
    return AsyncMock(side_effect=exc)


async def test_api_keeps_an_unanswered_payment_processing_on_its_provider(
    client, db_session, auth_headers,
):
    with patch("app.api.v1.payments.initiate_mobile_payment", new=_no_answer("ACCOUNTPE")):
        response = await client.post("/api/v1/payments", headers=auth_headers, json={
            "amount": 5108, "currency": "XAF", "country": "CM",
            "payment_mode": "DIRECT_API", "operator": "MTN",
            "customer_phone": "237670000001",
        })
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "PROCESSING"
    db_session.expire_all()
    row = (await db_session.execute(
        select(Payment).where(Payment.reference == body["reference"])
    )).scalar_one()
    assert row.status == PaymentStatus.PROCESSING
    assert row.provider == PaymentProvider.ACCOUNTPE  # where the sweep will look
    assert row.direct_api_data["outcome_unknown"] is True


async def test_api_still_fails_a_real_refusal(client, db_session, auth_headers):
    refusal = AsyncMock(side_effect=TouchPayDirectError("Erreur interne. Veuillez reessayer."))
    with patch("app.api.v1.payments.initiate_mobile_payment", new=refusal):
        response = await client.post("/api/v1/payments", headers=auth_headers, json={
            "amount": 5108, "currency": "XAF", "country": "CM",
            "payment_mode": "DIRECT_API", "operator": "MTN",
            "customer_phone": "237670000002",
        })
    assert response.status_code == 502
