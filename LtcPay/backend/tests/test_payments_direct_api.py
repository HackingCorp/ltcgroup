"""
LtcPay - Direct API payment flow integration tests.

Tests cover:
- Creating payments with payment_mode=DIRECT_API
- Schema validation (operator + customer_phone required for DIRECT_API)
- Direct API called immediately on creation
- Handling Direct API failures
- Direct API callback processing (success, failure, idempotency)
- SDK mode backward compatibility (regression)
- Status transitions and DB updates
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient

from app.models.payment import Payment, PaymentStatus, PaymentMode, MobileMoneyOperator


# ---------------------------------------------------------------------------
# Direct API payment creation
# ---------------------------------------------------------------------------

class TestCreatePaymentDirectAPI:
    """Test creating payments with DIRECT_API mode."""

    @pytest.mark.asyncio
    async def test_create_direct_api_payment_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test creating a Direct API payment that initiates successfully."""
        mock_response = {
            "status": 200,
            "message": "Transaction initiated",
            "transactionId": "TP-DIRECT-001",
        }

        with patch(
            "app.api.v1.payments.touchpay_direct_service"
        ) as mock_service:
            mock_service.initiate_payment = AsyncMock(return_value=mock_response)

            response = await client.post(
                "/api/v1/payments",
                headers=auth_headers,
                json={
                    "amount": 5000,
                    "currency": "XAF",
                    "description": "Direct API test",
                    "payment_mode": "DIRECT_API",
                    "operator": "MTN",
                    "customer_phone": "237670000000",
                    "customer_info": {
                        "name": "Test User",
                        "email": "test@example.com",
                    },
                },
            )

        assert response.status_code == 201
        data = response.json()
        assert data["reference"].startswith("PAY-")
        assert data["status"] == "PROCESSING"
        assert data["payment_mode"] == "DIRECT_API"
        # Direct API payments should not have a payment_url
        assert data.get("payment_url") is None

        # Verify the service was called with correct args
        mock_service.initiate_payment.assert_called_once()
        call_kwargs = mock_service.initiate_payment.call_args[1]
        assert call_kwargs["amount"] == 5000
        assert call_kwargs["phone_number"] == "237670000000"
        assert call_kwargs["operator"] == MobileMoneyOperator.MTN

    @pytest.mark.asyncio
    async def test_create_direct_api_payment_orange(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test creating a Direct API payment with Orange operator."""
        mock_response = {
            "status": 200,
            "transactionId": "TP-ORANGE-001",
        }

        with patch(
            "app.api.v1.payments.touchpay_direct_service"
        ) as mock_service:
            mock_service.initiate_payment = AsyncMock(return_value=mock_response)

            response = await client.post(
                "/api/v1/payments",
                headers=auth_headers,
                json={
                    "amount": 10000,
                    "currency": "XAF",
                    "payment_mode": "DIRECT_API",
                    "operator": "ORANGE",
                    "customer_phone": "237690000000",
                },
            )

        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "PROCESSING"
        assert data["payment_mode"] == "DIRECT_API"

        call_kwargs = mock_service.initiate_payment.call_args[1]
        assert call_kwargs["operator"] == MobileMoneyOperator.ORANGE

    @pytest.mark.asyncio
    async def test_create_direct_api_payment_failure_returns_502(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that Direct API initiation failure returns HTTP 502."""
        from app.services.touchpay_direct_service import TouchPayDirectError

        with patch(
            "app.api.v1.payments.touchpay_direct_service"
        ) as mock_service:
            mock_service.initiate_payment = AsyncMock(
                side_effect=TouchPayDirectError("Provider unavailable", status_code=503)
            )

            response = await client.post(
                "/api/v1/payments",
                headers=auth_headers,
                json={
                    "amount": 5000,
                    "currency": "XAF",
                    "payment_mode": "DIRECT_API",
                    "operator": "MTN",
                    "customer_phone": "237670000000",
                },
            )

        assert response.status_code == 502
        assert "failed" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Schema validation for Direct API
# ---------------------------------------------------------------------------

class TestDirectAPISchemaValidation:
    """Test validation of Direct API fields."""

    @pytest.mark.asyncio
    async def test_direct_api_missing_operator_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that missing operator for DIRECT_API returns validation error."""
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={
                "amount": 5000,
                "currency": "XAF",
                "payment_mode": "DIRECT_API",
                "customer_phone": "237670000000",
                # operator intentionally missing
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_direct_api_missing_customer_phone_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that missing customer_phone for DIRECT_API returns validation error."""
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={
                "amount": 5000,
                "currency": "XAF",
                "payment_mode": "DIRECT_API",
                "operator": "MTN",
                # customer_phone intentionally missing
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_sdk_mode_does_not_require_operator(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that SDK mode works without operator/customer_phone."""
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={
                "amount": 5000,
                "currency": "XAF",
                "payment_mode": "SDK",
                "description": "SDK payment",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["payment_mode"] == "SDK"
        assert data["payment_url"] is not None


# ---------------------------------------------------------------------------
# Direct API callback processing
# ---------------------------------------------------------------------------

class TestDirectAPICallback:
    """Test the Direct API callback endpoint."""

    @pytest.mark.asyncio
    async def test_direct_callback_success(
        self, client: AsyncClient, auth_headers: dict, db_session
    ):
        """Test successful Direct API callback updates payment to COMPLETED."""
        # 1. Create a Direct API payment
        mock_response = {
            "status": 200,
            "transactionId": "TP-CB-001",
        }

        with patch(
            "app.api.v1.payments.touchpay_direct_service"
        ) as mock_service:
            mock_service.initiate_payment = AsyncMock(return_value=mock_response)

            create_resp = await client.post(
                "/api/v1/payments",
                headers=auth_headers,
                json={
                    "amount": 5000,
                    "currency": "XAF",
                    "payment_mode": "DIRECT_API",
                    "operator": "MTN",
                    "customer_phone": "237670000000",
                },
            )

        assert create_resp.status_code == 201
        reference = create_resp.json()["reference"]

        # 2. Simulate a success callback from TouchPay Direct
        with patch("app.services.notification.notify_merchant", new_callable=AsyncMock):
            callback_resp = await client.post(
                "/api/v1/callbacks/touchpay-direct",
                json={
                    "idFromClient": reference,
                    "transactionId": "TP-CB-001",
                    "status": "success",
                    "amount": "5000",
                    "recipientNumber": "237670000000",
                },
            )

        assert callback_resp.status_code == 200
        assert callback_resp.json()["status"] == "ok"

        # 3. Verify payment status updated
        get_resp = await client.get(
            f"/api/v1/payments/{reference}",
            headers=auth_headers,
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["status"] == "COMPLETED"

    @pytest.mark.asyncio
    async def test_direct_callback_failed(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test failed Direct API callback updates payment to FAILED."""
        mock_response = {"status": 200, "transactionId": "TP-FAIL-001"}

        with patch(
            "app.api.v1.payments.touchpay_direct_service"
        ) as mock_service:
            mock_service.initiate_payment = AsyncMock(return_value=mock_response)

            create_resp = await client.post(
                "/api/v1/payments",
                headers=auth_headers,
                json={
                    "amount": 5000,
                    "currency": "XAF",
                    "payment_mode": "DIRECT_API",
                    "operator": "ORANGE",
                    "customer_phone": "237690000000",
                },
            )

        reference = create_resp.json()["reference"]

        # Simulate a failed callback
        callback_resp = await client.post(
            "/api/v1/callbacks/touchpay-direct",
            json={
                "idFromClient": reference,
                "transactionId": "TP-FAIL-001",
                "status": "failed",
                "amount": "5000",
                "recipientNumber": "237690000000",
            },
        )

        assert callback_resp.status_code == 200

        # Verify payment is now FAILED
        get_resp = await client.get(
            f"/api/v1/payments/{reference}",
            headers=auth_headers,
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["status"] == "FAILED"

    @pytest.mark.asyncio
    async def test_direct_callback_idempotent(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that duplicate callbacks are handled idempotently."""
        mock_response = {"status": 200, "transactionId": "TP-IDEM-001"}

        with patch(
            "app.api.v1.payments.touchpay_direct_service"
        ) as mock_service:
            mock_service.initiate_payment = AsyncMock(return_value=mock_response)

            create_resp = await client.post(
                "/api/v1/payments",
                headers=auth_headers,
                json={
                    "amount": 5000,
                    "currency": "XAF",
                    "payment_mode": "DIRECT_API",
                    "operator": "MTN",
                    "customer_phone": "237670000000",
                },
            )

        reference = create_resp.json()["reference"]

        callback_body = {
            "idFromClient": reference,
            "transactionId": "TP-IDEM-001",
            "status": "success",
            "amount": "5000",
        }

        # First callback
        with patch("app.services.notification.notify_merchant", new_callable=AsyncMock):
            resp1 = await client.post(
                "/api/v1/callbacks/touchpay-direct",
                json=callback_body,
            )
        assert resp1.status_code == 200

        # Second callback (duplicate) should also succeed
        resp2 = await client.post(
            "/api/v1/callbacks/touchpay-direct",
            json=callback_body,
        )
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_direct_callback_missing_id_from_client(
        self, client: AsyncClient
    ):
        """Test callback without idFromClient returns 400."""
        response = await client.post(
            "/api/v1/callbacks/touchpay-direct",
            json={
                "transactionId": "TP-999",
                "status": "success",
                "amount": "5000",
            },
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_direct_callback_unknown_reference(
        self, client: AsyncClient
    ):
        """Test callback with unknown reference returns 404."""
        response = await client.post(
            "/api/v1/callbacks/touchpay-direct",
            json={
                "idFromClient": "PAY-NONEXISTENT",
                "transactionId": "TP-999",
                "status": "success",
                "amount": "5000",
            },
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# SDK mode backward compatibility (regression)
# ---------------------------------------------------------------------------

class TestSDKModeRegression:
    """Ensure SDK mode still works correctly after Direct API additions."""

    @pytest.mark.asyncio
    async def test_create_sdk_payment_default_mode(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that payments default to SDK mode when not specified."""
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={
                "amount": 5000,
                "currency": "XAF",
                "description": "SDK default test",
                "customer_info": {
                    "name": "Test User",
                    "phone": "237670000000",
                },
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "PENDING"
        assert data["payment_mode"] == "SDK"
        assert data["payment_url"] is not None
        assert data["reference"].startswith("PAY-")

    @pytest.mark.asyncio
    async def test_create_sdk_payment_explicit(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test explicitly setting payment_mode=SDK."""
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={
                "amount": 10000,
                "currency": "XAF",
                "payment_mode": "SDK",
                "description": "SDK explicit test",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["payment_mode"] == "SDK"
        assert data["status"] == "PENDING"
        assert data["payment_url"] is not None

    @pytest.mark.asyncio
    async def test_sdk_payment_does_not_call_direct_api(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that SDK mode does NOT call the Direct API service."""
        with patch(
            "app.api.v1.payments.touchpay_direct_service"
        ) as mock_service:
            mock_service.initiate_payment = AsyncMock()

            response = await client.post(
                "/api/v1/payments",
                headers=auth_headers,
                json={
                    "amount": 5000,
                    "currency": "XAF",
                    "payment_mode": "SDK",
                },
            )

        assert response.status_code == 201
        mock_service.initiate_payment.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_payment_includes_new_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that payment response includes payment_mode and operator fields."""
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={
                "amount": 5000,
                "currency": "XAF",
            },
        )
        assert response.status_code == 201
        reference = response.json()["reference"]

        get_resp = await client.get(
            f"/api/v1/payments/{reference}",
            headers=auth_headers,
        )
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert "payment_mode" in data
        assert data["payment_mode"] == "SDK"
        assert "operator" in data
        assert data["operator"] is None

    @pytest.mark.asyncio
    async def test_list_payments_includes_both_modes(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that listing payments works with mixed SDK and Direct API payments."""
        # Create SDK payment
        await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={"amount": 5000, "currency": "XAF"},
        )

        # Create Direct API payment
        mock_response = {"status": 200, "transactionId": "TP-MIX-001"}
        with patch(
            "app.api.v1.payments.touchpay_direct_service"
        ) as mock_service:
            mock_service.initiate_payment = AsyncMock(return_value=mock_response)
            await client.post(
                "/api/v1/payments",
                headers=auth_headers,
                json={
                    "amount": 10000,
                    "currency": "XAF",
                    "payment_mode": "DIRECT_API",
                    "operator": "MTN",
                    "customer_phone": "237670000000",
                },
            )

        # List all payments
        list_resp = await client.get("/api/v1/payments", headers=auth_headers)
        assert list_resp.status_code == 200
        data = list_resp.json()
        assert data["total_count"] == 2
        modes = {p["payment_mode"] for p in data["payments"]}
        assert modes == {"SDK", "DIRECT_API"}
