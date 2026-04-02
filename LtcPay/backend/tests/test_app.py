"""
LtcPay - Application-level tests (root, health).
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test the root endpoint returns app info."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "LtcPay"
    assert "version" in data
    assert data["status"] == "running"


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Test the health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_nonexistent_endpoint(client: AsyncClient):
    """Test that a non-existent endpoint returns 404."""
    response = await client.get("/api/v1/nonexistent")
    assert response.status_code in (404, 405)
