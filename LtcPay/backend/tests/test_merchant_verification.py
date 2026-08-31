"""An unverified merchant must not be able to collect real money.

Registration is open, self-service, and hands out a live API key in the
response — with no email confirmation, no KYC and no approval. Before this
gate, is_verified and is_test_mode were stored and displayed but consulted
nowhere: authentication accepted either key and checked only is_active, so
any signup could take real payments through our operator agency minutes
after filling in the form.
"""
import uuid

import pytest
from fastapi import HTTPException

from app.core.security import (
    generate_api_secret, get_current_merchant, get_verified_merchant,
    hash_api_secret,
)
from app.models.merchant import Merchant, generate_api_key_live, generate_api_key_test


@pytest.fixture
async def accounts(db_session):
    """One verified and one freshly-registered merchant sharing a secret."""
    secret = generate_api_secret()
    made = {}
    for label, verified in (("verified", True), ("unverified", False)):
        merchant = Merchant(
            name=f"{label} merchant",
            email=f"{label}-{uuid.uuid4().hex[:8]}@example.com",
            api_key_live=generate_api_key_live(),
            api_key_test=generate_api_key_test(),
            api_secret_hash=hash_api_secret(secret),
            is_active=True,
            is_verified=verified,
            is_test_mode=not verified,
        )
        db_session.add(merchant)
        made[label] = merchant
    await db_session.commit()
    for merchant in made.values():
        await db_session.refresh(merchant)
    made["secret"] = secret
    return made


# --------------------------------------------------------------------------
# The live key is inert until verification
# --------------------------------------------------------------------------

async def test_unverified_live_key_is_rejected(accounts, db_session):
    merchant = accounts["unverified"]
    with pytest.raises(HTTPException) as exc:
        await get_current_merchant(merchant.api_key_live, accounts["secret"], db_session)
    assert exc.value.status_code == 403
    assert "verifi" in exc.value.detail.lower()


async def test_unverified_test_key_still_authenticates(accounts, db_session):
    # Authentication is not the gate: a new signup must still be able to read
    # its configuration and the country list instead of hitting a wall.
    merchant = accounts["unverified"]
    got = await get_current_merchant(merchant.api_key_test, accounts["secret"], db_session)
    assert got.id == merchant.id


async def test_verified_live_key_is_accepted(accounts, db_session):
    merchant = accounts["verified"]
    got = await get_current_merchant(merchant.api_key_live, accounts["secret"], db_session)
    assert got.id == merchant.id


async def test_verified_test_key_is_accepted(accounts, db_session):
    merchant = accounts["verified"]
    got = await get_current_merchant(merchant.api_key_test, accounts["secret"], db_session)
    assert got.id == merchant.id


async def test_a_wrong_secret_still_fails_before_the_verification_check(accounts, db_session):
    # The 401 must not degrade into a 403 that reveals the key exists.
    merchant = accounts["verified"]
    with pytest.raises(HTTPException) as exc:
        await get_current_merchant(merchant.api_key_live, "wrong-secret", db_session)
    assert exc.value.status_code == 401


async def test_deactivation_takes_precedence_over_verification(accounts, db_session):
    merchant = accounts["verified"]
    merchant.is_active = False
    await db_session.commit()
    with pytest.raises(HTTPException) as exc:
        await get_current_merchant(merchant.api_key_live, accounts["secret"], db_session)
    assert exc.value.status_code == 403
    assert "deactivated" in exc.value.detail.lower()


# --------------------------------------------------------------------------
# Collecting requires verification, whichever key is used
# --------------------------------------------------------------------------

async def test_verified_merchant_may_collect(accounts):
    merchant = accounts["verified"]
    assert (await get_verified_merchant(merchant)) is merchant


async def test_unverified_merchant_may_not_collect(accounts):
    with pytest.raises(HTTPException) as exc:
        await get_verified_merchant(accounts["unverified"])
    assert exc.value.status_code == 403


async def test_test_mode_alone_does_not_grant_collection(accounts, db_session):
    # is_test_mode has never gated anything; flipping it must not become a
    # way to bypass verification.
    merchant = accounts["unverified"]
    merchant.is_test_mode = False
    await db_session.commit()
    with pytest.raises(HTTPException):
        await get_verified_merchant(merchant)


async def test_test_mode_does_not_block_a_verified_merchant(accounts, db_session):
    merchant = accounts["verified"]
    merchant.is_test_mode = True
    await db_session.commit()
    assert (await get_verified_merchant(merchant)) is merchant


# --------------------------------------------------------------------------
# End to end through the API
# --------------------------------------------------------------------------

async def test_create_payment_is_refused_for_an_unverified_merchant(client, accounts):
    merchant = accounts["unverified"]
    response = await client.post(
        "/api/v1/payments",
        json={"amount": 5000, "currency": "XAF", "country": "CM"},
        headers={"X-API-Key": merchant.api_key_test, "X-API-Secret": accounts["secret"]},
    )
    assert response.status_code == 403


async def test_reading_countries_still_works_for_an_unverified_merchant(client, accounts):
    merchant = accounts["unverified"]
    response = await client.get(
        "/api/v1/payments/countries",
        headers={"X-API-Key": merchant.api_key_test, "X-API-Secret": accounts["secret"]},
    )
    assert response.status_code == 200
