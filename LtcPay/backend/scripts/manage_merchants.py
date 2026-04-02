#!/usr/bin/env python3
"""
LtcPay - Merchant management CLI.

Create, list, activate/deactivate merchants from the command line.

Usage:
    python scripts/manage_merchants.py create --name "Acme" --email "acme@example.com"
    python scripts/manage_merchants.py list
    python scripts/manage_merchants.py deactivate --email "acme@example.com"
    python scripts/manage_merchants.py rotate-keys --email "acme@example.com"
"""
import asyncio
import argparse
import secrets
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import engine, async_session
from app.core.security import hash_api_secret, generate_api_secret
from app.models.merchant import Merchant, generate_api_key_live, generate_api_key_test


async def create_merchant(name: str, email: str, website: str = None, callback_url: str = None):
    """Create a new merchant."""
    async with async_session() as session:
        existing = await session.execute(
            select(Merchant).where(Merchant.email == email)
        )
        if existing.scalar_one_or_none():
            print(f"[ERROR] Merchant with email '{email}' already exists.")
            return

        raw_secret = generate_api_secret()
        hashed_secret = hash_api_secret(raw_secret)

        merchant = Merchant(
            name=name,
            email=email,
            website=website,
            callback_url=callback_url,
            api_secret_hash=hashed_secret,
        )
        session.add(merchant)
        await session.commit()
        await session.refresh(merchant)

        print("[OK] Merchant created:")
        print(f"     ID:             {merchant.id}")
        print(f"     Name:           {merchant.name}")
        print(f"     Email:          {merchant.email}")
        print(f"     API Key (live): {merchant.api_key_live}")
        print(f"     API Key (test): {merchant.api_key_test}")
        print(f"     API Secret:     {raw_secret}")
        print(f"     Webhook Secret: {merchant.webhook_secret}")
        print(f"     Test Mode:      {merchant.is_test_mode}")
        print()
        print("     ** Store the API Secret securely. It cannot be retrieved again. **")


async def list_merchants():
    """List all merchants."""
    async with async_session() as session:
        result = await session.execute(
            select(Merchant).order_by(Merchant.created_at.desc())
        )
        merchants = result.scalars().all()

        if not merchants:
            print("No merchants found.")
            return

        print(f"{'Name':<25} {'Email':<30} {'Active':<8} {'Test':<6} {'API Key (prefix)':<25}")
        print("-" * 95)
        for m in merchants:
            active_key = m.api_key_test if m.is_test_mode else m.api_key_live
            print(
                f"{m.name:<25} {m.email:<30} "
                f"{'Yes' if m.is_active else 'No':<8} "
                f"{'Yes' if m.is_test_mode else 'No':<6} "
                f"{active_key[:20]}..."
            )


async def deactivate_merchant(email: str):
    """Deactivate a merchant."""
    async with async_session() as session:
        result = await session.execute(
            select(Merchant).where(Merchant.email == email)
        )
        merchant = result.scalar_one_or_none()
        if not merchant:
            print(f"[ERROR] Merchant with email '{email}' not found.")
            return

        merchant.is_active = False
        await session.commit()
        print(f"[OK] Merchant '{merchant.name}' deactivated.")


async def activate_merchant(email: str):
    """Activate a merchant."""
    async with async_session() as session:
        result = await session.execute(
            select(Merchant).where(Merchant.email == email)
        )
        merchant = result.scalar_one_or_none()
        if not merchant:
            print(f"[ERROR] Merchant with email '{email}' not found.")
            return

        merchant.is_active = True
        await session.commit()
        print(f"[OK] Merchant '{merchant.name}' activated.")


async def rotate_keys(email: str):
    """Rotate API credentials for a merchant."""
    async with async_session() as session:
        result = await session.execute(
            select(Merchant).where(Merchant.email == email)
        )
        merchant = result.scalar_one_or_none()
        if not merchant:
            print(f"[ERROR] Merchant with email '{email}' not found.")
            return

        raw_secret = generate_api_secret()
        merchant.api_key_live = generate_api_key_live()
        merchant.api_key_test = generate_api_key_test()
        merchant.api_secret_hash = hash_api_secret(raw_secret)
        merchant.webhook_secret = secrets.token_hex(32)
        await session.commit()
        await session.refresh(merchant)

        print(f"[OK] Keys rotated for '{merchant.name}':")
        print(f"     New API Key (live): {merchant.api_key_live}")
        print(f"     New API Key (test): {merchant.api_key_test}")
        print(f"     New API Secret:     {raw_secret}")
        print(f"     New Webhook Secret: {merchant.webhook_secret}")
        print()
        print("     ** Store the API Secret securely. It cannot be retrieved again. **")


async def main():
    parser = argparse.ArgumentParser(description="LtcPay Merchant Management")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # create
    create_parser = subparsers.add_parser("create", help="Create a new merchant")
    create_parser.add_argument("--name", required=True, help="Merchant name")
    create_parser.add_argument("--email", required=True, help="Merchant email")
    create_parser.add_argument("--website", help="Merchant website URL")
    create_parser.add_argument("--callback-url", help="Payment callback URL")

    # list
    subparsers.add_parser("list", help="List all merchants")

    # deactivate
    deact_parser = subparsers.add_parser("deactivate", help="Deactivate a merchant")
    deact_parser.add_argument("--email", required=True, help="Merchant email")

    # activate
    act_parser = subparsers.add_parser("activate", help="Activate a merchant")
    act_parser.add_argument("--email", required=True, help="Merchant email")

    # rotate-keys
    rotate_parser = subparsers.add_parser("rotate-keys", help="Rotate merchant API keys")
    rotate_parser.add_argument("--email", required=True, help="Merchant email")

    args = parser.parse_args()

    if args.command == "create":
        await create_merchant(
            name=args.name,
            email=args.email,
            website=args.website,
            callback_url=args.callback_url,
        )
    elif args.command == "list":
        await list_merchants()
    elif args.command == "deactivate":
        await deactivate_merchant(args.email)
    elif args.command == "activate":
        await activate_merchant(args.email)
    elif args.command == "rotate-keys":
        await rotate_keys(args.email)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
