"""SebPay: third mobile money provider.

Covers what the SebPay docs specify and what they leave out:
  - initiation payload (international phone without '+', country currency,
    SebPay's own operator code from service_code)
  - a timeout or 5xx is an unknown outcome (no idempotence promised on
    collections), a 4xx is a refusal, an unreachable host is neither
  - OTP operators: the payer's code is sent, and its absence refused before
    any call; Wave's provider_link comes back as redirect_url
  - webhooks: HMAC-SHA256 of the raw body, hex, secret key; idempotent;
    an approval for an amount we did not ask for credits no one
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
from app.services.sebpay_service import (
    SebPayError, sebpay_service, to_operator_code, verify_webhook_signature,
)

SECRET = "sk_test_abc123"


@pytest.fixture
async def provider(db_session):
    p = ProviderConfig(
        code="SEBPAY", name="SebPay", provider_group=ProviderGroup.MOBILE,
        is_active=True,
        config={"public_key": "pk_test_xyz", "secret_key": SECRET,
                "base_url": "https://sebpay.test/api/v1"},
    )
    db_session.add(p)
    db_session.add_all([
        CountryOperator(
            country_code="CM", operator_code="MTN", operator_name="MTN MoMo",
            service_code="MTN", provider_code="SEBPAY",
            phone_prefixes=["67", "650", "651", "652", "653", "654"], is_active=True,
        ),
        CountryOperator(
            country_code="CM", operator_code="WAVE", operator_name="Wave",
            service_code="wave", provider_code="SEBPAY", is_active=True,
        ),
        CountryOperator(
            country_code="CM", operator_code="ORANGE", operator_name="Orange Money",
            service_code="orange", provider_code="SEBPAY", is_active=True,
            otp_required=True, ussd_code="*144*4*6*montant#",
        ),
    ])
    await db_session.commit()
    await db_session.refresh(p)
    return p


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
        status=PaymentStatus.PROCESSING, provider=PaymentProvider.SEBPAY,
    )
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


def _phone():
    return "67" + str(uuid.uuid4().int)[:7]


def _response(status_code, body):
    return SimpleNamespace(
        status_code=status_code, json=lambda: body, text=json.dumps(body),
    )


async def _initiate(db_session, provider, operator="MTN", phone=None, otp_code=None):
    return await sebpay_service.initiate_payment(
        db=db_session, provider=provider, payment_reference="PAY-SEB1",
        amount=5000, phone_number=phone or _phone(), operator_code=operator,
        country_code="CM", callback_url="https://ltcpay.test/api/v1/callbacks/sebpay",
        otp_code=otp_code,
    )


def _orange_phone():
    return "69" + str(uuid.uuid4().int)[:7]


# --------------------------------------------------------------------------
# Initiation
# --------------------------------------------------------------------------

async def test_initiation_sends_what_sebpay_documents(db_session, provider):
    phone = _phone()
    post = AsyncMock(return_value=_response(201, {
        "success": True, "message": "Transaction initiated",
        "data": {"transaction_id": "20261008120000123456", "status": "pending",
                 "external_reference": "PAY-SEB1", "amount": 5000, "currency": "XAF"},
    }))
    with patch("httpx.AsyncClient.post", new=post):
        result = await _initiate(db_session, provider, phone=phone)

    url = post.await_args.args[0]
    kwargs = post.await_args.kwargs
    assert url == "https://sebpay.test/api/v1/collections"
    assert kwargs["headers"]["X-Public-Key"] == "pk_test_xyz"
    assert kwargs["headers"]["X-Secret-Key"] == SECRET
    assert kwargs["json"] == {
        "amount": 5000, "currency": "XAF", "phone": f"237{phone}",
        "operator": "MTN", "country": "CM", "external_reference": "PAY-SEB1",
        "callback_url": "https://ltcpay.test/api/v1/callbacks/sebpay",
    }
    assert result["transactionId"] == "20261008120000123456"
    assert result["status"] == "pending"


async def test_a_timeout_is_an_unknown_outcome(db_session, provider):
    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=httpx.ReadTimeout("slow"))):
        with pytest.raises(SebPayError) as exc:
            await _initiate(db_session, provider)
    assert exc.value.outcome_unknown


async def test_a_5xx_is_an_unknown_outcome(db_session, provider):
    with patch("httpx.AsyncClient.post", new=AsyncMock(
        return_value=_response(500, {"success": False, "message": "Internal Server Error"}),
    )):
        with pytest.raises(SebPayError) as exc:
            await _initiate(db_session, provider)
    assert exc.value.outcome_unknown


async def test_an_unreachable_host_may_fail_over(db_session, provider):
    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=httpx.ConnectError("refused"))):
        with pytest.raises(SebPayError) as exc:
            await _initiate(db_session, provider)
    assert not exc.value.outcome_unknown


async def test_a_validation_error_is_a_refusal_with_its_details(db_session, provider):
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_response(422, {
        "success": False, "message": "The given data was invalid.",
        "errors": {"phone": ["The phone format is invalid."]},
    }))):
        with pytest.raises(SebPayError) as exc:
            await _initiate(db_session, provider)
    assert not exc.value.outcome_unknown
    assert exc.value.status_code == 422
    assert "phone format is invalid" in str(exc.value)


async def test_an_immediate_rejection_is_a_refusal(db_session, provider):
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_response(200, {
        "success": True, "data": {"transaction_id": "1", "status": "rejected"},
        "message": "Transaction rejected",
    }))):
        with pytest.raises(SebPayError) as exc:
            await _initiate(db_session, provider)
    assert not exc.value.outcome_unknown


async def test_wave_returns_the_link_to_open(db_session, provider):
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_response(201, {
        "success": True,
        "data": {"transaction_id": "77", "status": "pending",
                 "provider_link": "https://pay.wave.com/c/abc"},
    }))):
        # 68x is in no operator's range, so no mismatch guard fires.
        result = await _initiate(db_session, provider, operator="WAVE",
                                 phone="68" + str(uuid.uuid4().int)[:7])
    assert result["redirect_url"] == "https://pay.wave.com/c/abc"


async def test_an_otp_operator_without_code_is_refused_before_calling_sebpay(db_session, provider):
    from app.services.sebpay_service import SebPayOtpRequiredError
    post = AsyncMock()
    with patch("httpx.AsyncClient.post", new=post):
        with pytest.raises(SebPayOtpRequiredError) as exc:
            await _initiate(db_session, provider, operator="ORANGE", phone=_orange_phone())
    post.assert_not_awaited()
    assert not exc.value.outcome_unknown
    # Orange BF's USSD embeds the amount.
    assert exc.value.ussd_code == "*144*4*6*5000#"


async def test_the_otp_is_sent_to_sebpay(db_session, provider):
    post = AsyncMock(return_value=_response(201, {
        "success": True, "data": {"transaction_id": "9", "status": "pending"},
    }))
    with patch("httpx.AsyncClient.post", new=post):
        await _initiate(db_session, provider, operator="ORANGE",
                        phone=_orange_phone(), otp_code=" 123 456 ")
    payload = post.await_args.kwargs["json"]
    assert payload["otp_code"] == "123456"
    assert payload["operator"] == "orange"


async def test_otp_is_required_only_when_every_provider_needs_it(db_session, provider):
    from app.models.provider import CountryProvider
    from app.services.payment_router import otp_requirement

    db_session.add(CountryProvider(
        country_code="CM", provider_code="SEBPAY", priority=2, is_active=True,
    ))
    await db_session.commit()
    # TouchPay also takes Orange CM, with no code: the payer can go there.
    assert await otp_requirement(db_session, "CM", "ORANGE") is None

    touchpay_orange = (await db_session.execute(select(CountryOperator).where(
        CountryOperator.provider_code == "TOUCHPAY", CountryOperator.operator_code == "ORANGE",
    ))).scalar_one()
    touchpay_orange.is_active = False
    await db_session.commit()
    row = await otp_requirement(db_session, "CM", "ORANGE")
    assert row is not None and row.provider_code == "SEBPAY"


def test_operator_codes_map_to_ours():
    assert to_operator_code("mtn") == "MTN"
    assert to_operator_code("MTN") == "MTN"
    assert to_operator_code("togocom") == "TMONEY"
    assert to_operator_code("EZY PESA") == "EZYPESA"
    assert to_operator_code("AFRIMONEY") == "AFRIMONEY"


# --------------------------------------------------------------------------
# Webhook signature
# --------------------------------------------------------------------------

def _sign(body: bytes, secret: str = SECRET) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def test_signature_is_hmac_of_the_raw_body():
    body = b'{"status":"approved","amount":5000}'
    assert verify_webhook_signature(body, _sign(body), SECRET)
    assert verify_webhook_signature(body, "sha256=" + _sign(body).upper(), SECRET)
    # Re-encoding the JSON changes the bytes: the raw body is what counts.
    assert not verify_webhook_signature(b'{"amount": 5000, "status": "approved"}', _sign(body), SECRET)
    assert not verify_webhook_signature(body, _sign(body, "sk_other"), SECRET)
    assert not verify_webhook_signature(body, None, SECRET)
    assert not verify_webhook_signature(body, _sign(body), "")


# --------------------------------------------------------------------------
# Webhook handling
# --------------------------------------------------------------------------

def _payload(payment, status, amount=5000):
    return {
        "transaction_id": "20261008120000123456",
        "external_reference": payment.reference,
        "status": status, "amount": amount, "currency": "XAF",
        "customer_phone": "237677000001",
        "created_at": "2026-10-08T12:00:00.000000Z",
        "updated_at": "2026-10-08T12:01:30.000000Z",
    }


async def _deliver(client, payload, signature=None):
    body = json.dumps(payload).encode()
    with patch("app.services.notification.notify_merchant", new=AsyncMock()):
        return await client.post(
            "/api/v1/callbacks/sebpay", content=body,
            headers={"Content-Type": "application/json",
                     "X-SebPay-Signature": signature if signature is not None else _sign(body)},
        )


async def _row(db_session, payment_id):
    db_session.expire_all()
    return (await db_session.execute(select(Payment).where(Payment.id == payment_id))).scalar_one()


async def test_a_signed_approval_completes_the_payment(client, db_session, payment):
    response = await _deliver(client, _payload(payment, "approved"))
    assert response.status_code == 200
    row = await _row(db_session, payment.id)
    assert row.status == PaymentStatus.COMPLETED
    assert row.provider == PaymentProvider.SEBPAY
    assert row.provider_transaction_id == "20261008120000123456"
    assert row.completed_at is not None


async def test_an_unsigned_approval_is_rejected(client, db_session, payment):
    response = await _deliver(client, _payload(payment, "approved"), signature="deadbeef")
    assert response.status_code == 401
    assert (await _row(db_session, payment.id)).status == PaymentStatus.PROCESSING


async def test_an_approval_for_another_amount_credits_no_one(client, db_session, payment):
    response = await _deliver(client, _payload(payment, "approved", amount=50))
    assert response.status_code == 200
    assert (await _row(db_session, payment.id)).status == PaymentStatus.PROCESSING


async def test_a_rejection_fails_the_payment(client, db_session, payment):
    await _deliver(client, _payload(payment, "rejected"))
    row = await _row(db_session, payment.id)
    assert row.status == PaymentStatus.FAILED
    assert row.touchpay_data["sebpay_status"] == "rejected"


async def test_pending_changes_nothing(client, db_session, payment):
    response = await _deliver(client, _payload(payment, "pending"))
    assert response.status_code == 200
    assert (await _row(db_session, payment.id)).status == PaymentStatus.PROCESSING


async def test_a_replayed_rejection_cannot_undo_a_completion(client, db_session, payment):
    await _deliver(client, _payload(payment, "approved"))
    await _deliver(client, _payload(payment, "rejected"))
    assert (await _row(db_session, payment.id)).status == PaymentStatus.COMPLETED


async def test_a_late_approval_overturns_our_expiry(client, db_session, payment):
    payment.status = PaymentStatus.EXPIRED
    await db_session.commit()
    await _deliver(client, _payload(payment, "approved"))
    assert (await _row(db_session, payment.id)).status == PaymentStatus.COMPLETED


async def test_a_late_rejection_leaves_an_expired_payment_alone(client, db_session, payment):
    payment.status = PaymentStatus.EXPIRED
    await db_session.commit()
    await _deliver(client, _payload(payment, "rejected"))
    assert (await _row(db_session, payment.id)).status == PaymentStatus.EXPIRED


async def test_an_unknown_reference_is_404(client, db_session, payment):
    payload = _payload(payment, "approved")
    payload["external_reference"] = "PAY-NOPE"
    payload["transaction_id"] = "nope"
    response = await _deliver(client, payload)
    assert response.status_code == 404


# --------------------------------------------------------------------------
# Operator sync
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


def _op(cc, code, name, otp=False, active=True, payin=True):
    return {"code": code, "name": name, "otp_required": otp, "is_active": active,
            "payin_enabled": payin, "country": {"country_code": cc}}


async def test_sync_creates_rows_from_the_catalogue(client, db_session, as_admin):
    db_session.add(ProviderConfig(
        code="SEBPAY", name="SebPay", provider_group=ProviderGroup.MOBILE,
        is_active=False, config={"public_key": "pk", "secret_key": "sk"},
    ))
    await db_session.commit()
    catalogue = [
        {**_op("CM", "ORANGE", "Orange Money", otp=True), "ussd_code": "#144*82#"},
        _op("CM", "wave", "Wave Money"),
        _op("CI", "orange", "Orange Money", otp=True),  # country we do not have
    ]
    with patch(
        "app.services.sebpay_service.sebpay_service.list_operators",
        new=AsyncMock(return_value=catalogue),
    ):
        response = await client.post("/api/v1/admin/providers/sebpay/sync-operators")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["countries_not_configured"] == ["CI"]
    assert body["otp_operators"] == ["CM/ORANGE (ORANGE): #144*82#"]

    rows = {
        r.operator_code: r for r in (await db_session.execute(
            select(CountryOperator).where(CountryOperator.provider_code == "SEBPAY")
        )).scalars().all()
    }
    orange = rows["ORANGE"]
    assert orange.service_code == "ORANGE" and orange.is_active
    assert orange.otp_required and orange.ussd_code == "#144*82#"
    # Display settings come from the TouchPay row of the same operator.
    assert orange.operator_name == "Orange Money"
    assert orange.phone_prefixes == ["69", "655", "656", "657", "658", "659"]
    assert rows["WAVE"].is_active is True


# --------------------------------------------------------------------------
# OTP end to end: merchant API and hosted checkout
# --------------------------------------------------------------------------

@pytest.fixture
async def sebpay_only_orange(db_session, provider):
    """Orange CM reachable through SebPay alone, which needs the payer's OTP."""
    from app.models.provider import CountryProvider

    db_session.add(CountryProvider(
        country_code="CM", provider_code="SEBPAY", priority=2, is_active=True,
    ))
    touchpay_orange = (await db_session.execute(select(CountryOperator).where(
        CountryOperator.provider_code == "TOUCHPAY", CountryOperator.operator_code == "ORANGE",
    ))).scalar_one()
    touchpay_orange.is_active = False
    await db_session.commit()


async def test_api_refuses_an_otp_operator_without_code_before_creating_anything(
    client, db_session, auth_headers, sebpay_only_orange,
):
    response = await client.post("/api/v1/payments", headers=auth_headers, json={
        "amount": 5000, "currency": "XAF", "country": "CM",
        "payment_mode": "DIRECT_API", "operator": "ORANGE",
        "customer_phone": "237" + _orange_phone(),
    })
    assert response.status_code == 400, response.text
    body = response.json()
    assert body["failure_code"] == "OTP_REQUIRED"
    assert body["otp_ussd_code"].startswith("*144*4*6*")
    assert (await db_session.execute(select(Payment))).scalars().first() is None


async def test_api_forwards_the_otp_and_returns_the_wave_link(
    client, db_session, auth_headers, sebpay_only_orange,
):
    initiate = AsyncMock(return_value={
        "transactionId": "55", "status": "pending",
        "redirect_url": "https://pay.wave.com/c/x",
    })
    with patch("app.services.payment_router.sebpay_service.initiate_payment", new=initiate):
        response = await client.post("/api/v1/payments", headers=auth_headers, json={
            "amount": 5000, "currency": "XAF", "country": "CM",
            "payment_mode": "DIRECT_API", "operator": "ORANGE",
            "customer_phone": "237" + _orange_phone(), "otp_code": "4321",
        })
    assert response.status_code == 201, response.text
    assert initiate.await_args.kwargs["otp_code"] == "4321"
    assert response.json()["redirect_url"] == "https://pay.wave.com/c/x"


async def test_api_lists_the_otp_requirement(client, sebpay_only_orange):
    response = await client.get("/api/v1/payments/countries")
    cm = next(c for c in response.json() if c["code"] == "CM")
    orange = next(o for o in cm["operators"] if o["code"] == "ORANGE")
    mtn = next(o for o in cm["operators"] if o["code"] == "MTN")
    assert orange["otp_required"] is True
    assert orange["otp_ussd_code"] == "*144*4*6*montant#"
    assert mtn["otp_required"] is False


async def _pending_payment(db_session, merchant):
    p = Payment(
        merchant_id=merchant.id,
        reference=f"PAY-{uuid.uuid4().hex[:16].upper()}",
        payment_token=uuid.uuid4().hex,
        amount=Decimal("5000.00"), currency="XAF", country="CM",
        status=PaymentStatus.PENDING,
    )
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


async def test_checkout_asks_for_the_otp(client, db_session, demo_merchant, sebpay_only_orange):
    from tests.conftest import TestSessionLocal

    payment = await _pending_payment(db_session, demo_merchant)
    with patch("app.main.async_session", TestSessionLocal):
        page = await client.get(f"/pay/{payment.reference}")
        assert page.status_code == 200
        assert 'id="otp-input"' in page.text
        assert "otpRequired: true" in page.text
        assert '"*144*4*6*5000#"' in page.text  # amount filled in

        refused = await client.post(f"/pay/{payment.reference}/submit", json={
            "operator": "ORANGE", "phone": "237" + _orange_phone(),
        })
        assert refused.status_code == 400
        assert "OTP" in refused.json()["detail"]

        initiate = AsyncMock(return_value={"transactionId": "56", "status": "pending"})
        with patch("app.services.payment_router.sebpay_service.initiate_payment", new=initiate):
            accepted = await client.post(f"/pay/{payment.reference}/submit", json={
                "operator": "ORANGE", "phone": "237" + _orange_phone(), "otp_code": "9876",
            })
    assert accepted.status_code == 200, accepted.text
    assert initiate.await_args.kwargs["otp_code"] == "9876"
    assert (await _row(db_session, payment.id)).provider == PaymentProvider.SEBPAY


async def test_checkout_gets_the_wave_link_back(client, db_session, demo_merchant, provider):
    from app.models.provider import CountryProvider
    from tests.conftest import TestSessionLocal

    db_session.add(CountryProvider(
        country_code="CM", provider_code="SEBPAY", priority=2, is_active=True,
    ))
    await db_session.commit()
    payment = await _pending_payment(db_session, demo_merchant)
    initiate = AsyncMock(return_value={
        "transactionId": "57", "status": "pending", "redirect_url": "https://pay.wave.com/c/y",
    })
    with patch("app.main.async_session", TestSessionLocal), \
         patch("app.services.payment_router.sebpay_service.initiate_payment", new=initiate):
        response = await client.post(f"/pay/{payment.reference}/submit", json={
            "operator": "WAVE", "phone": "23768" + str(uuid.uuid4().int)[:7],
        })
        assert response.status_code == 200, response.text
        assert response.json()["redirect_url"] == "https://pay.wave.com/c/y"
        # Reopening the page must give the link back.
        page = await client.get(f"/pay/{payment.reference}")
    assert "https://pay.wave.com/c/y" in page.text


# --------------------------------------------------------------------------
# Seeded catalogue, not yet routed
# --------------------------------------------------------------------------
# Migration 022 seeds every SebPay operator before SebPay is linked to any
# country. Those rows describe routes that do not exist: they must not show
# up on the checkout or in the API, not even greyed out.

async def test_unrouted_provider_rows_expose_nothing(
    client, db_session, demo_merchant, auth_headers, provider,
):
    from app.models.provider import CountryProvider
    from tests.conftest import TestSessionLocal

    listing = (await client.get("/api/v1/payments/countries?include_unavailable=true")).json()
    cm = next(c for c in listing if c["code"] == "CM")
    assert "WAVE" not in {o["code"] for o in cm["operators"]}
    assert {"MTN", "ORANGE"} <= {o["code"] for o in cm["operators"]}

    payment = await _pending_payment(db_session, demo_merchant)
    with patch("app.main.async_session", TestSessionLocal):
        page = await client.get(f"/pay/{payment.reference}")
        refused = await client.post(f"/pay/{payment.reference}/submit", json={
            "operator": "WAVE", "phone": "23768" + str(uuid.uuid4().int)[:7],
        })
    assert 'data-operator-code="WAVE"' not in page.text
    assert refused.status_code == 400

    created = await client.post("/api/v1/payments", headers=auth_headers, json={
        "amount": 5000, "currency": "XAF", "country": "CM",
        "payment_mode": "DIRECT_API", "operator": "WAVE",
        "customer_phone": "23768" + str(uuid.uuid4().int)[:7],
    })
    assert created.status_code == 400

    # Linking SebPay to the country is what brings Wave in.
    db_session.add(CountryProvider(
        country_code="CM", provider_code="SEBPAY", priority=2, is_active=True,
    ))
    await db_session.commit()
    listing = (await client.get("/api/v1/payments/countries")).json()
    cm = next(c for c in listing if c["code"] == "CM")
    assert "WAVE" in {o["code"] for o in cm["operators"]}
