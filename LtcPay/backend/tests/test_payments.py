"""
LtcPay - Payment endpoint tests (authenticated merchant API).
"""
import pytest
from httpx import AsyncClient

from app.models.payment import Payment


@pytest.mark.asyncio
async def test_create_payment(client: AsyncClient, auth_headers: dict):
    """Test creating a payment via the merchant API."""
    response = await client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "amount": 5000,
            "currency": "XAF",
            "description": "Order #123",
            "customer_info": {
                "name": "John Doe",
                "phone": "237670000000",
                "email": "john@example.com",
            },
            "merchant_reference": "ORD-123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["reference"].startswith("PAY-")
    assert float(data["amount"]) == 5000.0
    assert data["status"] == "PENDING"
    assert "payment_url" in data
    assert "payment_id" in data


@pytest.mark.asyncio
async def test_create_payment_unauthenticated(client: AsyncClient):
    """Test that creating a payment without auth returns 401."""
    response = await client.post(
        "/api/v1/payments",
        json={"amount": 5000, "currency": "XAF"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_payment_by_reference(
    client: AsyncClient, auth_headers: dict, demo_payment: Payment
):
    """Test getting a payment by its reference."""
    response = await client.get(
        f"/api/v1/payments/{demo_payment.reference}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["reference"] == demo_payment.reference
    assert float(data["amount"]) == 5000.0


@pytest.mark.asyncio
async def test_get_payment_not_found(client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent payment."""
    response = await client.get(
        "/api/v1/payments/PAY-NONEXISTENT",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_payments(
    client: AsyncClient, auth_headers: dict, demo_payment: Payment
):
    """Test listing payments for the merchant."""
    response = await client.get("/api/v1/payments", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] >= 1
    assert data["page"] == 1
    assert len(data["payments"]) >= 1


@pytest.mark.asyncio
async def test_list_payments_empty(client: AsyncClient, auth_headers: dict):
    """Test listing payments when there are none."""
    response = await client.get("/api/v1/payments", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 0
    assert data["payments"] == []
