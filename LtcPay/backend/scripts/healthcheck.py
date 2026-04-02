#!/usr/bin/env python3
"""
LtcPay - Health check script.

Checks the status of the API server, database, and Redis connections.

Usage:
    python scripts/healthcheck.py [--base-url http://localhost:8001]
"""
import argparse
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx


async def check_api(base_url: str) -> bool:
    """Check if the API server is responding."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{base_url}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"  API Server:  OK ({data.get('status', 'unknown')})")
                return True
            print(f"  API Server:  FAIL (HTTP {response.status_code})")
            return False
    except httpx.ConnectError:
        print(f"  API Server:  FAIL (connection refused at {base_url})")
        return False
    except Exception as e:
        print(f"  API Server:  FAIL ({e})")
        return False


async def check_database() -> bool:
    """Check database connectivity."""
    try:
        from app.core.database import engine
        from sqlalchemy import text

        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.scalar()
        print("  Database:    OK")
        await engine.dispose()
        return True
    except Exception as e:
        print(f"  Database:    FAIL ({e})")
        return False


async def check_redis() -> bool:
    """Check Redis connectivity."""
    try:
        from app.core.config import settings
        import redis.asyncio as aioredis

        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        await r.ping()
        await r.aclose()
        print("  Redis:       OK")
        return True
    except Exception as e:
        print(f"  Redis:       FAIL ({e})")
        return False


async def main(base_url: str):
    print("=" * 50)
    print("LtcPay - Health Check")
    print("=" * 50)
    print()

    results = await asyncio.gather(
        check_api(base_url),
        check_database(),
        check_redis(),
        return_exceptions=True,
    )

    all_ok = all(r is True for r in results)

    print()
    if all_ok:
        print("[OK] All services are healthy.")
    else:
        print("[WARN] Some services are not responding.")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LtcPay Health Check")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8001",
        help="API server base URL (default: http://localhost:8001)",
    )
    args = parser.parse_args()
    asyncio.run(main(base_url=args.base_url))
