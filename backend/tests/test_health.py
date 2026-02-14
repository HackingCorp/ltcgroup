"""
Tests for the health check endpoint
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_success(test_client: AsyncClient):
    """
    Test that the /health endpoint returns a successful response.
    """
    response = await test_client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ltc-vcard-api"


@pytest.mark.asyncio
async def test_health_check_response_format(test_client: AsyncClient):
    """
    Test that the /health endpoint returns the correct JSON structure.
    """
    response = await test_client.get("/health")

    assert response.status_code == 200
    data = response.json()

    # Verify required fields exist
    assert "status" in data
    assert "service" in data

    # Verify field types
    assert isinstance(data["status"], str)
    assert isinstance(data["service"], str)
