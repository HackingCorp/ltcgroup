"""
LtcPay - Callback (webhook) endpoint tests.

Tests the TouchPay callback endpoint using the Payment model.
"""
import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.merchant import Merchant
from app.models.payment import Payment, PaymentStatus


@pytest.mark.asyncio
async def test_touchpay_callback_success(client: AsyncClient, demo_payment: Payment):
    """Test successful TouchPay callback."""
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "success",
            "transaction_id": demo_payment.reference,
            "operator_id": "OP-12345",
            "amount": 5000.0,
            "phone": "237670000000",
            "message": "Payment successful",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["reference"] == demo_payment.reference


@pytest.mark.asyncio
async def test_touchpay_callback_failed(client: AsyncClient, demo_payment: Payment):
    """Test failed TouchPay callback."""
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "failed",
            "transaction_id": demo_payment.reference,
            "message": "Insufficient funds",
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_touchpay_callback_cancelled(client: AsyncClient, demo_payment: Payment):
    """Test cancelled TouchPay callback."""
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "cancelled",
            "transaction_id": demo_payment.reference,
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_touchpay_callback_missing_transaction_id(client: AsyncClient):
    """Test callback without transaction_id returns 400."""
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={"status": "success", "amount": 5000.0},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_touchpay_callback_not_found(client: AsyncClient):
    """Test callback for non-existent payment returns 404."""
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "success",
            "transaction_id": "PAY-NONEXISTENT000000",
        },
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_touchpay_callback_idempotent(
    client: AsyncClient, db_session: AsyncSession, demo_payment: Payment
):
    """Test idempotency - completed payment skips update."""
    demo_payment.status = PaymentStatus.COMPLETED
    completed_at = demo_payment.completed_at
    db_session.add(demo_payment)
    await db_session.commit()
    await db_session.refresh(demo_payment)
    pid, ref = demo_payment.id, demo_payment.reference

    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={"status": "success", "transaction_id": ref},
    )
    assert response.status_code == 200
    # The endpoint has never echoed a "message" field, so the original
    # assertion here only ever raised KeyError: check the row instead.
    db_session.expire_all()
    fresh = (await db_session.execute(
        select(Payment).where(Payment.id == pid)
    )).scalar_one()
    assert fresh.status == PaymentStatus.COMPLETED
    assert fresh.completed_at == completed_at


# ---------------------------------------------------------------------------
# A success verdict overturns a status we wrote ourselves
# ---------------------------------------------------------------------------
# PAY-4DB3A75B530848C8 (2026-09-09): our TouchPay request timed out, the
# router failed over, AccountPE bounced it as a duplicate and the payment
# was written FAILED. TouchPay's SUCCESSFUL callback arrived 49 seconds
# later and was dropped as "already terminal" — 12 709 XAF collected from
# the customer, declared failed to the merchant. Only the operator knows
# whether money moved, so its success always wins.


async def _settle(db_session, payment, status):
    """Put the payment in `status` and return its (id, reference)."""
    payment.status = status
    db_session.add(payment)
    await db_session.commit()
    await db_session.refresh(payment)
    return payment.id, payment.reference


async def _status_after(client, db_session, payment_id, body):
    response = await client.post("/api/v1/callbacks/touchpay", json=body)
    assert response.status_code == 200
    db_session.expire_all()
    return (await db_session.execute(
        select(Payment).where(Payment.id == payment_id)
    )).scalar_one()


@pytest.mark.parametrize("initial", [PaymentStatus.FAILED, PaymentStatus.CANCELLED])
@pytest.mark.asyncio
async def test_a_success_callback_overturns_our_own_verdict(
    client: AsyncClient, db_session: AsyncSession, demo_payment: Payment, initial
):
    pid, ref = await _settle(db_session, demo_payment, initial)

    fresh = await _status_after(client, db_session, pid, {
        "status": "success",
        "transaction_id": ref,
        "operator_id": "1788972353730",
    })
    assert fresh.status == PaymentStatus.COMPLETED
    assert fresh.completed_at is not None


@pytest.mark.asyncio
async def test_a_failure_callback_does_not_reopen_a_failed_payment(
    client: AsyncClient, db_session: AsyncSession, demo_payment: Payment
):
    """Only success overturns; a second FAILED is still just a duplicate."""
    pid, ref = await _settle(db_session, demo_payment, PaymentStatus.FAILED)

    fresh = await _status_after(client, db_session, pid, {
        "status": "failed", "transaction_id": ref,
    })
    assert fresh.status == PaymentStatus.FAILED
    assert fresh.completed_at is None


@pytest.mark.asyncio
async def test_a_completed_payment_is_never_rewritten(
    client: AsyncClient, db_session: AsyncSession, demo_payment: Payment
):
    """COMPLETED stays the one genuinely final state."""
    pid, ref = await _settle(db_session, demo_payment, PaymentStatus.COMPLETED)

    fresh = await _status_after(client, db_session, pid, {
        "status": "failed", "transaction_id": ref,
    })
    assert fresh.status == PaymentStatus.COMPLETED
