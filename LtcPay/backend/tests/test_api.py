"""
LtcPay - API endpoint tests.

Tests the merchant payment API (create, get, list) and merchant registration.
"""
import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Merchant Registration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_merchant_success(client: AsyncClient):
    """Test successful merchant registration returns credentials."""
    response = await client.post(
        "/api/v1/merchants/register",
        json={
            "name": "New Shop",
            "email": "newshop@example.com",
            "website": "https://newshop.example.com",
            "callback_url": "https://newshop.example.com/webhook",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Shop"
    assert data["api_key_live"].startswith("ltcpay_live_")
    assert data["api_key_test"].startswith("ltcpay_test_")
    assert "api_secret" in data
    assert len(data["api_secret"]) == 64  # hex(32) = 64 chars
    assert "webhook_secret" in data


@pytest.mark.asyncio
async def test_register_merchant_duplicate_email(
    client: AsyncClient, demo_merchant
):
    """Test that registering with an existing email returns 409."""
    response = await client.post(
        "/api/v1/merchants/register",
        json={
            "name": "Duplicate Shop",
            "email": demo_merchant.email,
        },
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_merchant_missing_name(client: AsyncClient):
    """Test that missing name returns 422."""
    response = await client.post(
        "/api/v1/merchants/register",
        json={"email": "noname@example.com"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_merchant_invalid_email(client: AsyncClient):
    """Test that invalid email returns 422."""
    response = await client.post(
        "/api/v1/merchants/register",
        json={"name": "Bad Email Shop", "email": "not-an-email"},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Create Payment
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_payment_success(client: AsyncClient, auth_headers: dict):
    """Test creating a new payment."""
    response = await client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "amount": 5000,
            "currency": "XAF",
            "description": "Test order",
            "customer_info": {
                "name": "John Doe",
                "phone": "237670000000",
            },
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["reference"].startswith("PAY-")
    assert float(data["amount"]) == 5000.0
    assert data["currency"] == "XAF"
    assert data["status"] == "PENDING"
    assert "payment_url" in data
    assert "payment_id" in data


@pytest.mark.asyncio
async def test_create_payment_minimum_amount(client: AsyncClient, auth_headers: dict):
    """Test that amounts below 100 XAF are rejected by schema validation."""
    response = await client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"amount": 10, "currency": "XAF"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_payment_invalid_currency(client: AsyncClient, auth_headers: dict):
    """Test that unsupported currency is rejected."""
    response = await client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"amount": 5000, "currency": "GBP"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_payment_missing_amount(client: AsyncClient, auth_headers: dict):
    """Test that missing amount returns 422."""
    response = await client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"currency": "XAF"},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Get Payment
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_payment_success(
    client: AsyncClient, auth_headers: dict, demo_payment
):
    """Test getting a payment by reference."""
    response = await client.get(
        f"/api/v1/payments/{demo_payment.reference}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["reference"] == demo_payment.reference
    assert float(data["amount"]) == 5000.0
    assert data["status"] == "PENDING"


@pytest.mark.asyncio
async def test_get_payment_not_found(client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent payment returns 404."""
    response = await client.get(
        "/api/v1/payments/PAY-NONEXISTENT",
        headers=auth_headers,
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# List Payments
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_payments_empty(client: AsyncClient, auth_headers: dict):
    """Test listing payments when none exist."""
    response = await client.get("/api/v1/payments", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["payments"] == []
    assert data["total_count"] == 0
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_list_payments_with_data(
    client: AsyncClient, auth_headers: dict, demo_payment
):
    """Test listing payments returns existing data."""
    response = await client.get("/api/v1/payments", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] >= 1
    refs = [p["reference"] for p in data["payments"]]
    assert demo_payment.reference in refs


@pytest.mark.asyncio
async def test_list_payments_pagination(
    client: AsyncClient, auth_headers: dict, demo_payment
):
    """Test payment pagination parameters."""
    response = await client.get(
        "/api/v1/payments?page=1&page_size=1",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["payments"]) <= 1
    assert data["page"] == 1
    assert data["page_size"] == 1


@pytest.mark.asyncio
async def test_list_payments_filter_by_status(
    client: AsyncClient, auth_headers: dict, demo_payment
):
    """Test filtering payments by status."""
    response = await client.get(
        "/api/v1/payments?status=PENDING",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] >= 1
    assert all(p["status"] == "PENDING" for p in data["payments"])
