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
from app.db.session import get_db_session
from app.models.card import Card
from app.services.accountpe import AccountPEService
from app.utils.encryption import encrypt_field
from app.core.config import settings


async def re_encrypt_all_cards():
    """Re-encrypt all cards with the current encryption key."""

    accountpe = AccountPEService()

    async with get_db_session() as db:
        # Get all cards
        result = await db.execute(select(Card))
        cards = result.scalars().all()

        print(f"Found {len(cards)} cards to re-encrypt")

        success_count = 0
        error_count = 0

        for card in cards:
            print(f"\nProcessing card {card.id} (masked: {card.card_number_masked})")

            try:
                # Fetch full card details from AccountPE
                card_details = await accountpe.get_virtual_card_details(card.provider_card_id)

                if card_details.get("status") != 200:
                    print(f"  ERROR: AccountPE returned status {card_details.get('status')}: {card_details.get('message')}")
                    error_count += 1
                    continue

                # Get card data from response
                data = card_details.get("data", {})
                card_list = data.get("card_list", [])

                if not card_list:
                    print(f"  ERROR: No card data in AccountPE response")
                    error_count += 1
                    continue

                card_data = card_list[0]
                card_number = card_data.get("card_number")

                if not card_number:
                    print(f"  ERROR: Missing card_number in AccountPE response")
                    error_count += 1
                    continue

                # Re-encrypt with current key (CVV is no longer stored — PCI DSS)
                encrypted_card_number = encrypt_field(card_number)

                # Update database
                card.card_number_full_encrypted = encrypted_card_number

                await db.commit()

                print(f"  SUCCESS: Re-encrypted card {card.id}")
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
