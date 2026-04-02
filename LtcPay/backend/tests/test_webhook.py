"""
LtcPay - TouchPay callback/webhook endpoint tests.

Tests the /api/v1/callbacks/touchpay endpoint which handles
payment status updates from TouchPay.
"""
import hashlib
import hmac
import json
import uuid
from decimal import Decimal
from unittest.mock import patch, AsyncMock

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_payment_token
from app.models.merchant import Merchant
from app.models.payment import Payment, PaymentStatus


@pytest.mark.asyncio
async def test_callback_success_completes_payment(
    client: AsyncClient, demo_payment: Payment
):
    """Test successful TouchPay callback marks payment as COMPLETED."""
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
async def test_callback_failed_status(
    client: AsyncClient, demo_payment: Payment
):
    """Test failed TouchPay callback marks payment as FAILED."""
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "failed",
            "transaction_id": demo_payment.reference,
            "message": "Insufficient funds",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_callback_cancelled_status(
    client: AsyncClient, demo_payment: Payment
):
    """Test cancelled TouchPay callback marks payment as CANCELLED."""
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "cancelled",
            "transaction_id": demo_payment.reference,
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_callback_unknown_status_maps_to_pending(
    client: AsyncClient, demo_payment: Payment
):
    """Test unknown status string maps to PENDING."""
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "pending_verification",
            "transaction_id": demo_payment.reference,
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_callback_missing_transaction_id(client: AsyncClient):
    """Test callback without transaction_id returns 400."""
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "success",
            "amount": 5000.0,
        },
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_callback_payment_not_found(client: AsyncClient):
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
async def test_callback_idempotent_on_completed(
    client: AsyncClient, db_session: AsyncSession, demo_payment: Payment
):
    """Test that callback is idempotent - already completed payments are skipped."""
    # First mark the payment as COMPLETED
    demo_payment.status = PaymentStatus.COMPLETED
    db_session.add(demo_payment)
    await db_session.commit()

    # Send another callback - should skip
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "success",
            "transaction_id": demo_payment.reference,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Already processed"


@pytest.mark.asyncio
async def test_callback_idempotent_on_failed(
    client: AsyncClient, db_session: AsyncSession, demo_payment: Payment
):
    """Test that callback is idempotent - already failed payments are skipped."""
    demo_payment.status = PaymentStatus.FAILED
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
    data = response.json()
    assert data["message"] == "Already processed"


@pytest.mark.asyncio
async def test_callback_stores_operator_id(
    client: AsyncClient, demo_payment: Payment
):
    """Test that operator_id from callback is stored."""
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "success",
            "transaction_id": demo_payment.reference,
            "operator_id": "OP-UNIQUE-789",
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_callback_alternative_field_names(
    client: AsyncClient, demo_payment: Payment
):
    """Test that alternative field names (transactionRef) are accepted."""
    response = await client.post(
        "/api/v1/callbacks/touchpay",
        json={
            "status": "completed",
            "transactionRef": demo_payment.reference,
            "operatorId": "OP-ALT-456",
            "msisdn": "237670111111",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_callback_various_success_statuses(
    client: AsyncClient,
    db_session: AsyncSession,
    demo_merchant: Merchant,
):
    """Test that various success status strings all map to COMPLETED."""
    for status_str in ("success", "successful", "completed", "approved"):
        # Create a fresh payment for each test
        ref = f"PAY-{uuid.uuid4().hex[:16].upper()}"
        payment = Payment(
            merchant_id=demo_merchant.id,
            reference=ref,
            payment_token=generate_payment_token(ref, 1000.0),
            amount=Decimal("1000.00"),
            currency="XAF",
            status=PaymentStatus.PENDING,
        )
        db_session.add(payment)
        await db_session.commit()
        await db_session.refresh(payment)

        response = await client.post(
            "/api/v1/callbacks/touchpay",
            json={
                "status": status_str,
                "transaction_id": payment.reference,
            },
        )
        assert response.status_code == 200, f"Failed for status: {status_str}"


@pytest.mark.asyncio
async def test_callback_various_failure_statuses(
    client: AsyncClient,
    db_session: AsyncSession,
    demo_merchant: Merchant,
):
    """Test that various failure status strings all map to FAILED."""
    for status_str in ("failed", "error", "declined", "rejected"):
        ref = f"PAY-{uuid.uuid4().hex[:16].upper()}"
        payment = Payment(
            merchant_id=demo_merchant.id,
            reference=ref,
            payment_token=generate_payment_token(ref, 1000.0),
            amount=Decimal("1000.00"),
            currency="XAF",
            status=PaymentStatus.PENDING,
        )
        db_session.add(payment)
        await db_session.commit()
        await db_session.refresh(payment)

        response = await client.post(
            "/api/v1/callbacks/touchpay",
            json={
                "status": status_str,
                "transaction_id": payment.reference,
            },
        )
        assert response.status_code == 200, f"Failed for status: {status_str}"
