"""
Tests for vCard management endpoints (API v1)

These tests are skeleton tests for future API endpoints.
They will be skipped until the actual endpoints are implemented.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.skip(reason="Card endpoints not yet implemented")
@pytest.mark.asyncio
async def test_purchase_card_success(test_client: AsyncClient, sample_card_data: dict, mock_accountpe):
    """
    Test successful card purchase via AccountPE.
    """
    response = await test_client.post("/api/v1/cards/purchase", json=sample_card_data)

    assert response.status_code == 201
    data = response.json()
    assert "card_id" in data
    assert "status" in data
    assert data["card_type"] == sample_card_data["card_type"]


@pytest.mark.skip(reason="Card endpoints not yet implemented")
@pytest.mark.asyncio
async def test_purchase_card_invalid_amount(test_client: AsyncClient):
    """
    Test card purchase with invalid amount.
    """
    invalid_data = {
        "card_type": "VISA",
        "amount": -100,  # Negative amount
        "currency": "XAF",
    }

    response = await test_client.post("/api/v1/cards/purchase", json=invalid_data)

    assert response.status_code == 422  # Validation error


@pytest.mark.skip(reason="Card endpoints not yet implemented")
@pytest.mark.asyncio
async def test_get_card_details(test_client: AsyncClient):
    """
    Test retrieving card details.
    """
    card_id = "card_123"
    response = await test_client.get(f"/api/v1/cards/{card_id}")

    assert response.status_code == 200
    data = response.json()
    assert "card_id" in data
    assert "card_number" in data
    assert "balance" in data
    assert "status" in data


@pytest.mark.skip(reason="Card endpoints not yet implemented")
@pytest.mark.asyncio
async def test_get_card_not_found(test_client: AsyncClient):
    """
    Test retrieving non-existent card.
    """
    response = await test_client.get("/api/v1/cards/nonexistent_card")

    assert response.status_code == 404


@pytest.mark.skip(reason="Card endpoints not yet implemented")
@pytest.mark.asyncio
async def test_freeze_card(test_client: AsyncClient):
    """
    Test freezing a card.
    """
    card_id = "card_123"
    response = await test_client.post(f"/api/v1/cards/{card_id}/freeze")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "FROZEN" or data["message"] == "Card frozen successfully"


@pytest.mark.skip(reason="Card endpoints not yet implemented")
@pytest.mark.asyncio
async def test_unfreeze_card(test_client: AsyncClient):
    """
    Test unfreezing a card.
    """
    card_id = "card_123"
    response = await test_client.post(f"/api/v1/cards/{card_id}/unfreeze")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ACTIVE" or data["message"] == "Card unfrozen successfully"


@pytest.mark.skip(reason="Card endpoints not yet implemented")
@pytest.mark.asyncio
async def test_block_card(test_client: AsyncClient):
    """
    Test blocking a card (permanent action).
    """
    card_id = "card_123"
    response = await test_client.post(f"/api/v1/cards/{card_id}/block")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED" or data["message"] == "Card blocked successfully"


@pytest.mark.skip(reason="Card endpoints not yet implemented")
@pytest.mark.asyncio
async def test_topup_card_success(test_client: AsyncClient):
    """
    Test topping up a card balance.
    """
    card_id = "card_123"
    topup_data = {
        "amount": 25000,
        "currency": "XAF",
        "payment_method": "mobile_money",
    }

    response = await test_client.post(f"/api/v1/cards/{card_id}/topup", json=topup_data)

    assert response.status_code == 200
    data = response.json()
    assert "transaction_id" in data
    assert "new_balance" in data or "status" in data


@pytest.mark.skip(reason="Card endpoints not yet implemented")
@pytest.mark.asyncio
async def test_topup_card_invalid_amount(test_client: AsyncClient):
    """
    Test card topup with invalid amount.
    """
    card_id = "card_123"
    topup_data = {
        "amount": 0,  # Zero amount
        "currency": "XAF",
    }

    response = await test_client.post(f"/api/v1/cards/{card_id}/topup", json=topup_data)

    assert response.status_code == 422  # Validation error


@pytest.mark.skip(reason="Card endpoints not yet implemented")
@pytest.mark.asyncio
async def test_withdraw_from_card(test_client: AsyncClient):
    """
    Test withdrawing funds from a card.
    """
    card_id = "card_123"
    withdrawal_data = {
        "amount": 10000,
        "currency": "XAF",
        "destination": "mobile_money",
        "phone": "237670000000",
    }

    response = await test_client.post(f"/api/v1/cards/{card_id}/withdraw", json=withdrawal_data)

    assert response.status_code == 200
    data = response.json()
    assert "transaction_id" in data
