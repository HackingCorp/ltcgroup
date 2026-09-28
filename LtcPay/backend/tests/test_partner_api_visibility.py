"""The country page must say when the partner API is not configured.

On 2026-09-28 the RDC page showed a green PASS and "All 5 required
credentials are configured" while partner_id, login_api and password_api
were empty on every one of the 18 countries — so check_status, get_balance,
cashin and the reconciliation sweep were all dead and nothing said so. The
credentials read did not return the triple either, so the dashboard form
could not have shown it even if it had the fields.

Collection does not need the triple, so a missing one is a warning, never
a failure.
"""
from types import SimpleNamespace

import pytest

# Aliased: pytest would otherwise collect the endpoint itself as a test.
from app.api.v1.admin_countries import (
    test_country_integration as run_country_integration,
)
from app.services.country_service import CountryService


def _check(result, name):
    return next(c for c in result.checks if c.name == name)


# --------------------------------------------------------------------------
# The integration test's 6th check
# --------------------------------------------------------------------------

async def _run(monkeypatch, *, partner_id="", login_api="", password_api="",
               balance=None):
    """Run the country test against a stubbed country and network.

    `balance` is what the partner API answers when the triple is complete:
    a dict for success, an exception for a refusal.
    """
    from app.api.v1 import admin_countries as mod
    import app.services.touchpay_partner_service as partner_mod

    async def fake_balance(db, cc):
        if isinstance(balance, Exception):
            raise balance
        return balance if balance is not None else {"amount": 1.0, "currency": "XAF", "raw": {}}

    monkeypatch.setattr(partner_mod.touchpay_partner_service, "get_balance", fake_balance)

    country = SimpleNamespace(
        code="CD", tp_agency_code="LTCCD0035", tp_login="l", tp_password="",
        tp_secret="", tp_merchant_id="m", tp_secure_code="",
        tp_merchant_website="", tp_sdk_url="https://sdk", tp_direct_api_url="https://api",
        tp_partner_id=partner_id, tp_login_api=login_api, tp_password_api=password_api,
        operators=[SimpleNamespace(is_active=True, service_code="CD_X",
                                   provider_code="TOUCHPAY", operator_code="ORANGE")],
    )

    class _Result:
        def scalar_one_or_none(self):
            return country

    class _DB:
        async def execute(self, *a, **k):
            return _Result()

    # Every network check short-circuits: only check 6 is under test.
    class _Resp:
        status_code = 200

    class _Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def put(self, *a, **k): return _Resp()
        async def get(self, *a, **k): return _Resp()
        async def head(self, *a, **k): return _Resp()

    monkeypatch.setattr(mod.httpx, "AsyncClient", lambda *a, **k: _Client())
    monkeypatch.setattr(mod, "decrypt_value", lambda v: v)
    for name in ("TOUCHPAY_PARTNER_ID", "TOUCHPAY_LOGIN_API", "TOUCHPAY_PASSWORD_API"):
        monkeypatch.setattr(mod.settings, name, "", raising=False)
    for name, value in (("TOUCHPAY_DIRECT_AGENCY_CODE", "A"), ("TOUCHPAY_DIRECT_LOGIN", "l"),
                        ("TOUCHPAY_DIRECT_PASSWORD", "p"), ("TOUCHPAY_MERCHANT_ID", "m"),
                        ("TOUCHPAY_SECURE_CODE", "s"), ("TOUCHPAY_SDK_URL", "https://sdk"),
                        ("TOUCHPAY_DIRECT_API_URL", "https://api")):
        monkeypatch.setattr(mod.settings, name, value, raising=False)

    return await run_country_integration(
        code="CD", admin=SimpleNamespace(email="a@b.c"), db=_DB(),
    )


async def test_a_missing_partner_triple_is_reported(monkeypatch):
    result = await _run(monkeypatch)
    check = _check(result, "partner_api_configured")
    assert check.status == "warn"
    for field in ("partner_id", "login_api", "password_api"):
        assert field in check.message


async def test_a_partial_triple_names_only_what_is_missing(monkeypatch):
    result = await _run(monkeypatch, partner_id="PG1", login_api="lg")
    check = _check(result, "partner_api_configured")
    assert check.status == "warn"
    assert "password_api" in check.message
    assert "partner_id" not in check.message


async def test_a_complete_triple_that_answers_passes(monkeypatch):
    result = await _run(monkeypatch, partner_id="PG1", login_api="lg", password_api="pw")
    assert _check(result, "partner_api_configured").status == "pass"


async def test_a_complete_triple_that_is_refused_warns(monkeypatch):
    """Three filled boxes are not a working integration.

    Benin, Congo, Gabon and Guinea all had their agency code sitting in
    partner_id and would have shown green here while the API answered 400
    or 401.
    """
    from app.services.touchpay_partner_service import TouchPayPartnerError
    result = await _run(
        monkeypatch, partner_id="LTCCG0024", login_api="lg", password_api="pw",
        balance=TouchPayPartnerError("The request is invalid. Please check the input data."),
    )
    check = _check(result, "partner_api_configured")
    assert check.status == "warn"
    assert "request is invalid" in check.message


async def test_an_unreachable_partner_api_warns_rather_than_crashing(monkeypatch):
    result = await _run(
        monkeypatch, partner_id="PG1", login_api="lg", password_api="pw",
        balance=RuntimeError("kaboom"),
    )
    assert _check(result, "partner_api_configured").status == "warn"


async def test_a_warning_never_reads_as_a_full_pass(monkeypatch):
    """The whole point: a green PASS is what hid this for three weeks."""
    result = await _run(monkeypatch)
    assert result.overall_status == "partial"


async def test_a_configured_country_still_passes_overall(monkeypatch):
    result = await _run(monkeypatch, partner_id="PG1", login_api="lg", password_api="pw")
    assert result.overall_status == "pass"


async def test_the_payin_check_is_unchanged(monkeypatch):
    """Collection does not depend on the triple — check 1 must stay green."""
    result = await _run(monkeypatch)
    assert _check(result, "credentials_complete").status == "pass"
