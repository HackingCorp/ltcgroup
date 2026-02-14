"""
Tests for vCard management endpoints (API v1)
"""

import pytest
from httpx import AsyncClient
from decimal import Decimal
from app.models.user import User
from app.models.card import Card


@pytest.mark.asyncio
async def test_purchase_card_success(test_client: AsyncClient, test_user_token: tuple, mock_accountpe):
    """
    Test successful card purchase via AccountPE.
    """
    token, user = test_user_token

    card_data = {
        "card_type": "VISA",
        "initial_balance": 50.00
    }

    response = await test_client.post(
        "/api/v1/cards/purchase",
        json=card_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["card_type"] == "VISA"
    assert data["status"] == "ACTIVE"
    assert float(data["balance"]) == 50.00
    assert "card_number_masked" in data


@pytest.mark.asyncio
async def test_purchase_card_kyc_not_approved(test_client: AsyncClient, test_db, mock_accountpe):
    """
    Test that card purchase fails when KYC is not approved.
    """
    from app.models.user import User, KYCStatus
    from app.services.auth import hash_password

    # Create user with PENDING KYC
    user = User(
        email="nokyc@example.com",
        phone="+237671234569",
        first_name="No",
        last_name="KYC",
        hashed_password=hash_password("NoKYC123!"),
        kyc_status=KYCStatus.PENDING,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    # Get token
    response = await test_client.post(
        "/api/v1/auth/login",
        params={"email": user.email, "password": "NoKYC123!"}
    )
    token = response.json()["access_token"]

    # Try to purchase card
    card_data = {
        "card_type": "VISA",
        "initial_balance": 50.00
    }

    response = await test_client.post(
        "/api/v1/cards/purchase",
        json=card_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403
    data = response.json()
    assert "detail" in data
    assert "kyc" in data["detail"].lower()


@pytest.mark.asyncio
async def test_purchase_card_invalid_amount(test_client: AsyncClient, test_user_token: tuple, mock_accountpe):
    """
    Test card purchase with invalid amount.
    """
    token, user = test_user_token

    invalid_data = {
        "card_type": "VISA",
        "initial_balance": -100
    }

    response = await test_client.post(
        "/api/v1/cards/purchase",
        json=invalid_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_list_user_cards(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test listing all cards for a user.
    """
    token, user = test_user_token

    # Purchase two cards
    card_data1 = {"card_type": "VISA", "initial_balance": 50.00}
    card_data2 = {"card_type": "MASTERCARD", "initial_balance": 100.00}

    await test_client.post(
        "/api/v1/cards/purchase",
        json=card_data1,
        headers={"Authorization": f"Bearer {token}"}
    )
    await test_client.post(
        "/api/v1/cards/purchase",
        json=card_data2,
        headers={"Authorization": f"Bearer {token}"}
    )

    # List cards
    response = await test_client.get(
        "/api/v1/cards/",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "cards" in data
    assert "total" in data
    assert data["total"] == 2
    assert len(data["cards"]) == 2


@pytest.mark.asyncio
async def test_freeze_card(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test freezing a card.
    """
    token, user = test_user_token

    # Purchase a card
    card_response = await test_client.post(
        "/api/v1/cards/purchase",
        json={"card_type": "VISA", "initial_balance": 50.00},
        headers={"Authorization": f"Bearer {token}"}
    )
    card_id = card_response.json()["id"]

    # Freeze the card
    response = await test_client.post(
        f"/api/v1/cards/{card_id}/freeze",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "FROZEN"


@pytest.mark.asyncio
async def test_unfreeze_card(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test unfreezing a card.
    """
    token, user = test_user_token

    # Purchase and freeze a card
    card_response = await test_client.post(
        "/api/v1/cards/purchase",
        json={"card_type": "VISA", "initial_balance": 50.00},
        headers={"Authorization": f"Bearer {token}"}
    )
    card_id = card_response.json()["id"]

    await test_client.post(
        f"/api/v1/cards/{card_id}/freeze",
        headers={"Authorization": f"Bearer {token}"}
    )

    # Unfreeze the card
    response = await test_client.post(
        f"/api/v1/cards/{card_id}/unfreeze",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_block_card(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test blocking a card (permanent action).
    """
    token, user = test_user_token

    # Purchase a card
    card_response = await test_client.post(
        "/api/v1/cards/purchase",
        json={"card_type": "VISA", "initial_balance": 50.00},
        headers={"Authorization": f"Bearer {token}"}
    )
    card_id = card_response.json()["id"]

    # Block the card
    response = await test_client.post(
        f"/api/v1/cards/{card_id}/block",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"


@pytest.mark.asyncio
async def test_freeze_already_blocked_card(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test that freezing a blocked card returns an error.
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

    # Try to freeze the blocked card
    response = await test_client.post(
        f"/api/v1/cards/{card_id}/freeze",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_card_not_found(test_client: AsyncClient, test_user_token: tuple, mock_accountpe):
    """
    Test retrieving non-existent card.
    """
    token, user = test_user_token

    response = await test_client.get(
        "/api/v1/cards/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_unauthorized_card_access(test_client: AsyncClient, test_user_token: tuple, test_db, mock_accountpe):
    """
    Test that a user cannot access another user's card.
    """
    from app.models.user import User, KYCStatus
    from app.models.card import Card, CardType, CardStatus
    from app.services.auth import hash_password

    token, user = test_user_token

    # Create another user
    other_user = User(
        email="other@example.com",
        phone="+237671234570",
        first_name="Other",
        last_name="User",
        hashed_password=hash_password("Other123!"),
        kyc_status=KYCStatus.APPROVED,
    )
    test_db.add(other_user)
    await test_db.commit()
    await test_db.refresh(other_user)

    # Create a card for other user
    other_card = Card(
        user_id=other_user.id,
        card_type=CardType.VISA,
        card_number_masked="****2222",
        card_number_full_encrypted="4222222222222222",
        status=CardStatus.ACTIVE,
        balance=Decimal("100.00"),
        currency="USD",
        provider="AccountPE",
        provider_card_id="other_card_123",
        expiry_date="12/29",
        cvv_encrypted="456",
    )
    test_db.add(other_card)
    await test_db.commit()
    await test_db.refresh(other_card)

    # Try to access other user's card
    response = await test_client.get(
        f"/api/v1/cards/{other_card.id}",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403
