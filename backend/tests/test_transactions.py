"""
Tests for transaction endpoints (API v1)
"""

import pytest
from httpx import AsyncClient
from decimal import Decimal


@pytest.mark.asyncio
async def test_topup_card_success(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test successful card top-up.
    """
    token, user = test_user_token

    # Purchase a card first
    card_response = await test_client.post(
        "/api/v1/cards/purchase",
        json={"card_type": "VISA", "initial_balance": 50.00},
        headers={"Authorization": f"Bearer {token}"}
    )
    card_id = card_response.json()["id"]
    initial_balance = float(card_response.json()["balance"])

    # Top-up the card
    topup_data = {
        "card_id": card_id,
        "amount": 25.00,
        "currency": "USD"
    }

    response = await test_client.post(
        "/api/v1/transactions/topup",
        json=topup_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["type"] == "TOPUP"
    assert data["status"] == "COMPLETED"
    assert float(data["amount"]) == 25.00

    # Verify balance increased
    card_response = await test_client.get(
        f"/api/v1/cards/{card_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    new_balance = float(card_response.json()["balance"])
    assert new_balance == initial_balance + 25.00


@pytest.mark.asyncio
async def test_topup_blocked_card(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test that top-up fails for blocked card.
    """
    token, user = test_user_token

    # Purchase and block a card
    card_response = await test_client.post(
        "/api/v1/cards/purchase",
        json={"card_type": "VISA", "initial_balance": 50.00},
        headers={"Authorization": f"Bearer {token}"}
    )
    card_id = card_response.json()["id"]

    await test_client.post(
        f"/api/v1/cards/{card_id}/block",
        headers={"Authorization": f"Bearer {token}"}
    )

    # Try to top-up
    topup_data = {
        "card_id": card_id,
        "amount": 25.00,
        "currency": "USD"
    }

    response = await test_client.post(
        "/api/v1/transactions/topup",
        json=topup_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_withdraw_from_card_success(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test successful withdrawal from card.
    """
    token, user = test_user_token

    # Purchase a card with balance
    card_response = await test_client.post(
        "/api/v1/cards/purchase",
        json={"card_type": "VISA", "initial_balance": 100.00},
        headers={"Authorization": f"Bearer {token}"}
    )
    card_id = card_response.json()["id"]
    initial_balance = float(card_response.json()["balance"])

    # Withdraw from the card
    withdraw_data = {
        "card_id": card_id,
        "amount": 30.00,
        "currency": "USD"
    }

    response = await test_client.post(
        "/api/v1/transactions/withdraw",
        json=withdraw_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["type"] == "WITHDRAW"
    assert data["status"] == "COMPLETED"
    assert float(data["amount"]) == 30.00

    # Verify balance decreased
    card_response = await test_client.get(
        f"/api/v1/cards/{card_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    new_balance = float(card_response.json()["balance"])
    assert new_balance == initial_balance - 30.00


@pytest.mark.asyncio
async def test_withdraw_insufficient_balance(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test that withdrawal fails when balance is insufficient.
    """
    token, user = test_user_token

    # Purchase a card with small balance
    card_response = await test_client.post(
        "/api/v1/cards/purchase",
        json={"card_type": "VISA", "initial_balance": 10.00},
        headers={"Authorization": f"Bearer {token}"}
    )
    card_id = card_response.json()["id"]

    # Try to withdraw more than balance
    withdraw_data = {
        "card_id": card_id,
        "amount": 50.00,
        "currency": "USD"
    }

    response = await test_client.post(
        "/api/v1/transactions/withdraw",
        json=withdraw_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "balance" in data["detail"].lower() or "insufficient" in data["detail"].lower()


@pytest.mark.asyncio
async def test_withdraw_from_blocked_card(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test that withdrawal fails for blocked card.
    """
    token, user = test_user_token

    # Purchase and block a card
    card_response = await test_client.post(
        "/api/v1/cards/purchase",
        json={"card_type": "VISA", "initial_balance": 100.00},
        headers={"Authorization": f"Bearer {token}"}
    )
    card_id = card_response.json()["id"]

    await test_client.post(
        f"/api/v1/cards/{card_id}/block",
        headers={"Authorization": f"Bearer {token}"}
    )

    # Try to withdraw
    withdraw_data = {
        "card_id": card_id,
        "amount": 25.00,
        "currency": "USD"
    }

    response = await test_client.post(
        "/api/v1/transactions/withdraw",
        json=withdraw_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_card_transactions(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test retrieving transaction history for a card.
    """
    token, user = test_user_token

    # Purchase a card
    card_response = await test_client.post(
        "/api/v1/cards/purchase",
        json={"card_type": "VISA", "initial_balance": 100.00},
        headers={"Authorization": f"Bearer {token}"}
    )
    card_id = card_response.json()["id"]

    # Make some transactions
    await test_client.post(
        "/api/v1/transactions/topup",
        json={"card_id": card_id, "amount": 25.00, "currency": "USD"},
        headers={"Authorization": f"Bearer {token}"}
    )
    await test_client.post(
        "/api/v1/transactions/withdraw",
        json={"card_id": card_id, "amount": 10.00, "currency": "USD"},
        headers={"Authorization": f"Bearer {token}"}
    )

    # Get transactions
    response = await test_client.get(
        f"/api/v1/transactions/cards/{card_id}/transactions",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "transactions" in data
    assert "total_count" in data
    assert data["total_count"] == 2
    assert len(data["transactions"]) == 2


@pytest.mark.asyncio
async def test_get_transactions_with_pagination(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test transaction history with pagination.
    """
    token, user = test_user_token

    # Purchase a card and make multiple transactions
    card_response = await test_client.post(
        "/api/v1/cards/purchase",
        json={"card_type": "VISA", "initial_balance": 100.00},
        headers={"Authorization": f"Bearer {token}"}
    )
    card_id = card_response.json()["id"]

    # Create 5 transactions
    for i in range(5):
        await test_client.post(
            "/api/v1/transactions/topup",
            json={"card_id": card_id, "amount": 10.00, "currency": "USD"},
            headers={"Authorization": f"Bearer {token}"}
        )

    # Get first page
    response = await test_client.get(
        f"/api/v1/transactions/cards/{card_id}/transactions?limit=3&offset=0",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["transactions"]) == 3
    assert data["total_count"] == 5
    assert data["page"] == 1
    assert data["page_size"] == 3


@pytest.mark.asyncio
async def test_get_transactions_empty_list(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test getting transactions for a card with no transactions.
    """
    token, user = test_user_token

    # Purchase a card but make no transactions
    card_response = await test_client.post(
        "/api/v1/cards/purchase",
        json={"card_type": "VISA", "initial_balance": 50.00},
        headers={"Authorization": f"Bearer {token}"}
    )
    card_id = card_response.json()["id"]

    # Get transactions
    response = await test_client.get(
        f"/api/v1/transactions/cards/{card_id}/transactions",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 0
    assert len(data["transactions"]) == 0


@pytest.mark.asyncio
async def test_get_transactions_unauthorized(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test that a user cannot view another user's transactions.
    """
    from app.models.user import User, KYCStatus
    from app.models.card import Card, CardType, CardStatus
    from app.services.auth import hash_password

    token, user = test_user_token

    # Create another user with a card
    other_user = User(
        email="other@example.com",
        phone="+237671234571",
        first_name="Other",
        last_name="User",
        hashed_password=hash_password("Other123!"),
        kyc_status=KYCStatus.APPROVED,
    )
    test_db.add(other_user)
    await test_db.commit()
    await test_db.refresh(other_user)

    other_card = Card(
        user_id=other_user.id,
        card_type=CardType.VISA,
        card_number_masked="****3333",
        card_number_full_encrypted="4333333333333333",
        status=CardStatus.ACTIVE,
        balance=Decimal("100.00"),
        currency="USD",
        provider="AccountPE",
        provider_card_id="other_card_456",
        expiry_date="12/29",
        cvv_encrypted="789",
    )
    test_db.add(other_card)
    await test_db.commit()
    await test_db.refresh(other_card)

    # Try to access other user's transactions
    response = await test_client.get(
        f"/api/v1/transactions/cards/{other_card.id}/transactions",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403
