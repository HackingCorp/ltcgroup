"""
LtcPay - Merchant endpoint tests.
"""
import uuid

import pytest
from httpx import AsyncClient

from app.models.merchant import Merchant


@pytest.mark.asyncio
async def test_register_merchant_success(client: AsyncClient):
    """Test successful merchant registration."""
    response = await client.post(
        "/api/v1/merchants/register",
        json={
            "name": "Test Shop",
            "email": "shop@example.com",
            "website": "https://shop.example.com",
            "callback_url": "https://shop.example.com/webhook",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Shop"
    assert "api_key_live" in data
    assert data["api_key_live"].startswith("ltcpay_live_")
    assert data["api_key_test"].startswith("ltcpay_test_")
    assert "api_secret" in data
    assert "webhook_secret" in data


@pytest.mark.asyncio
async def test_register_merchant_duplicate_email(client: AsyncClient, demo_merchant):
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
    """Test that missing name returns validation error."""
    response = await client.post(
        "/api/v1/merchants/register",
        json={"email": "noname@example.com"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_merchant_invalid_email(client: AsyncClient):
    """Test that invalid email returns validation error."""
    response = await client.post(
        "/api/v1/merchants/register",
        json={"name": "Bad Email Shop", "email": "not-an-email"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_merchant_profile(client: AsyncClient, auth_headers: dict):
    """Test getting merchant profile via /me endpoint."""
    response = await client.get(
        "/api/v1/merchants/me",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Merchant"
    assert "api_key_live" in data
    assert "api_key_test" in data
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_get_merchant_profile_unauthenticated(client: AsyncClient):
    """Test that /me without auth returns 401."""
    response = await client.get("/api/v1/merchants/me")
    assert response.status_code == 401
