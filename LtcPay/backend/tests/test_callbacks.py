"""
LtcPay - Callback (webhook) endpoint tests.

Tests the TouchPay callback endpoint using the Payment model.
"""
import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
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
    db_session.add(demo_payment)
    await db_session.commit()

    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "success",
            "transaction_id": demo_payment.reference,
        },
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Already processed"
