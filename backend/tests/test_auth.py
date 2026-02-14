"""
Tests for authentication endpoints (API v1)
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user_success(test_client: AsyncClient, sample_user_data: dict, mock_accountpe):
    """
    Test successful user registration.
    """
    response = await test_client.post("/api/v1/auth/register", json=sample_user_data)

    assert response.status_code == 201
    data = response.json()
    assert "user" in data
    assert "token" in data

    user = data["user"]
    assert "id" in user
    assert user["email"] == sample_user_data["email"]
    assert user["first_name"] == sample_user_data["first_name"]
    assert user["last_name"] == sample_user_data["last_name"]
    assert user["kyc_status"] == "PENDING"

    token = data["token"]
    assert "access_token" in token
    assert token["token_type"] == "bearer"
    assert "expires_in" in token


@pytest.mark.asyncio
async def test_register_user_duplicate_email(test_client: AsyncClient, sample_user_data: dict, mock_accountpe):
    """
    Test that registering with an existing email returns an error.
    """
    # First registration
    response1 = await test_client.post("/api/v1/auth/register", json=sample_user_data)
    assert response1.status_code == 201

    # Second registration with same email
    response2 = await test_client.post("/api/v1/auth/register", json=sample_user_data)

    assert response2.status_code == 400
    data = response2.json()
    assert "detail" in data
    assert "email" in data["detail"].lower()


@pytest.mark.asyncio
async def test_register_user_duplicate_phone(test_client: AsyncClient, sample_user_data: dict, mock_accountpe):
    """
    Test that registering with an existing phone returns an error.
    """
    # First registration
    response1 = await test_client.post("/api/v1/auth/register", json=sample_user_data)
    assert response1.status_code == 201

    # Second registration with same phone but different email
    duplicate_phone_data = sample_user_data.copy()
    duplicate_phone_data["email"] = "different@example.com"
    response2 = await test_client.post("/api/v1/auth/register", json=duplicate_phone_data)

    assert response2.status_code == 400
    data = response2.json()
    assert "detail" in data
    assert "phone" in data["detail"].lower()


@pytest.mark.asyncio
async def test_register_user_invalid_data(test_client: AsyncClient, mock_accountpe):
    """
    Test registration with invalid data.
    """
    invalid_data = {
        "email": "not-an-email",
        "password": "123",  # Too short
        "first_name": "Test",
        "last_name": "User",
        "phone": "123"
    }

    response = await test_client.post("/api/v1/auth/register", json=invalid_data)

    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_login_success(test_client: AsyncClient, sample_user_data: dict, mock_accountpe):
    """
    Test successful login and JWT token generation.
    """
    # Register user first
    await test_client.post("/api/v1/auth/register", json=sample_user_data)

    # Login - note that the login endpoint uses query params, not JSON body
    response = await test_client.post(
        "/api/v1/auth/login",
        params={
            "email": sample_user_data["email"],
            "password": sample_user_data["password"],
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"
    assert "expires_in" in data


@pytest.mark.asyncio
async def test_login_invalid_password(test_client: AsyncClient, sample_user_data: dict, mock_accountpe):
    """
    Test login with wrong password.
    """
    # Register user first
    await test_client.post("/api/v1/auth/register", json=sample_user_data)

    # Login with wrong password
    response = await test_client.post(
        "/api/v1/auth/login",
        params={
            "email": sample_user_data["email"],
            "password": "WrongPassword123!",
        }
    )

    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_login_nonexistent_user(test_client: AsyncClient, mock_accountpe):
    """
    Test login with non-existent email.
    """
    response = await test_client.post(
        "/api/v1/auth/login",
        params={
            "email": "nonexistent@example.com",
            "password": "SomePassword123!",
        }
    )

    assert response.status_code == 401
    data = response.json()
    assert "detail" in data
