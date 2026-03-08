"""Redis caching utilities for AccountPE API responses and user profiles."""

import json
from typing import Any

import redis.asyncio as aioredis

from app.config import settings
from app.utils.logging_config import get_logger

logger = get_logger(__name__)

# Module-level Redis client, set during app startup
_redis: aioredis.Redis | None = None


def set_cache_redis(redis_client: aioredis.Redis | None) -> None:
    """Set the Redis client used for caching. Called from lifespan."""
    global _redis
    _redis = redis_client


def get_cache_redis() -> aioredis.Redis | None:
    return _redis


# ---------------------------------------------------------------------------
# AccountPE cache
# ---------------------------------------------------------------------------

_ACCOUNTPE_CARD_DETAILS_PREFIX = "accountpe:card:details:"
_ACCOUNTPE_CARD_TRANSACTIONS_PREFIX = "accountpe:card:txns:"
_ACCOUNTPE_TTL = 30  # seconds


async def get_cached_card_details(card_id: str) -> dict | None:
    """Return cached AccountPE card details or None."""
    if _redis is None:
        return None
    try:
        raw = await _redis.get(f"{_ACCOUNTPE_CARD_DETAILS_PREFIX}{card_id}")
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.debug(f"Cache read error (card details {card_id}): {e}")
    return None


async def set_cached_card_details(card_id: str, data: dict) -> None:
    """Cache AccountPE card details with TTL."""
    if _redis is None:
        return
    try:
        await _redis.setex(
            f"{_ACCOUNTPE_CARD_DETAILS_PREFIX}{card_id}",
            _ACCOUNTPE_TTL,
            json.dumps(data),
        )
    except Exception as e:
        logger.debug(f"Cache write error (card details {card_id}): {e}")


async def get_cached_card_transactions(card_id: str) -> dict | None:
    """Return cached AccountPE card transactions or None."""
    if _redis is None:
        return None
    try:
        raw = await _redis.get(f"{_ACCOUNTPE_CARD_TRANSACTIONS_PREFIX}{card_id}")
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.debug(f"Cache read error (card txns {card_id}): {e}")
    return None


async def set_cached_card_transactions(card_id: str, data: dict) -> None:
    """Cache AccountPE card transactions with TTL."""
    if _redis is None:
        return
    try:
        await _redis.setex(
            f"{_ACCOUNTPE_CARD_TRANSACTIONS_PREFIX}{card_id}",
            _ACCOUNTPE_TTL,
            json.dumps(data),
        )
    except Exception as e:
        logger.debug(f"Cache write error (card txns {card_id}): {e}")


async def invalidate_card_cache(card_id: str) -> None:
    """Invalidate all cached data for a card (after mutations like freeze/unfreeze/topup)."""
    if _redis is None:
        return
    try:
        await _redis.delete(
            f"{_ACCOUNTPE_CARD_DETAILS_PREFIX}{card_id}",
            f"{_ACCOUNTPE_CARD_TRANSACTIONS_PREFIX}{card_id}",
        )
    except Exception as e:
        logger.debug(f"Cache invalidation error (card {card_id}): {e}")


# ---------------------------------------------------------------------------
# User profile cache
# ---------------------------------------------------------------------------

_USER_PROFILE_PREFIX = "user:profile:"
_USER_PROFILE_TTL = 30  # seconds


async def get_cached_user(user_id: str) -> dict | None:
    """Return cached user profile dict or None."""
    if _redis is None:
        return None
    try:
        raw = await _redis.get(f"{_USER_PROFILE_PREFIX}{user_id}")
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.debug(f"Cache read error (user {user_id}): {e}")
    return None


async def set_cached_user(user_id: str, data: dict) -> None:
    """Cache user profile with TTL."""
    if _redis is None:
        return
    try:
        await _redis.setex(
            f"{_USER_PROFILE_PREFIX}{user_id}",
            _USER_PROFILE_TTL,
            json.dumps(data),
        )
    except Exception as e:
        logger.debug(f"Cache write error (user {user_id}): {e}")


async def invalidate_user_cache(user_id: str) -> None:
    """Invalidate cached user profile (after profile update, password change)."""
    if _redis is None:
        return
    try:
        await _redis.delete(f"{_USER_PROFILE_PREFIX}{user_id}")
    except Exception as e:
        logger.debug(f"Cache invalidation error (user {user_id}): {e}")
