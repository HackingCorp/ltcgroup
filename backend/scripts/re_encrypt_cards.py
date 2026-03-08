#!/usr/bin/env python3
"""
Script to re-encrypt all card data with the current encryption key.
This is needed when the ENCRYPTION_KEY has been changed.

The script:
1. Fetches all cards from the database
2. For each card, retrieves full card details from AccountPE
3. Re-encrypts the card number with the current key
4. Updates the database
"""

import asyncio
import sys
import os

# Add app directory to path
sys.path.insert(0, '/app')

from sqlalchemy import select
from app.database import async_session
from app.models.card import Card
from app.services.accountpe import AccountPEClient
from app.utils.encryption import encrypt_field
from app.config import settings


async def re_encrypt_all_cards():
    """Re-encrypt all cards with the current encryption key."""

    accountpe = AccountPEClient()

    async with async_session() as db:
        # Get all cards (fetch all attributes eagerly to avoid detached instance issues)
        result = await db.execute(select(Card))
        cards_query = result.scalars().all()

        # Convert to list of dicts to avoid SQLAlchemy lazy loading issues
        cards = []
        for card in cards_query:
            cards.append({
                'id': str(card.id),
                'card_number_masked': card.card_number_masked,
                'provider_card_id': card.provider_card_id
            })

        print(f"Found {len(cards)} cards to re-encrypt")

        success_count = 0
        error_count = 0

        for card_dict in cards:
            print(f"\nProcessing card {card_dict['id']} (masked: {card_dict['card_number_masked']})")

            try:
                # Fetch full card details from AccountPE
                card_details = await accountpe.get_card_details(card_dict['provider_card_id'])

                if card_details.get("status") != 200:
                    print(f"  ERROR: AccountPE returned status {card_details.get('status')}: {card_details.get('message')}")
                    error_count += 1
                    continue

                # Get card data from response - card_list is directly at root level
                card_list = card_details.get("card_list", {})

                if not card_list:
                    print(f"  ERROR: No card data in AccountPE response")
                    error_count += 1
                    continue

                # AccountPE returns the card number in "encrypted_cardnumber" field
                # (despite the name, it's actually the plaintext PAN that AccountPE stores encrypted)
                card_number = card_list.get("encrypted_cardnumber")

                if not card_number:
                    print(f"  ERROR: Missing card number in AccountPE response")
                    error_count += 1
                    continue

                # Re-encrypt with current key (CVV is no longer stored — PCI DSS)
                encrypted_card_number = encrypt_field(card_number)

                # Update database - fetch the card object fresh
                from sqlalchemy import update as sql_update
                stmt = sql_update(Card).where(Card.id == card_dict['id']).values(
                    card_number_full_encrypted=encrypted_card_number
                )
                await db.execute(stmt)
                await db.commit()

                print(f"  SUCCESS: Re-encrypted card {card_dict['id']}")
                success_count += 1

            except Exception as e:
                print(f"  ERROR: {type(e).__name__}: {e}")
                error_count += 1
                await db.rollback()

        print(f"\n{'='*60}")
        print(f"Re-encryption complete:")
        print(f"  Success: {success_count}")
        print(f"  Errors:  {error_count}")
        print(f"  Total:   {len(cards)}")
        print(f"{'='*60}")

        return success_count == len(cards)


if __name__ == "__main__":
    print("Starting card re-encryption...")
    print(f"Using encryption key: {settings.encryption_key[:10]}...")
    print()

    success = asyncio.run(re_encrypt_all_cards())

    if success:
        print("\n✓ All cards successfully re-encrypted!")
        sys.exit(0)
    else:
        print("\n✗ Some cards failed to re-encrypt. Check errors above.")
        sys.exit(1)
