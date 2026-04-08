"""
LtcPay - TouchPay Direct API service unit tests.

Tests cover:
- Service initialization and URL construction
- Operator-to-service-code mapping
- Successful payment initiation
- HTTP error handling
- Business-level error handling (status field in response)
- Timeout handling
- Network error handling
- Additional info / metadata passthrough
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from app.models.payment import MobileMoneyOperator
from app.services.touchpay_direct_service import (
    TouchPayDirectService,
    TouchPayDirectError,
)


class TestTouchPayDirectServiceInit:
    """Test service initialization and configuration."""

    def test_service_initializes_with_config(self):
        """Test that the service reads config values."""
        service = TouchPayDirectService()
        assert service.api_url  # Should have a default URL
        assert "apidist.gutouch.net" in service.api_url

    def test_build_url_includes_agency_code_and_credentials(self):
        """Test URL construction with agency code and query params."""
        service = TouchPayDirectService()
        service.agency_code = "TEST_AGENCY"
        service.login = "test_login"
        service.password = "test_pass"

        url = service._build_url()
        assert "TEST_AGENCY" in url
        assert "loginAgent=test_login" in url
        assert "passwordAgent=test_pass" in url
        assert "/transaction" in url

    def test_init_strips_trailing_slash(self):
        """Test that __init__ strips trailing slash from api_url."""
        service = TouchPayDirectService()
        assert not service.api_url.endswith("/")


class TestOperatorServiceCodeMapping:
    """Test operator enum to TouchPay service code mapping."""

    def test_mtn_maps_to_service_code(self):
        """Test MTN operator mapping."""
        service = TouchPayDirectService()
        code = service.get_service_code(MobileMoneyOperator.MTN)
        assert code == "PAIEMENTMARCHAND_MTN_CM"

    def test_orange_maps_to_service_code(self):
        """Test Orange operator mapping."""
        service = TouchPayDirectService()
        code = service.get_service_code(MobileMoneyOperator.ORANGE)
        assert code == "CM_PAIEMENTMARCHAND_OM_TP"


class TestInitiatePaymentSuccess:
    """Test successful payment initiation."""

    @pytest.mark.asyncio
    async def test_initiate_payment_success(self):
        """Test successful Direct API payment initiation."""
        service = TouchPayDirectService()
        service.agency_code = "TEST_AGENCY"
        service.login = "test_login"
        service.password = "test_pass"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": 200,
            "message": "Transaction initiated",
            "transactionId": "TP-123456",
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await service.initiate_payment(
                payment_reference="PAY-TEST123",
                amount=5000,
                phone_number="237670000000",
                operator=MobileMoneyOperator.MTN,
                callback_url="https://example.com/callback",
            )

        assert result["status"] == 200
        assert result["transactionId"] == "TP-123456"

        # Verify PUT was called with correct args
        mock_client.put.assert_called_once()
        call_args = mock_client.put.call_args
        assert "TEST_AGENCY" in call_args[0][0]
        payload = call_args[1]["json"]
        assert payload["idFromClient"] == "PAY-TEST123"
        assert payload["amount"] == "5000"
        assert payload["recipientNumber"] == "237670000000"
        assert payload["serviceCode"] == "PAIEMENTMARCHAND_MTN_CM"
        assert payload["callback"] == "https://example.com/callback"

    @pytest.mark.asyncio
    async def test_initiate_payment_with_additional_info(self):
        """Test that additional_info is included as additionnalInfos."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": 200}

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            await service.initiate_payment(
                payment_reference="PAY-META",
                amount=1000,
                phone_number="237670000000",
                operator=MobileMoneyOperator.ORANGE,
                callback_url="https://example.com/cb",
                additional_info={"orderId": "ORD-999"},
            )

        payload = mock_client.put.call_args[1]["json"]
        assert payload["additionnalInfos"] == {"orderId": "ORD-999"}
        assert payload["serviceCode"] == "CM_PAIEMENTMARCHAND_OM_TP"

    @pytest.mark.asyncio
    async def test_initiate_payment_no_additional_info(self):
        """Test that additionnalInfos key is omitted when not provided."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": 200}

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            await service.initiate_payment(
                payment_reference="PAY-NOADD",
                amount=2000,
                phone_number="237670000000",
                operator=MobileMoneyOperator.MTN,
                callback_url="https://example.com/cb",
            )

        payload = mock_client.put.call_args[1]["json"]
        assert "additionnalInfos" not in payload

    @pytest.mark.asyncio
    async def test_digest_auth_is_used(self):
        """Test that httpx.DigestAuth is used for authentication."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "mylogin"
        service.password = "mypass"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": 200}

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            await service.initiate_payment(
                payment_reference="PAY-AUTH",
                amount=1000,
                phone_number="237670000000",
                operator=MobileMoneyOperator.MTN,
                callback_url="https://example.com/cb",
            )

        call_kwargs = mock_client.put.call_args[1]
        auth = call_kwargs["auth"]
        assert isinstance(auth, httpx.DigestAuth)

    @pytest.mark.asyncio
    async def test_timeout_is_30_seconds(self):
        """Test that the httpx client is created with 30s timeout."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": 200}

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            await service.initiate_payment(
                payment_reference="PAY-TO",
                amount=1000,
                phone_number="237670000000",
                operator=MobileMoneyOperator.MTN,
                callback_url="https://example.com/cb",
            )

        call_kwargs = mock_client_cls.call_args[1]
        assert call_kwargs["timeout"] == 30.0


class TestInitiatePaymentHTTPErrors:
    """Test HTTP-level error handling."""

    @pytest.mark.asyncio
    async def test_http_500_raises_error(self):
        """Test that HTTP 500 raises TouchPayDirectError."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            with pytest.raises(TouchPayDirectError) as exc_info:
                await service.initiate_payment(
                    payment_reference="PAY-ERR500",
                    amount=5000,
                    phone_number="237670000000",
                    operator=MobileMoneyOperator.MTN,
                    callback_url="https://example.com/cb",
                )

        assert exc_info.value.status_code == 500
        assert "500" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_http_401_raises_error(self):
        """Test that HTTP 401 raises TouchPayDirectError."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            with pytest.raises(TouchPayDirectError) as exc_info:
                await service.initiate_payment(
                    payment_reference="PAY-ERR401",
                    amount=5000,
                    phone_number="237670000000",
                    operator=MobileMoneyOperator.MTN,
                    callback_url="https://example.com/cb",
                )

        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_http_403_raises_error(self):
        """Test that HTTP 403 raises TouchPayDirectError."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_response.text = "Forbidden"

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            with pytest.raises(TouchPayDirectError) as exc_info:
                await service.initiate_payment(
                    payment_reference="PAY-ERR403",
                    amount=5000,
                    phone_number="237670000000",
                    operator=MobileMoneyOperator.MTN,
                    callback_url="https://example.com/cb",
                )

        assert exc_info.value.status_code == 403


class TestInitiatePaymentBusinessErrors:
    """Test business-level error handling (HTTP 200 with error status in body)."""

    @pytest.mark.asyncio
    async def test_business_error_status_400(self):
        """Test that status=400 in response body raises TouchPayDirectError."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": 400,
            "message": "Invalid phone number",
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            with pytest.raises(TouchPayDirectError) as exc_info:
                await service.initiate_payment(
                    payment_reference="PAY-BIZ400",
                    amount=5000,
                    phone_number="invalid",
                    operator=MobileMoneyOperator.MTN,
                    callback_url="https://example.com/cb",
                )

        assert exc_info.value.status_code == 400
        assert "Invalid phone number" in str(exc_info.value)
        assert exc_info.value.raw_response["status"] == 400

    @pytest.mark.asyncio
    async def test_business_error_status_string(self):
        """Test that string status '400' in response is handled."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "400",
            "message": "Bad request",
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            with pytest.raises(TouchPayDirectError) as exc_info:
                await service.initiate_payment(
                    payment_reference="PAY-BIZSTR",
                    amount=5000,
                    phone_number="237670000000",
                    operator=MobileMoneyOperator.MTN,
                    callback_url="https://example.com/cb",
                )

        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_business_error_status_500_in_body(self):
        """Test that status=500 in body raises error even if HTTP 200."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": 500,
            "message": "Internal error on provider side",
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            with pytest.raises(TouchPayDirectError) as exc_info:
                await service.initiate_payment(
                    payment_reference="PAY-BIZ500",
                    amount=5000,
                    phone_number="237670000000",
                    operator=MobileMoneyOperator.MTN,
                    callback_url="https://example.com/cb",
                )

        assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_non_numeric_status_is_not_error(self):
        """Test that a non-numeric status like 'success' is not treated as error."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "transactionId": "TP-999",
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await service.initiate_payment(
                payment_reference="PAY-SUCC",
                amount=5000,
                phone_number="237670000000",
                operator=MobileMoneyOperator.MTN,
                callback_url="https://example.com/cb",
            )

        assert result["status"] == "success"

    @pytest.mark.asyncio
    async def test_status_200_in_body_is_success(self):
        """Test that status=200 in body is treated as success."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": 200,
            "message": "OK",
            "transactionId": "TP-200",
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await service.initiate_payment(
                payment_reference="PAY-OK200",
                amount=5000,
                phone_number="237670000000",
                operator=MobileMoneyOperator.MTN,
                callback_url="https://example.com/cb",
            )

        assert result["transactionId"] == "TP-200"


class TestInitiatePaymentNetworkErrors:
    """Test network-level error handling."""

    @pytest.mark.asyncio
    async def test_timeout_raises_error(self):
        """Test that a timeout raises TouchPayDirectError."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.side_effect = httpx.ReadTimeout("Timed out")
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            with pytest.raises(TouchPayDirectError) as exc_info:
                await service.initiate_payment(
                    payment_reference="PAY-TIMEOUT",
                    amount=5000,
                    phone_number="237670000000",
                    operator=MobileMoneyOperator.MTN,
                    callback_url="https://example.com/cb",
                )

        assert "timed out" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_connect_error_raises_error(self):
        """Test that a connection error raises TouchPayDirectError."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.side_effect = httpx.ConnectError("Connection refused")
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            with pytest.raises(TouchPayDirectError) as exc_info:
                await service.initiate_payment(
                    payment_reference="PAY-CONN",
                    amount=5000,
                    phone_number="237670000000",
                    operator=MobileMoneyOperator.MTN,
                    callback_url="https://example.com/cb",
                )

        assert "HTTP error" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_connect_timeout_raises_error(self):
        """Test that a connect timeout raises TouchPayDirectError."""
        service = TouchPayDirectService()
        service.agency_code = "AG"
        service.login = "l"
        service.password = "p"

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.put.side_effect = httpx.ConnectTimeout("Connect timed out")
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            with pytest.raises(TouchPayDirectError) as exc_info:
                await service.initiate_payment(
                    payment_reference="PAY-CTIMEOUT",
                    amount=5000,
                    phone_number="237670000000",
                    operator=MobileMoneyOperator.MTN,
                    callback_url="https://example.com/cb",
                )

        assert "timed out" in str(exc_info.value).lower()


class TestTouchPayDirectError:
    """Test the custom exception class."""

    def test_error_with_all_fields(self):
        """Test TouchPayDirectError stores all fields."""
        err = TouchPayDirectError(
            "Test error",
            status_code=400,
            raw_response={"status": 400, "message": "Bad request"},
        )
        assert str(err) == "Test error"
        assert err.status_code == 400
        assert err.raw_response["status"] == 400

    def test_error_defaults(self):
        """Test TouchPayDirectError default values."""
        err = TouchPayDirectError("Simple error")
        assert str(err) == "Simple error"
        assert err.status_code is None
        assert err.raw_response == {}
