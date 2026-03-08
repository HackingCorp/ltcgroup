"""
Data migration script: Encrypt existing plaintext id_proof_no values.

Run after applying alembic migration 005_gdpr_compliance.
Usage: docker exec ltc-backend python -m scripts.encrypt_existing_id_proof

This script:
1. Finds all users with a non-null id_proof_no
2. Attempts to decrypt each value (to skip already-encrypted values)
3. Encrypts plaintext values using Fernet (same key as card encryption)
"""
import asyncio
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, update
from app.database import async_session
from app.models.user import User
from app.utils.encryption import encrypt_field, decrypt_field


async def migrate_id_proof_no():
    async with async_session() as db:
        result = await db.execute(
            select(User.id, User.id_proof_no).where(User.id_proof_no.isnot(None))
        )
        rows = result.all()

        encrypted_count = 0
        skipped_count = 0

        for user_id, id_proof_no in rows:
            if not id_proof_no:
                continue

            # Check if already encrypted by trying to decrypt
            try:
                decrypt_field(id_proof_no)
                # If decryption succeeds, it's already encrypted
                skipped_count += 1
                continue
            except Exception:
                # Not encrypted yet, proceed to encrypt
                pass

            encrypted_value = encrypt_field(id_proof_no)
            await db.execute(
                update(User)
                .where(User.id == user_id)
                .values(id_proof_no=encrypted_value)
            )
            encrypted_count += 1

        await db.commit()
        print(f"Encrypted {encrypted_count} id_proof_no values, skipped {skipped_count} already-encrypted.")


if __name__ == "__main__":
    asyncio.run(migrate_id_proof_no())
