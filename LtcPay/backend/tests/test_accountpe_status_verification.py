"""An AccountPE callback with no status must never decide a payment alone.

AccountPE's per-request callbacks arrive with an empty body, so the verdict
used to be inferred from which of our two URLs they called
(?outcome=success / ?outcome=failed). On 2026-09-01 they called the success
URL for two payments their own dashboard shows as FAILED: 8 252 XAF were
credited to a merchant who had never been paid. The verdict now comes from
POST payin/payment_link_status.
"""
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select

from app.core.security import generate_api_secret, hash_api_secret
from app.models.merchant import Merchant, generate_api_key_live, generate_api_key_test
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.models.provider import ProviderConfig, ProviderGroup


@pytest.fixture
async def payment(db_session):
    # The handler needs the provider row to reach its credentials; without
    # it there is nothing to ask and the callback is ignored.
    db_session.add(ProviderConfig(
        code="ACCOUNTPE", name="AccountPE", provider_group=ProviderGroup.MOBILE,
        is_active=True, config={"api_key": "k", "base_url": "https://x/api"},
    ))
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
        amount=Decimal("4752.00"), currency="XAF",
        status=PaymentStatus.PROCESSING, provider=PaymentProvider.ACCOUNTPE,
    )
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


async def _status_of(db_session, payment_id):
    return (await db_session.execute(
        select(Payment.status).where(Payment.id == payment_id)
    )).scalar_one()


def _success_callback(client, payment):
    return client.post(
        f"/api/v1/callbacks/accountpe?token={payment.payment_token}&outcome=success",
        json={},
    )


# --------------------------------------------------------------------------

async def test_outcome_success_does_not_complete_a_payment_the_provider_failed(
    client, db_session, payment,
):
    # The exact 2026-09-01 case: success URL called for a failed payment.
    with patch(
        "app.services.accountpe_service.accountpe_service.check_payment_status",
        new=AsyncMock(return_value={"status": "failed", "id": 76684}),
    ):
        response = await _success_callback(client, payment)

    assert response.status_code == 200
    assert await _status_of(db_session, payment.id) == PaymentStatus.FAILED


async def test_outcome_success_completes_when_the_provider_confirms(
    client, db_session, payment,
):
    with patch(
        "app.services.accountpe_service.accountpe_service.check_payment_status",
        new=AsyncMock(return_value={"status": "successful", "id": 76795}),
    ):
        response = await _success_callback(client, payment)

    assert response.status_code == 200
    assert await _status_of(db_session, payment.id) == PaymentStatus.COMPLETED


async def test_payment_is_left_untouched_when_the_status_check_is_unavailable(
    client, db_session, payment,
):
    # Guessing from the URL is what caused the incident; refusing to guess
    # leaves the payment for the reconciliation path instead.
    with patch(
        "app.services.accountpe_service.accountpe_service.check_payment_status",
        new=AsyncMock(return_value=None),
    ):
        response = await _success_callback(client, payment)

    assert response.status_code == 200
    assert await _status_of(db_session, payment.id) == PaymentStatus.PROCESSING


async def test_the_provider_transaction_id_is_recorded_from_the_check(
    client, db_session, payment,
):
    with patch(
        "app.services.accountpe_service.accountpe_service.check_payment_status",
        new=AsyncMock(return_value={"status": "successful", "id": 76795}),
    ):
        await _success_callback(client, payment)

    stored = (await db_session.execute(
        select(Payment.provider_transaction_id).where(Payment.id == payment.id)
    )).scalar_one()
    assert stored == "76795"


async def test_a_signed_payload_with_a_status_needs_no_status_check(
    client, db_session, payment,
):
    # The account-level webhook carries the real numeric status; asking again
    # would be a pointless round-trip on every delivery.
    check = AsyncMock(return_value={"status": "failed"})
    with patch(
        "app.services.accountpe_service.accountpe_service.check_payment_status", new=check,
    ):
        response = await client.post(
            f"/api/v1/callbacks/accountpe?token={payment.payment_token}&outcome=success",
            json={"data": {"data": {"attributes": {
                "transaction_id": payment.reference, "status": 1, "id": 76795,
            }}}},
        )

    assert response.status_code == 200
    check.assert_not_awaited()
    assert await _status_of(db_session, payment.id) == PaymentStatus.COMPLETED


async def test_an_unauthenticated_callback_is_still_refused(client, db_session, payment):
    # The status check must not become a way around authentication.
    check = AsyncMock(return_value={"status": "successful"})
    with patch(
        "app.services.accountpe_service.accountpe_service.check_payment_status", new=check,
    ):
        response = await client.post(
            "/api/v1/callbacks/accountpe?token=wrong-token&outcome=success", json={},
        )

    assert response.status_code in (401, 404)
    check.assert_not_awaited()
    assert await _status_of(db_session, payment.id) == PaymentStatus.PROCESSING
