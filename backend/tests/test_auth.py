"""
Tests for authentication endpoints (API v1)

These tests are skeleton tests for future API endpoints.
They will be skipped until the actual endpoints are implemented.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.skip(reason="Auth endpoints not yet implemented")
@pytest.mark.asyncio
async def test_register_user_success(test_client: AsyncClient, sample_user_data: dict):
    """
    Test successful user registration.
    """
    response = await test_client.post("/api/v1/auth/register", json=sample_user_data)

    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["email"] == sample_user_data["email"]
    assert "password" not in data  # Password should not be returned


@pytest.mark.skip(reason="Auth endpoints not yet implemented")
@pytest.mark.asyncio
async def test_register_user_duplicate_email(test_client: AsyncClient, sample_user_data: dict):
    """
    Test that registering with an existing email returns an error.
    """
    # First registration
    await test_client.post("/api/v1/auth/register", json=sample_user_data)

    # Second registration with same email
    response = await test_client.post("/api/v1/auth/register", json=sample_user_data)

    assert response.status_code == 400
    data = response.json()
    assert "error" in data or "detail" in data


@pytest.mark.skip(reason="Auth endpoints not yet implemented")
@pytest.mark.asyncio
async def test_register_user_invalid_data(test_client: AsyncClient):
    """
    Test registration with invalid data.
    """
    invalid_data = {
        "email": "not-an-email",
        "password": "123",  # Too short
    }

    response = await test_client.post("/api/v1/auth/register", json=invalid_data)

    assert response.status_code == 422  # Validation error


@pytest.mark.skip(reason="Auth endpoints not yet implemented")
@pytest.mark.asyncio
async def test_login_success(test_client: AsyncClient, sample_user_data: dict):
    """
    Test successful login and JWT token generation.
    """
    # Register user first
    await test_client.post("/api/v1/auth/register", json=sample_user_data)

    # Login
    login_data = {
        "email": sample_user_data["email"],
        "password": sample_user_data["password"],
    }
    response = await test_client.post("/api/v1/auth/login", json=login_data)

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"


@pytest.mark.skip(reason="Auth endpoints not yet implemented")
@pytest.mark.asyncio
async def test_login_invalid_credentials(test_client: AsyncClient):
    """
    Test login with invalid credentials.
    """
    login_data = {
        "email": "nonexistent@example.com",
        "password": "WrongPassword123!",
    }

    response = await test_client.post("/api/v1/auth/login", json=login_data)

    assert response.status_code == 401
    data = response.json()
    assert "error" in data or "detail" in data


@pytest.mark.skip(reason="Auth endpoints not yet implemented")
@pytest.mark.asyncio
async def test_login_missing_fields(test_client: AsyncClient):
    """
    Test login with missing required fields.
    """
    response = await test_client.post("/api/v1/auth/login", json={})

    assert response.status_code == 422  # Validation error
