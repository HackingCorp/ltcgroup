"""Smobilpay (Maviance S3P): fifth mobile money provider.

Covers what the S3P docs specify, and what staging showed they get wrong:
  - quote then collect, wallet as serviceNumber (local digits), phone with
    the country code, an email always present, our reference as trid
  - the bearer is cached and re-minted once when rejected
  - a failed quote or an unreachable host leaves nothing live; a timeout or
    a 5xx on collect is an unknown outcome
  - staging keys never collect on the production platform
  - callbacks: HMAC-SHA1 of the raw body; the verdict is re-read from
    verifytx, never taken from the (possibly unsigned) body
  - catalogue sync: country from the merchant code, currency checked
"""
import hashlib
import hmac
import json
import uuid
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from sqlalchemy import select

from app.core.security import generate_api_secret, hash_api_secret
from app.models.country import CountryOperator
from app.models.merchant import Merchant, generate_api_key_live, generate_api_key_test
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.models.provider import ProviderConfig, ProviderGroup
from app.services import smobilpay_service as sm
from app.services.smobilpay_service import (
    SmobilpayError, smobilpay_service, verify_webhook_signature,
)

BASE = "https://s3p.test"
MTN_ITEM = "S-112-949-MTNMOMO-20053-200050001-1"
HOOK_SECRET = "hook-secret"


@pytest.fixture(autouse=True)
def _clear_caches():
    sm._tokens.clear()
    sm._last_verify.clear()
    yield
    sm._tokens.clear()
    sm._last_verify.clear()


@pytest.fixture
async def provider(db_session):
    p = ProviderConfig(
        code="SMOBILPAY", name="Smobilpay", provider_group=ProviderGroup.MOBILE,
        is_active=True,
        config={"public_key": "pub", "secret_key": "sec", "base_url": BASE},
    )
    db_session.add(p)
    db_session.add(CountryOperator(
        country_code="CM", operator_code="MTN", operator_name="MTN MoMo",
        service_code=MTN_ITEM, provider_code="SMOBILPAY",
        phone_prefixes=["67", "650", "651", "652", "653", "654"], is_active=True,
    ))
    await db_session.commit()
    await db_session.refresh(p)
    return p


def _resp(status_code, body):
    return SimpleNamespace(status_code=status_code, json=lambda: body, text=json.dumps(body))


def _token_resp():
    return _resp(200, {"access_token": "jwt-1", "token_type": "Bearer", "expires_in": 3600})


def _phone():
    return "67" + str(uuid.uuid4().int)[:7]


QUOTE = {"quoteId": "q-1", "payItemId": MTN_ITEM, "amountLocalCur": "5000.00",
         "priceLocalCur": "5000.00", "localCur": "XAF"}
COLLECT = {"ptn": "99999179355636700015964613938387", "status": "PENDING",
           "trid": "PAY-SMB1", "priceLocalCur": "5000.00"}


async def _initiate(db_session, provider, phone=None, email="client@example.com"):
    return await smobilpay_service.initiate_payment(
        db=db_session, provider=provider, payment_reference="PAY-SMB1",
        amount=5000, phone_number=phone or _phone(), operator_code="MTN",
        country_code="CM", callback_url="https://ltcpay.test/api/v1/callbacks/smobilpay",
        customer_email=email,
    )


# --------------------------------------------------------------------------
# Initiation
# --------------------------------------------------------------------------

async def test_quote_then_collect_with_what_staging_requires(db_session, provider):
    phone = _phone()
    post = AsyncMock(return_value=_token_resp())
    request = AsyncMock(side_effect=[_resp(200, QUOTE), _resp(200, COLLECT)])
    with patch("httpx.AsyncClient.post", new=post), patch("httpx.AsyncClient.request", new=request):
        result = await _initiate(db_session, provider, phone=phone, email=None)

    assert post.await_args.args[0] == f"{BASE}/oauth/token"
    assert post.await_args.kwargs["auth"] == ("pub", "sec")
    quote_call, collect_call = request.await_args_list
    assert quote_call.args == ("POST", f"{BASE}/v2/quotestd")
    assert quote_call.kwargs["json"] == {"payItemId": MTN_ITEM, "amount": 5000}
    assert quote_call.kwargs["headers"]["Authorization"] == "Bearer jwt-1"
    assert quote_call.kwargs["headers"]["x-api-version"] == "3.0.0"
    assert collect_call.args == ("POST", f"{BASE}/v2/collectstd")
    assert collect_call.kwargs["json"] == {
        "quoteId": "q-1",
        "customerPhonenumber": f"237{phone}",
        "customerEmailaddress": sm.FALLBACK_EMAIL,  # required: 4105 without it
        "serviceNumber": phone,                     # required: 40302 without it
        "trid": "PAY-SMB1",
        "callbackUrl": "https://ltcpay.test/api/v1/callbacks/smobilpay",
    }
    assert result["transactionId"] == COLLECT["ptn"]
    assert result["status"] == "pending"


async def test_a_success_at_collect_is_not_settled_yet(db_session, provider):
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_token_resp())), \
         patch("httpx.AsyncClient.request", new=AsyncMock(side_effect=[
             _resp(200, QUOTE), _resp(200, {**COLLECT, "status": "SUCCESS"}),
         ])):
        result = await _initiate(db_session, provider)
    assert result["status"] == "pending"


async def test_the_bearer_is_reused(db_session, provider):
    post = AsyncMock(return_value=_token_resp())
    with patch("httpx.AsyncClient.post", new=post), patch("httpx.AsyncClient.request", new=AsyncMock(
        side_effect=[_resp(200, QUOTE), _resp(200, COLLECT)] * 2,
    )):
        await _initiate(db_session, provider)
        await _initiate(db_session, provider)
    assert post.await_count == 1


async def test_a_rejected_bearer_is_reminted_once(db_session, provider):
    post = AsyncMock(return_value=_token_resp())
    request = AsyncMock(side_effect=[
        _resp(401, {"respCode": 4009, "devMsg": "Access token invalid"}),
        _resp(200, QUOTE), _resp(200, COLLECT),
    ])
    with patch("httpx.AsyncClient.post", new=post), patch("httpx.AsyncClient.request", new=request):
        await _initiate(db_session, provider)
    assert post.await_count == 2


async def test_a_refused_quote_leaves_nothing_live(db_session, provider):
    request = AsyncMock(return_value=_resp(400, {
        "devMsg": "The amount provided is not valid for this entity",
        "usrMsg": "Quote amount invalid", "respCode": 4208,
    }))
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_token_resp())), \
         patch("httpx.AsyncClient.request", new=request):
        with pytest.raises(SmobilpayError) as exc:
            await _initiate(db_session, provider)
    assert not exc.value.outcome_unknown
    assert request.await_count == 1  # never reached collectstd
    assert "Quote amount invalid" in str(exc.value) and "4208" in str(exc.value)


async def test_a_collect_timeout_is_an_unknown_outcome(db_session, provider):
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_token_resp())), \
         patch("httpx.AsyncClient.request", new=AsyncMock(
             side_effect=[_resp(200, QUOTE), httpx.ReadTimeout("slow")],
         )):
        with pytest.raises(SmobilpayError) as exc:
            await _initiate(db_session, provider)
    assert exc.value.outcome_unknown


async def test_a_collect_5xx_is_an_unknown_outcome(db_session, provider):
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_token_resp())), \
         patch("httpx.AsyncClient.request", new=AsyncMock(
             side_effect=[_resp(200, QUOTE), _resp(502, {"respCode": 5000})],
         )):
        with pytest.raises(SmobilpayError) as exc:
            await _initiate(db_session, provider)
    assert exc.value.outcome_unknown


async def test_an_unreachable_host_may_fail_over(db_session, provider):
    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=httpx.ConnectError("refused"))):
        with pytest.raises(SmobilpayError) as exc:
            await _initiate(db_session, provider)
    assert not exc.value.outcome_unknown


async def test_a_collect_refusal_reads_the_real_error_shape(db_session, provider):
    # Seen on staging: respCode as a string, no usrMsg, customerMsg list.
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_token_resp())), \
         patch("httpx.AsyncClient.request", new=AsyncMock(side_effect=[
             _resp(200, QUOTE),
             _resp(400, {"cId": "x", "respCode": "40302", "devMsg": "Service number rejected",
                         "customerMsg": [{"langCode": "En", "message": "Account not found"}]}),
         ])):
        with pytest.raises(SmobilpayError) as exc:
            await _initiate(db_session, provider)
    assert not exc.value.outcome_unknown
    assert "Account not found" in str(exc.value) and "40302" in str(exc.value)


async def test_staging_keys_never_collect_in_production(db_session, provider, monkeypatch):
    from app.core.config import settings

    provider.config = {**provider.config, "base_url": sm.STAGING_BASE_URL}
    await db_session.commit()
    monkeypatch.setattr(settings, "environment", "production")
    request = AsyncMock()
    with patch("httpx.AsyncClient.request", new=request):
        with pytest.raises(SmobilpayError) as exc:
            await _initiate(db_session, provider)
    assert "test" in str(exc.value)
    request.assert_not_awaited()


# --------------------------------------------------------------------------
# Status checks
# --------------------------------------------------------------------------

async def test_verifytx_is_throttled_per_transaction(provider):
    request = AsyncMock(return_value=_resp(200, [{"trid": "PAY-X", "status": "PENDING"}]))
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_token_resp())), \
         patch("httpx.AsyncClient.request", new=request):
        assert await smobilpay_service.verify_transaction(provider, trid="PAY-X")
        assert await smobilpay_service.verify_transaction(provider, trid="PAY-X") is None
    assert request.await_count == 1


async def test_verifytx_prefers_a_success_among_duplicate_trids(provider):
    items = [
        {"trid": "PAY-X", "status": "ERRORED", "timestamp": "2026-11-01T19:07:00+01:00"},
        {"trid": "PAY-X", "status": "SUCCESS", "timestamp": "2026-11-01T19:06:00+01:00"},
    ]
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_token_resp())), \
         patch("httpx.AsyncClient.request", new=AsyncMock(return_value=_resp(200, items))):
        result = await smobilpay_service.verify_transaction(provider, trid="PAY-X")
    assert result["status"] == "SUCCESS"


# --------------------------------------------------------------------------
# Webhooks
# --------------------------------------------------------------------------

def test_signature_matches_the_documented_example():
    body = b'{"timestamp":"2018-05-31 16:21:40","trid":"13550","errorCode":"0","status":"SUCCESS"}'
    assert verify_webhook_signature(body, "4ba0a40bff4fc5370f45e29f42a7a07bffacee26", "secret")
    assert not verify_webhook_signature(body, "", "secret")
    assert not verify_webhook_signature(body, "4ba0a40bff4fc5370f45e29f42a7a07bffacee26", "other")


@pytest.fixture
async def payment(db_session, provider):
    merchant = Merchant(
        name="m", email=f"{uuid.uuid4().hex[:8]}@example.com",
        api_key_live=generate_api_key_live(), api_key_test=generate_api_key_test(),
        api_secret_hash=hash_api_secret(generate_api_secret()),
        is_active=True, is_verified=True,
    )
    db_session.add(merchant)
    await db_session.commit()
    await db_session.refresh(merchant)
    p = Payment(
        merchant_id=merchant.id,
        reference=f"PAY-{uuid.uuid4().hex[:16].upper()}",
        payment_token=uuid.uuid4().hex,
        amount=Decimal("5000.00"), currency="XAF",
        status=PaymentStatus.PROCESSING, provider=PaymentProvider.SMOBILPAY,
        provider_transaction_id="99999000000000000000000000000001",
    )
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


def _status(payment, status, price="5000.00", error_code=None):
    return {"ptn": payment.provider_transaction_id, "trid": payment.reference,
            "status": status, "errorCode": error_code, "priceLocalCur": price,
            "localCur": "XAF"}


async def _deliver(client, payment, body_status, verified, secret=None, signature=None):
    body = json.dumps({"timestamp": "2026-11-01 18:06:12", "trid": payment.reference,
                       "errorCode": "0", "status": body_status}).encode()
    headers = {"Content-Type": "application/json; charset=UTF-8",
               "X-Ptn": payment.provider_transaction_id, "X-Delivery": str(uuid.uuid4())}
    if signature is not None:
        headers["X-Signature"] = signature
    elif secret:
        headers["X-Signature"] = hmac.new(secret.encode(), body, hashlib.sha1).hexdigest()
    verify = AsyncMock(return_value=verified)
    with patch("app.services.notification.notify_merchant", new=AsyncMock()), \
         patch.object(smobilpay_service, "verify_transaction", new=verify):
        response = await client.post("/api/v1/callbacks/smobilpay", content=body, headers=headers)
    return response, verify


async def _row(db_session, payment_id):
    db_session.expire_all()
    return (await db_session.execute(select(Payment).where(Payment.id == payment_id))).scalar_one()


async def _with_secret(db_session, provider):
    provider.config = {**provider.config, "webhook_secret": HOOK_SECRET}
    await db_session.commit()


async def test_a_signed_success_completes_after_verification(client, db_session, provider, payment):
    await _with_secret(db_session, provider)
    response, verify = await _deliver(
        client, payment, "SUCCESS", _status(payment, "SUCCESS"), secret=HOOK_SECRET,
    )
    assert response.status_code == 200, response.text
    verify.assert_awaited_once()
    row = await _row(db_session, payment.id)
    assert row.status == PaymentStatus.COMPLETED and row.completed_at is not None


async def test_a_bad_signature_is_refused_when_we_hold_a_secret(client, db_session, provider, payment):
    await _with_secret(db_session, provider)
    response, verify = await _deliver(
        client, payment, "SUCCESS", _status(payment, "SUCCESS"), signature="deadbeef",
    )
    assert response.status_code == 401
    verify.assert_not_awaited()
    assert (await _row(db_session, payment.id)).status == PaymentStatus.PROCESSING


async def test_the_body_never_decides_the_verdict(client, db_session, payment):
    # Unsigned (no secret configured): a body claiming SUCCESS is checked
    # against verifytx, which says the customer declined.
    response, _ = await _deliver(
        client, payment, "SUCCESS", _status(payment, "ERRORED", error_code=703202),
    )
    assert response.status_code == 200
    row = await _row(db_session, payment.id)
    assert row.status == PaymentStatus.FAILED
    assert "declined" in row.touchpay_data["message"]


async def test_an_unreadable_status_is_redelivered(client, db_session, payment):
    response, _ = await _deliver(client, payment, "SUCCESS", None)
    assert response.status_code == 503
    assert (await _row(db_session, payment.id)).status == PaymentStatus.PROCESSING


async def test_an_unknown_payment_is_acknowledged(client, db_session, provider):
    body = json.dumps({"timestamp": "x", "trid": "PAY-NOPE", "errorCode": "0", "status": "SUCCESS"}).encode()
    response = await client.post(
        "/api/v1/callbacks/smobilpay", content=body,
        headers={"Content-Type": "application/json", "X-Ptn": "nope"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ignored"


async def test_a_short_price_credits_no_one(client, db_session, payment):
    await _deliver(client, payment, "SUCCESS", _status(payment, "SUCCESS", price="50.00"))
    assert (await _row(db_session, payment.id)).status == PaymentStatus.PROCESSING


async def test_a_late_success_overturns_our_expiry(client, db_session, payment):
    payment.status = PaymentStatus.EXPIRED
    await db_session.commit()
    await _deliver(client, payment, "SUCCESS", _status(payment, "SUCCESS"))
    assert (await _row(db_session, payment.id)).status == PaymentStatus.COMPLETED


async def test_a_late_failure_leaves_an_expired_payment_alone(client, db_session, payment):
    payment.status = PaymentStatus.EXPIRED
    await db_session.commit()
    await _deliver(client, payment, "ERRORED", _status(payment, "ERRORED", error_code=703201))
    assert (await _row(db_session, payment.id)).status == PaymentStatus.EXPIRED


async def test_a_reversal_cannot_undo_a_completion(client, db_session, payment):
    await _deliver(client, payment, "SUCCESS", _status(payment, "SUCCESS"))
    sm._last_verify.clear()
    await _deliver(client, payment, "REVERSED", _status(payment, "REVERSED"))
    assert (await _row(db_session, payment.id)).status == PaymentStatus.COMPLETED


# --------------------------------------------------------------------------
# Catalogue sync
# --------------------------------------------------------------------------

@pytest.fixture
def as_admin():
    from app.api.v1.auth import get_current_admin
    from app.main import app

    app.dependency_overrides[get_current_admin] = lambda: SimpleNamespace(
        email="admin@ltcgroup.site", id=uuid.uuid4(),
    )
    yield
    app.dependency_overrides.pop(get_current_admin, None)


def _svc(sid, merchant, title, country="CMR", status="Active"):
    return {"serviceid": sid, "merchant": merchant, "title": title, "country": country,
            "localCur": "XAF", "type": "CASHOUT", "status": status}


def _item(sid, merchant, pay_item_id, cur="XAF"):
    return {"serviceid": str(sid), "merchant": merchant, "payItemId": pay_item_id,
            "amountType": "CUSTOM", "localCur": cur}


async def test_sync_builds_rows_from_the_collection_catalogue(client, db_session, as_admin):
    db_session.add(ProviderConfig(
        code="SMOBILPAY", name="Smobilpay", provider_group=ProviderGroup.MOBILE,
        is_active=False, config={"public_key": "pub", "secret_key": "sec"},
    ))
    await db_session.commit()
    catalogue = {
        "services": [
            _svc(20053, "MTNMOMO", "MTN MoMo Cash Out"),
            _svc(30053, "CMORANGEOM", "Orange Money Cash - Out"),
            _svc(50053, "CMORANGEMOMO", "Orange Money Cash Out"),
            _svc(202413, "GABAIRTELMONEY", "Airtel Money Cashout Gabon", country="GAB"),
            _svc(90010, "EUCASHOUT", "Express Union Cash Out"),
            _svc(202415, "MTNCI", "Mtn Momo Ivory Coast Cashout"),
        ],
        "cashout": [
            _item(20053, "MTNMOMO", MTN_ITEM),
            _item(30053, "CMORANGEOM", "S-112-949-CMORANGEOM-30053-2006125105-1"),
            _item(50053, "CMORANGEMOMO", "S-112-949-CMORANGEMOMO-50053-900221-1"),
            _item(202413, "GABAIRTELMONEY", "S-112-949-GABAIRTELMONEY-202413-900571-1"),
            _item(90010, "EUCASHOUT", "S-112-949-EUCASHOUT-90010-900080-1"),
            _item(202415, "MTNCI", "S-112-949-MTNCI-202415-900781-1"),
        ],
        "account": {"agentName": "Ltc Group Sarl", "balance": "1000", "currency": "XAF"},
    }
    with patch.object(smobilpay_service, "get_catalogue", new=AsyncMock(return_value=catalogue)):
        response = await client.post("/api/v1/admin/providers/smobilpay/sync-operators")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["account"]["agent"] == "Ltc Group Sarl"
    assert body["staging"] is True
    assert any(u.startswith("EUCASHOUT") for u in body["unmapped"])
    # GA and CI are not configured in the test database.
    assert set(body["countries_not_configured"]) == {"GA", "CI"}

    rows = {
        r.operator_code: r for r in (await db_session.execute(
            select(CountryOperator).where(CountryOperator.provider_code == "SMOBILPAY")
        )).scalars().all()
    }
    assert rows["MTN"].service_code == MTN_ITEM and rows["MTN"].is_active
    # Orange Cameroon: three services, the Orange Money merchant wins.
    assert rows["ORANGE"].service_code == "S-112-949-CMORANGEMOMO-50053-900221-1"
    # Display settings come from the TouchPay row of the same operator.
    assert rows["ORANGE"].operator_name == "Orange Money"
    assert rows["ORANGE"].phone_prefixes == ["69", "655", "656", "657", "658", "659"]
