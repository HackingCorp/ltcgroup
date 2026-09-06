"""TouchPay's partner API: check_status, get_balance, cashin.

Three endpoints TouchPay documents in its Insomnia collection and that had
no caller here. They authenticate with partner_id + login_api +
password_api — not the agency + loginAgent + passwordAgent pair the payin
API takes — so a country configured for payins is not automatically
configured for these.
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services.touchpay_partner_service import (
    TouchPayPartnerError, TouchPayPartnerService,
)

FULL_CREDS = {
    "agency_code": "LTCGA0169",
    "partner_id": "PG12345678",
    "login_api": "login-api",
    "password_api": "pw-api",
    "partner_api_url": "https://apidist.gutouch.net/apidist/sec",
}


def _service(creds=None, response=None, capture=None):
    """A service whose credentials and HTTP round-trip are both stubbed."""
    service = TouchPayPartnerService()

    async def fake_creds(db, country_code):
        resolved = FULL_CREDS if creds is None else creds
        missing = [k for k in ("agency_code", "partner_id", "login_api", "password_api")
                   if not resolved.get(k)]
        if missing:
            raise TouchPayPartnerError(
                f"TouchPay partner API not configured for {country_code}: "
                f"missing {', '.join(missing)}"
            )
        return resolved

    service._credentials = fake_creds  # type: ignore[assignment]

    async def fake_post(creds_, path, payload, *, label):
        if capture is not None:
            capture.append((path, {**payload, **{k: creds_[k] for k in
                            ("partner_id", "login_api", "password_api")}}))
        if isinstance(response, Exception):
            raise response
        return response

    service._post = fake_post  # type: ignore[assignment]
    return service


# --------------------------------------------------------------------------
# check_status
# --------------------------------------------------------------------------

async def test_a_paid_payin_is_reported_as_paid():
    verdict = await _service(response={"status": "SUCCESSFUL"}).check_status(None, "GA", "PAY-1")
    assert verdict["is_paid"] and not verdict["is_failed"] and not verdict["is_pending"]


async def test_touchpays_own_succeed_spelling_counts_as_paid():
    # The transaction endpoint answers SUCCEED, not SUCCESSFUL.
    verdict = await _service(response={"status": "SUCCEED"}).check_status(None, "GA", "PAY-1")
    assert verdict["is_paid"]


async def test_a_failed_payin_is_reported_as_failed():
    verdict = await _service(response={"status": "FAILED"}).check_status(None, "GA", "PAY-1")
    assert verdict["is_failed"] and not verdict["is_paid"]


@pytest.mark.parametrize("label", ["PENDING", "INITIATED", "PROCESSING"])
async def test_an_in_flight_payin_is_neither_paid_nor_failed(label):
    verdict = await _service(response={"status": label}).check_status(None, "GA", "PAY-1")
    assert verdict["is_pending"]
    assert not verdict["is_paid"] and not verdict["is_failed"]


async def test_status_is_read_from_a_nested_body_too():
    verdict = await _service(response={"data": {"status": "successful"}}).check_status(None, "GA", "PAY-1")
    assert verdict["is_paid"]


async def test_no_readable_status_returns_none_rather_than_a_guess():
    # The caller must leave the payment alone; guessing is what this exists
    # to replace.
    assert await _service(response={"message": "ok"}).check_status(None, "GA", "PAY-1") is None


async def test_the_reference_sent_is_our_own():
    capture = []
    await _service(response={"status": "FAILED"}, capture=capture).check_status(None, "GA", "PAY-42")
    path, body = capture[0]
    assert path == "check_status"
    assert body["partner_transaction_id"] == "PAY-42"
    assert body["partner_id"] == "PG12345678"


# --------------------------------------------------------------------------
# get_balance
# --------------------------------------------------------------------------

async def test_balance_is_parsed():
    out = await _service(response={"balance": "125000.50", "currency": "XAF"}).get_balance(None, "GA")
    assert out["amount"] == 125000.50
    assert out["currency"] == "XAF"


async def test_balance_accepts_the_alternative_field_names():
    for field in ("amount", "solde", "available_balance"):
        out = await _service(response={field: 900}).get_balance(None, "GA")
        assert out["amount"] == 900


async def test_an_unreadable_balance_is_none_not_zero():
    # A dashboard showing 0 would read as "float exhausted" and trigger the
    # wrong reaction.
    out = await _service(response={"message": "ok"}).get_balance(None, "GA")
    assert out["amount"] is None


async def test_a_non_numeric_balance_is_none():
    out = await _service(response={"balance": "indisponible"}).get_balance(None, "GA")
    assert out["amount"] is None


# --------------------------------------------------------------------------
# cashin
# --------------------------------------------------------------------------

async def test_cashin_sends_every_documented_field():
    capture = []
    await _service(response={"status": 200}, capture=capture).cashin(
        None, "CM",
        service_id="CASHINMTNCMPART", recipient_phone_number="679711656",
        amount=500, partner_transaction_id="WD-1",
    )
    path, body = capture[0]
    assert path == "cashin"
    assert body["service_id"] == "CASHINMTNCMPART"
    assert body["recipient_phone_number"] == "679711656"
    assert body["amount"] == 500
    assert body["partner_transaction_id"] == "WD-1"
    assert body["login_api"] and body["password_api"]


# --------------------------------------------------------------------------
# Credentials
# --------------------------------------------------------------------------

@pytest.mark.parametrize("missing", ["partner_id", "login_api", "password_api"])
async def test_a_missing_credential_is_named(missing):
    creds = {**FULL_CREDS, missing: ""}
    with pytest.raises(TouchPayPartnerError) as exc:
        await _service(creds=creds).check_status(None, "GA", "PAY-1")
    assert missing in str(exc.value)
    assert "not configured" in str(exc.value)


async def test_payin_credentials_alone_are_not_enough():
    # A country set up for payins has agency_code but none of the partner
    # triple: it must fail loudly rather than send half-authenticated calls.
    creds = {"agency_code": "LTCGA0169", "partner_api_url": FULL_CREDS["partner_api_url"],
             "partner_id": "", "login_api": "", "password_api": ""}
    with pytest.raises(TouchPayPartnerError):
        await _service(creds=creds).get_balance(None, "GA")


# --------------------------------------------------------------------------
# Transport
# --------------------------------------------------------------------------

async def test_the_url_is_built_from_agency_and_path():
    service = TouchPayPartnerService()
    assert service._url("https://x/apidist/sec/", "LTCGA0169", "check_status") == \
        "https://x/apidist/sec/LTCGA0169/check_status"


async def test_a_transport_error_is_wrapped_not_leaked():
    service = TouchPayPartnerService()

    async def fake_creds(db, cc):
        return FULL_CREDS
    service._credentials = fake_creds  # type: ignore[assignment]

    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=httpx.ConnectError("boom"))):
        with pytest.raises(TouchPayPartnerError) as exc:
            await service.get_balance(None, "GA")
    assert "unreachable" in str(exc.value)


async def test_an_http_error_carries_touchpays_message():
    service = TouchPayPartnerService()

    async def fake_creds(db, cc):
        return FULL_CREDS
    service._credentials = fake_creds  # type: ignore[assignment]

    response = SimpleNamespace(
        status_code=400,
        json=lambda: {"detailMessage": "Vous n'etes pas autorise a effectuer cette operation."},
    )
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=response)):
        with pytest.raises(TouchPayPartnerError) as exc:
            await service.check_status(None, "GA", "PAY-1")
    assert "pas autorise" in str(exc.value)
    assert exc.value.status_code == 400
