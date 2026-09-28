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

# login_api / password_api are the Basic-auth key pair; login / password
# are the agent pair the request body carries. Both are required.
FULL_CREDS = {
    "agency_code": "LTCGA0169",
    "partner_id": "PG12345678",
    "login_api": "3CED9BA7-key-user",
    "password_api": "F41A61A1-key-pass",
    "login": "913719226",
    "password": "agent-password",
    "partner_api_url": "https://apidist.gutouch.net/apidist/sec",
}


def _service(creds=None, response=None, capture=None):
    """A service whose credentials and HTTP round-trip are both stubbed."""
    service = TouchPayPartnerService()

    async def fake_creds(db, country_code):
        resolved = FULL_CREDS if creds is None else creds
        missing = [k for k in ("agency_code", "partner_id", "login_api",
                              "password_api", "login", "password")
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
            capture.append((path, {**payload,
                                   "partner_id": creds_["partner_id"],
                                   "login_api": creds_["login"],
                                   "password_api": creds_["password"]}))
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
    # The body carries the agent pair, never the Basic-auth key pair.
    assert body["login_api"] == FULL_CREDS["login"]
    assert body["password_api"] == FULL_CREDS["password"]


# --------------------------------------------------------------------------
# Credentials
# --------------------------------------------------------------------------

@pytest.mark.parametrize(
    "missing", ["partner_id", "login_api", "password_api", "login", "password"])
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
             "login": "913719226", "password": "agent-password",
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


# --------------------------------------------------------------------------
# Per-country credentials
# --------------------------------------------------------------------------
# Each agency has its own partner_id / login_api / password_api, so the env
# settings are only a fallback and the per-country values must win.

async def test_country_values_take_priority_over_the_env_fallback():
    from app.core.config import settings
    from app.services.country_service import CountryService

    country = SimpleNamespace(
        tp_agency_code="LTCGA0169", tp_login="", tp_password="", tp_secret="",
        tp_merchant_id="", tp_secure_code="", tp_merchant_website="",
        tp_sdk_url="", tp_direct_api_url="",
        tp_partner_id="PG-GABON", tp_login_api="login-gabon", tp_password_api="",
    )

    async def fake_get(db, code):
        return country

    service = CountryService()
    service.get_active_country = fake_get  # type: ignore[assignment]

    with patch.object(settings, "TOUCHPAY_PARTNER_ID", "PG-GLOBAL"), \
         patch.object(settings, "TOUCHPAY_LOGIN_API", "login-global"), \
         patch.object(settings, "TOUCHPAY_PASSWORD_API", "pw-global"):
        creds = await service.get_decrypted_credentials(None, "GA")

    assert creds["partner_id"] == "PG-GABON"     # the country's own value wins
    assert creds["login_api"] == "login-gabon"   # idem
    assert creds["password_api"] == "pw-global"  # empty on the country -> env fallback


# --------------------------------------------------------------------------
# Transport: HTTP Basic auth and the partner API's own error wording
# --------------------------------------------------------------------------
# First live call, 2026-09-28: sending the triple in the JSON body alone
# answered 401 "The request requires user authentication". The Insomnia
# collection authenticates with HTTP Basic, login_api as the username and
# password_api as the password — the body carries them as well.


async def test_the_triple_is_sent_as_http_basic_auth():
    service = TouchPayPartnerService()

    async def fake_creds(db, cc):
        return FULL_CREDS
    service._credentials = fake_creds  # type: ignore[assignment]

    captured = {}

    async def fake_post(self, url, *, json=None, auth=None, **kw):
        captured["auth"] = auth
        captured["body"] = json
        return SimpleNamespace(status_code=200, json=lambda: {"balance": 1})

    with patch("httpx.AsyncClient.post", new=fake_post):
        await service.get_balance(None, "GA")

    assert isinstance(captured["auth"], httpx.BasicAuth)
    # Compare the header it would actually send against a reference pair,
    # rather than reaching into httpx internals by name.
    expected = httpx.BasicAuth(FULL_CREDS["login_api"], FULL_CREDS["password_api"])
    request = httpx.Request("POST", "https://x/")
    sent = next(captured["auth"].auth_flow(request)).headers["authorization"]
    want = next(expected.auth_flow(httpx.Request("POST", "https://x/"))).headers["authorization"]
    assert sent == want
    # and the body still carries them, as the collection does
    # ... while the body carries the AGENT pair. Sending the key pair here
    # answers 400 "The provided context does not match the agent's sale point".
    assert captured["body"]["login_api"] == FULL_CREDS["login"]
    assert captured["body"]["password_api"] == FULL_CREDS["password"]


@pytest.mark.parametrize("body,expected", [
    ({"errorMessage": "The provided context does not match the agent's sale point."},
     "sale point"),
    ({"description": " No agent found with the provided credentials"},
     "No agent found"),
    ({"detailMessage": "Vous n'etes pas autorise"}, "pas autorise"),
    ({"message": "boom"}, "boom"),
])
async def test_a_refusal_carries_touchpays_own_wording(body, expected):
    """The partner API uses errorMessage/description, not detailMessage."""
    service = TouchPayPartnerService()

    async def fake_creds(db, cc):
        return FULL_CREDS
    service._credentials = fake_creds  # type: ignore[assignment]

    response = SimpleNamespace(status_code=400, json=lambda: body)
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=response)):
        with pytest.raises(TouchPayPartnerError) as exc:
            await service.get_balance(None, "GA")
    assert expected in str(exc.value)
    assert exc.value.status_code == 400


async def test_an_unworded_refusal_still_names_the_status():
    service = TouchPayPartnerService()

    async def fake_creds(db, cc):
        return FULL_CREDS
    service._credentials = fake_creds  # type: ignore[assignment]

    response = SimpleNamespace(status_code=503, json=lambda: {})
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=response)):
        with pytest.raises(TouchPayPartnerError) as exc:
            await service.get_balance(None, "GA")
    assert "503" in str(exc.value)


async def test_notfound_is_not_a_verdict():
    """TouchPay answers NOTFOUND for a basket the customer never submitted.

    Treating it as failed would settle payments the operator has simply
    never heard of, so it counts as pending and the caller leaves the row
    alone.
    """
    verdict = await _service(response={
        "status": "NOTFOUND",
        "description": "No operation/transaction found for this PartnerNum and PartnerId",
    }).check_status(None, "GA", "PAY-1")
    assert verdict["is_pending"]
    assert not verdict["is_paid"] and not verdict["is_failed"]


async def test_the_live_success_shape_is_read():
    """The exact body get_balance/check_status returned on 2026-09-28."""
    verdict = await _service(response={
        "service_id": "CM_PAIEMENTMARCHAND_OM_TP",
        "gu_transaction_id": "1789403681377",
        "status": "SUCCESSFUL",
        "transaction_date": "2026/09/14 16:35:20",
        "recipient_id": "694587659",
        "amount": 29376.0,
    }).check_status(None, "CM", "PAY-8DAC17EF19894B0B")
    assert verdict["is_paid"]
    assert verdict["raw"]["gu_transaction_id"] == "1789403681377"


async def test_the_live_balance_shape_is_read():
    out = await _service(response={
        "amount": 290390.1899999993, "errorCode": "200", "errorMessage": "SUCCESSFUL",
    }).get_balance(None, "CM")
    assert out["amount"] == pytest.approx(290390.19, rel=1e-9)


# --------------------------------------------------------------------------
# The all-countries balance view
# --------------------------------------------------------------------------
# One agency running dry produces exactly the kind of unexplained mass
# failure that took three days to read on Gabon, and nothing showed the
# float at all until 2026-09-28.

async def _balances(monkeypatch, results):
    """Run the endpoint over a stubbed country list and get_balance."""
    from app.api.v1 import admin_providers as mod

    countries = [
        SimpleNamespace(code=cc, name=cc, currency="XAF", tp_agency_code=f"AG{cc}",
                        is_active=True)
        for cc in results
    ]

    class _Scalars:
        def all(self): return countries

    class _Result:
        def scalars(self): return _Scalars()

    class _DB:
        async def execute(self, *a, **k): return _Result()

    async def fake_balance(db, cc):
        outcome = results[cc]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    import app.services.touchpay_partner_service as svc_mod
    monkeypatch.setattr(svc_mod.touchpay_partner_service, "get_balance", fake_balance)

    return await mod.touchpay_balances(admin=SimpleNamespace(email="a@b.c"), db=_DB())


async def test_every_active_country_is_listed(monkeypatch):
    out = await _balances(monkeypatch, {
        "CM": {"amount": 290390.19, "currency": None, "raw": {}},
        "CG": TouchPayPartnerError("TouchPay partner API not configured for CG: missing partner_id"),
    })
    assert [b["country_code"] for b in out["balances"]] == ["CM", "CG"]


async def test_a_readable_balance_is_returned(monkeypatch):
    out = await _balances(monkeypatch, {"CM": {"amount": 290390.19, "currency": None, "raw": {}}})
    entry = out["balances"][0]
    assert entry["amount"] == 290390.19
    assert entry["currency"] == "XAF"      # get_balance sends no currency
    assert entry["error"] is None and entry["configured"]


async def test_an_unconfigured_country_says_so_rather_than_zero(monkeypatch):
    out = await _balances(monkeypatch, {
        "CG": TouchPayPartnerError("TouchPay partner API not configured for CG: missing partner_id"),
    })
    entry = out["balances"][0]
    assert entry["amount"] is None        # never 0 — that reads as "empty agency"
    assert entry["configured"] is False


async def test_a_configured_country_that_errors_is_flagged_as_configured(monkeypatch):
    out = await _balances(monkeypatch, {"CM": TouchPayPartnerError("get_balance unreachable: boom")})
    entry = out["balances"][0]
    assert entry["amount"] is None
    assert entry["configured"] is True    # reachable problem, not a setup gap
    assert "unreachable" in entry["error"]


async def test_one_broken_country_does_not_sink_the_others(monkeypatch):
    out = await _balances(monkeypatch, {
        "CM": {"amount": 1000.0, "currency": None, "raw": {}},
        "CG": RuntimeError("kaboom"),
        "GA": {"amount": 2000.0, "currency": None, "raw": {}},
    })
    amounts = {b["country_code"]: b["amount"] for b in out["balances"]}
    assert amounts["CM"] == 1000.0 and amounts["GA"] == 2000.0
    assert amounts["CG"] is None
