"""
Redis cache service for performance optimization.

Used to cache frequently accessed data:
- Merchant profiles
- Payment statistics
- Dashboard metrics
"""

import json
import logging
from typing import Any, Optional
from functools import wraps

from redis import Redis
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Redis cache wrapper with error handling."""

    def __init__(self):
        self._redis: Optional[Redis] = None
        self._enabled = bool(settings.redis_url)

    @property
    def redis(self) -> Optional[Redis]:
        """Lazy redis connection."""
        if not self._enabled:
            return None

        if self._redis is None:
            try:
                self._redis = Redis.from_url(
                    settings.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=5,
                )
                # Test connection
                self._redis.ping()
                logger.info("Redis cache connected successfully")
            except RedisError as e:
                logger.error(f"Redis connection failed: {e}")
                self._redis = None
                self._enabled = False

        return self._redis

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.redis:
            return None

        try:
            value = self.redis.get(key)
            if value:
                return json.loads(value)
        except (RedisError, json.JSONDecodeError) as e:
            logger.warning(f"Cache get failed for key {key}: {e}")

        return None

    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """
        Set value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache (must be JSON-serializable)
            ttl: Time to live in seconds (default: 5 minutes)

        Returns:
            True if successful, False otherwise
        """
        if not self.redis:
            return False

        try:
            serialized = json.dumps(value)
            self.redis.setex(key, ttl, serialized)
            return True
        except (RedisError, TypeError, ValueError) as e:
            logger.warning(f"Cache set failed for key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete value from cache."""
        if not self.redis:
            return False

        try:
            self.redis.delete(key)
            return True
        except RedisError as e:
            logger.warning(f"Cache delete failed for key {key}: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.

        Args:
            pattern: Redis pattern (e.g., "merchant:*")

        Returns:
            Number of keys deleted
        """
        if not self.redis:
            return 0

        try:
            keys = self.redis.keys(pattern)
            if keys:
                return self.redis.delete(*keys)
        except RedisError as e:
            logger.warning(f"Cache delete pattern failed for {pattern}: {e}")

        return 0

    def clear_merchant_cache(self, merchant_id: str) -> None:
        """Clear all cache entries for a merchant."""
        self.delete_pattern(f"merchant:{merchant_id}:*")


# Global cache instance
cache = CacheService()


def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results.

    Args:
        ttl: Cache TTL in seconds (default: 5 minutes)
        key_prefix: Optional prefix for cache key

    Example:
        @cached(ttl=60, key_prefix="stats")
        async def get_merchant_stats(merchant_id: str):
            # expensive computation
            return stats
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and args
            cache_key_parts = [key_prefix or func.__name__]

            # Add args to key (simple string conversion)
            for arg in args:
                if isinstance(arg, (str, int)):
                    cache_key_parts.append(str(arg))

            # Add kwargs to key
            for k, v in sorted(kwargs.items()):
                if isinstance(v, (str, int)):
                    cache_key_parts.append(f"{k}={v}")

            cache_key = ":".join(cache_key_parts)

            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached_value

            # Execute function and cache result
            logger.debug(f"Cache miss: {cache_key}")
            result = await func(*args, **kwargs)

            # Cache the result
            cache.set(cache_key, result, ttl=ttl)

            return result

        return wrapper

    return decorator
