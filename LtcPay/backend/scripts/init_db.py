#!/usr/bin/env python3
"""
LtcPay - Database initialization script.

Creates all tables and optionally seeds with demo data.

Usage:
    python scripts/init_db.py [--seed]
"""
import asyncio
import argparse
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, Base, async_session


async def create_tables():
    """Create all database tables."""
    # Import all models so they register with Base.metadata
    from app.models.transaction import Transaction  # noqa: F401
    from app.models.merchant import Merchant  # noqa: F401
    from app.models.payment import Payment  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] All tables created successfully.")


async def seed_demo_data():
    """Insert demo merchant for testing."""
    from app.models.merchant import Merchant

    async with async_session() as session:
        from sqlalchemy import select

        result = await session.execute(
            select(Merchant).where(Merchant.email == "demo@ltcpay.com")
        )
        if result.scalar_one_or_none():
            print("[SKIP] Demo merchant already exists.")
            return

        merchant = Merchant(
            name="Demo Merchant",
            email="demo@ltcpay.com",
            website="https://demo.ltcpay.com",
            webhook_url="https://demo.ltcpay.com/webhook",
            is_test_mode=True,
        )
        session.add(merchant)
        await session.commit()
        await session.refresh(merchant)

        print("[OK] Demo merchant created:")
        print(f"     Name:           {merchant.name}")
        print(f"     Email:          {merchant.email}")
        print(f"     API Key:        {merchant.api_key}")
        print(f"     API Secret:     {merchant.api_secret}")
        print(f"     Webhook Secret: {merchant.webhook_secret}")


async def main(seed: bool = False):
    print("=" * 50)
    print("LtcPay - Database Initialization")
    print("=" * 50)

    await create_tables()

    if seed:
        print()
        print("Seeding demo data...")
        await seed_demo_data()

    print()
    print("[DONE] Database initialization complete.")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize LtcPay database")
    parser.add_argument(
        "--seed",
        action="store_true",
        help="Seed the database with demo merchant data",
    )
    args = parser.parse_args()
    asyncio.run(main(seed=args.seed))
