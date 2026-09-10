"""A provider that never answered must not hand the payin to the next one.

PAY-4DB3A75B530848C8 (2026-09-09, Sino Sourcing, 12 709 XAF): the TouchPay
request timed out on our side, TouchPay had in fact accepted it one second
earlier, the router failed over to AccountPE, AccountPE bounced it with
"Une operation similaire a ete envoyee il y a moins de 5 minutes", and the
payment was written FAILED. TouchPay's SUCCESSFUL callback landed 49
seconds later and was dropped as "already terminal". The money was
collected from the customer and the merchant was told it had failed.

Two independent defences are tested here:
  1. a timeout / transport error stops the failover (this file)
  2. a success callback overturns a non-COMPLETED status (test_callbacks_*)
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services import payment_router
from app.services.accountpe_service import AccountPEError
from app.services.touchpay_direct_service import TouchPayDirectError


def _provider(code):
    return SimpleNamespace(code=code)


def _two_candidates():
    return [(_provider("TOUCHPAY"), None), (_provider("ACCOUNTPE"), None)]


def _route(dispatch):
    """initiate_mobile_payment with the candidate list and _dispatch stubbed."""
    return patch.multiple(
        payment_router,
        _dispatch=dispatch,
        provider_service=SimpleNamespace(
            resolve_mobile_providers=AsyncMock(return_value=_two_candidates()),
            apply_merchant_prefs=lambda c, *a, **k: c,
        ),
    )


async def _initiate():
    return await payment_router.initiate_mobile_payment(
        db=None,
        payment=SimpleNamespace(payment_token="tok"),
        reference="PAY-4DB3A75B530848C8",
        amount=12709,
        phone_number="656248496",
        operator_code="ORANGE",
        country_code="CM",
    )


# --------------------------------------------------------------------------
# The failover guard
# --------------------------------------------------------------------------

async def test_a_timeout_does_not_fail_over():
    dispatch = AsyncMock(side_effect=TouchPayDirectError(
        "Request timed out: ", outcome_unknown=True,
    ))
    with _route(dispatch):
        with pytest.raises(TouchPayDirectError) as exc:
            await _initiate()
    assert dispatch.await_count == 1              # ACCOUNTPE never called
    assert "timed out" in str(exc.value)          # the real cause survives


async def test_a_transport_error_does_not_fail_over():
    dispatch = AsyncMock(side_effect=AccountPEError(
        "HTTP error: connection reset", outcome_unknown=True,
    ))
    with _route(dispatch):
        with pytest.raises(TouchPayDirectError):
            await _initiate()
    assert dispatch.await_count == 1


async def test_the_merchant_is_not_shown_a_duplicate_error():
    # The whole point: the message must not become "operation similaire",
    # which blamed the customer for our own second call.
    dispatch = AsyncMock(side_effect=TouchPayDirectError(
        "Request timed out: ", outcome_unknown=True,
    ))
    with _route(dispatch):
        with pytest.raises(TouchPayDirectError) as exc:
            await _initiate()
    assert "similaire" not in str(exc.value).lower()
    assert not (exc.value.raw_response or {}).get("failover_trail")


async def test_a_real_refusal_still_fails_over():
    # Guard against over-correcting: a provider-side refusal with no
    # operator reference is exactly what failover exists for.
    refusal = TouchPayDirectError("[500] Service temporarily unavailable")
    dispatch = AsyncMock(side_effect=[refusal, {"idFromGU": "999"}])
    with _route(dispatch):
        provider_code, response = await _initiate()
    assert dispatch.await_count == 2
    assert provider_code == "ACCOUNTPE"
    assert response["failover_trail"][0]["provider"] == "TOUCHPAY"


async def test_outcome_unknown_defaults_to_false():
    # Every error raised without the flag keeps the old behaviour.
    assert TouchPayDirectError("boom").outcome_unknown is False


async def test_the_service_marks_its_timeouts():
    """The flag has to be set where httpx raises, not only in tests."""
    from app.core.velocity import clear_payin_attempt
    from app.services.touchpay_direct_service import touchpay_direct_service

    # The duplicate window is held in Redis and outlives the test process:
    # without this, a second run is refused before reaching httpx at all.
    clear_payin_attempt("ORANGE", "656248496", 12709)

    country = SimpleNamespace(
        phone_prefix="237", phone_digits=9, enforce_phone_prefix_check=False,
        currency="XAF",
    )
    with patch("app.services.touchpay_direct_service.country_service") as cs:
        cs.get_active_country = AsyncMock(return_value=country)
        cs.normalize_phone = lambda p, *a: p
        cs.phone_length_error = lambda *a: None
        cs.get_decrypted_credentials = AsyncMock(return_value={
            "agency_code": "LTCGR11789", "login": "l", "password": "p",
            "direct_api_url": "https://apidist.gutouch.net/apidist/sec/touchpayapi",
        })
        cs.get_active_operators = AsyncMock(return_value=[SimpleNamespace(
            operator_code="ORANGE", service_code="CM_PAIEMENTMARCHAND_OM_TP",
            operator_name="Orange",
        )])
        with patch("httpx.AsyncClient.put",
                   new=AsyncMock(side_effect=httpx.ReadTimeout("timed out"))):
            with pytest.raises(TouchPayDirectError) as exc:
                await touchpay_direct_service.initiate_payment(
                    db=None,
                    payment_reference="PAY-4DB3A75B530848C8",
                    amount=12709,
                    phone_number="656248496",
                    operator_code="ORANGE",
                    country_code="CM",
                    callback_url="https://pay.ltcgroup.site/cb",
                )
    assert exc.value.outcome_unknown is True
