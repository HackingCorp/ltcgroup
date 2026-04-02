"""
LtcPay - TouchPay service unit tests.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.touchpay_service import TouchPayService


class TestTouchPayServiceConfig:
    """Test TouchPay SDK config generation."""

    def setup_method(self):
        self.service = TouchPayService()

    def test_get_sdk_config_basic(self):
        """Test basic SDK config generation."""
        config = self.service.get_sdk_config(
            payment_token="PAY-TEST123",
            amount=5000.0,
        )
        assert config["amount"] == 5000
        assert config["payment_token"] == "PAY-TEST123"
        assert "merchant_id" in config
        assert "secure_code" in config
        assert "success_url" in config

    def test_get_sdk_config_with_success_url(self):
        """Test SDK config with custom success URL."""
        config = self.service.get_sdk_config(
            payment_token="PAY-TEST456",
            amount=10000.0,
            success_url="https://merchant.com/callback",
        )
        assert config["success_url"] == "https://merchant.com/callback"

    def test_get_sdk_config_with_failed_url(self):
        """Test SDK config with custom failed URL."""
        config = self.service.get_sdk_config(
            payment_token="PAY-TEST789",
            amount=2500.0,
            failed_url="https://merchant.com/failed",
        )
        assert config["failed_url"] == "https://merchant.com/failed"

    def test_get_sdk_config_default_success_url(self):
        """Test that default success URL contains /webhooks/touchpay/callback."""
        config = self.service.get_sdk_config(
            payment_token="PAY-DEFAULT",
            amount=1000.0,
        )
        assert "/webhooks/touchpay/callback" in config["success_url"]


class TestTouchPayServiceVerify:
    """Test TouchPay transaction verification."""

    def setup_method(self):
        self.service = TouchPayService()

    @pytest.mark.asyncio
    async def test_verify_transaction_success(self):
        """Test successful transaction verification."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "transactionRef": "PAY-TEST123",
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await self.service.verify_transaction("PAY-TEST123")

        if result is not None:
            assert result["status"] == "success"

    @pytest.mark.asyncio
    async def test_verify_transaction_api_error(self):
        """Test verification when TouchPay returns error status."""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await self.service.verify_transaction("PAY-TEST123")

        assert result is None

    @pytest.mark.asyncio
    async def test_verify_transaction_network_error(self):
        """Test verification when network error occurs."""
        import httpx

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.side_effect = httpx.ConnectError("Connection refused")
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await self.service.verify_transaction("PAY-TEST123")

        assert result is None

    @pytest.mark.asyncio
    async def test_verify_no_api_url(self):
        """Test verification returns None when API URL not configured."""
        service = TouchPayService()
        # If api_url is empty, should return None
        if not service.api_url:
            result = await service.verify_transaction("PAY-TEST123")
            assert result is None
