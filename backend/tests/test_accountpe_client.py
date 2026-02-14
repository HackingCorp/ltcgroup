"""
Tests for the AccountPE API client
"""

import pytest
from unittest.mock import AsyncMock, patch
import httpx

from app.services.accountpe import AccountPEClient


@pytest.mark.asyncio
async def test_accountpe_client_initialization():
    """
    Test that the AccountPE client initializes correctly.
    """
    client = AccountPEClient()

    assert client.base_url == "https://api.accountpe.com/v2"
    assert client.api_key is not None
    assert isinstance(client.client, httpx.AsyncClient)


@pytest.mark.asyncio
async def test_accountpe_get_headers():
    """
    Test that authentication headers are correctly formatted.
    """
    client = AccountPEClient()
    headers = await client._get_headers()

    assert "Authorization" in headers
    assert headers["Authorization"].startswith("Bearer ")
    assert "Content-Type" in headers
    assert headers["Content-Type"] == "application/json"


@pytest.mark.asyncio
async def test_accountpe_health_check_success():
    """
    Test successful health check with mocked HTTP response.
    """
    client = AccountPEClient()

    # Mock the httpx.AsyncClient.get method
    mock_response = AsyncMock()
    mock_response.json.return_value = {"status": "healthy", "service": "accountpe-api"}
    mock_response.raise_for_status = AsyncMock()

    with patch.object(client.client, 'get', return_value=mock_response):
        result = await client.health_check()

        assert result["status"] == "healthy"
        assert result["service"] == "accountpe-api"
        mock_response.raise_for_status.assert_called_once()


@pytest.mark.asyncio
async def test_accountpe_health_check_error():
    """
    Test health check error handling when API returns non-200 status.
    """
    client = AccountPEClient()

    # Mock the httpx.AsyncClient.get method to raise an error
    mock_response = AsyncMock()
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Service unavailable",
        request=AsyncMock(),
        response=AsyncMock(status_code=503)
    )

    with patch.object(client.client, 'get', return_value=mock_response):
        with pytest.raises(httpx.HTTPStatusError):
            await client.health_check()


@pytest.mark.asyncio
async def test_accountpe_client_timeout():
    """
    Test that the client has a reasonable timeout configured.
    """
    client = AccountPEClient()

    assert client.client.timeout is not None
    # Verify timeout is set to 30 seconds
    assert client.client.timeout.connect == 30.0 or client.client.timeout == 30.0
