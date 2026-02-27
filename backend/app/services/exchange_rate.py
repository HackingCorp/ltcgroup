"""
Exchange Rate Service — USD to local currency conversion with Redis cache.

Primary API: https://open.er-api.com/v6/latest/USD (free, no key)
Fallback API: https://api.exchangerate-api.com/v4/latest/USD
Cache: Redis key `exchange_rates:usd`, TTL 1 hour
Markup: 8% on top-up conversions (not on withdrawals)
"""

import json
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

import httpx
import redis.asyncio as aioredis

from app.utils.logging_config import get_logger

logger = get_logger(__name__)

CACHE_KEY = "exchange_rates:usd"
CACHE_TTL = 3600  # 1 hour
TOPUP_MARKUP = Decimal("0.08")  # 8%

PRIMARY_URL = "https://open.er-api.com/v6/latest/USD"
FALLBACK_URL = "https://api.exchangerate-api.com/v4/latest/USD"


class ExchangeRateService:
    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None
        self._client = httpx.AsyncClient(timeout=15.0)
        self._rates: dict[str, float] = {}

    def set_redis(self, redis_client: Optional[aioredis.Redis]):
        self._redis = redis_client

    async def close(self):
        await self._client.aclose()

    async def _fetch_from_api(self) -> dict[str, float]:
        """Fetch rates from primary API, fall back to secondary."""
        for url in [PRIMARY_URL, FALLBACK_URL]:
            try:
                resp = await self._client.get(url)
                resp.raise_for_status()
                data = resp.json()
                rates = data.get("rates", {})
                if rates:
                    logger.info(f"Exchange rates fetched from {url} ({len(rates)} currencies)")
                    return rates
            except Exception as e:
                logger.warning(f"Exchange rate fetch failed from {url}: {e}")
        return {}

    async def _get_rates(self) -> dict[str, float]:
        """Get rates from cache or API."""
        # Try Redis cache first
        if self._redis:
            try:
                cached = await self._redis.get(CACHE_KEY)
                if cached:
                    self._rates = json.loads(cached)
                    return self._rates
            except Exception as e:
                logger.warning(f"Redis cache read failed: {e}")

        # Try in-memory cache
        if self._rates:
            return self._rates

        # Fetch fresh rates
        rates = await self._fetch_from_api()
        if rates:
            self._rates = rates
            # Cache in Redis
            if self._redis:
                try:
                    await self._redis.set(CACHE_KEY, json.dumps(rates), ex=CACHE_TTL)
                except Exception as e:
                    logger.warning(f"Redis cache write failed: {e}")
        return self._rates

    async def get_rate(self, currency: str) -> Decimal:
        """Get real exchange rate USD -> local (e.g. 1 USD = 600 XAF)."""
        rates = await self._get_rates()
        rate = rates.get(currency.upper())
        if rate is None:
            raise ValueError(f"Exchange rate not available for {currency}")
        return Decimal(str(rate))

    async def get_topup_rate(self, currency: str) -> Decimal:
        """Get top-up rate with 8% markup.

        The markup makes 1 USD cost MORE local currency for the user.
        E.g. real rate 600 XAF/USD -> topup rate 648 XAF/USD.
        """
        real_rate = await self.get_rate(currency)
        return (real_rate * (1 + TOPUP_MARKUP)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    async def usd_to_local(self, amount_usd: Decimal, currency: str, with_markup: bool = False) -> Decimal:
        """Convert USD amount to local currency."""
        rate = await self.get_topup_rate(currency) if with_markup else await self.get_rate(currency)
        return (amount_usd * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    async def local_to_usd(self, amount_local: Decimal, currency: str, with_markup: bool = False) -> Decimal:
        """Convert local currency amount to USD."""
        rate = await self.get_topup_rate(currency) if with_markup else await self.get_rate(currency)
        if rate == 0:
            raise ValueError(f"Invalid exchange rate for {currency}")
        return (amount_local / rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# Singleton
exchange_rate_service = ExchangeRateService()
