"""
Merchant credential verification must not stall the gateway.

bcrypt at cost 12 burns ~235 ms of CPU. It used to run inline in the request
coroutine, and uvicorn serves LtcPay from a single worker: the whole gateway
could handle about four authenticated requests a second, whatever the load.
Seen on 2026-09-21, while a neighbouring container held every core, that
ceiling surfaced as 502s from the proxy on roughly one payment creation in
ten — the request never reached the application at all.
"""
import asyncio
import time

import pytest

from app.core.security import (
    hash_api_secret,
    verify_api_secret,
    verify_api_secret_async,
    _SECRET_CACHE,
)


@pytest.fixture(autouse=True)
def _clear_cache():
    _SECRET_CACHE.clear()
    yield
    _SECRET_CACHE.clear()


class TestCredentialVerification:

    SECRET = "ltcpay_secret_a_perfectly_ordinary_value"

    @pytest.fixture(scope="class")
    def hashed(self):
        return hash_api_secret(self.SECRET)

    async def test_a_good_secret_is_accepted(self, hashed):
        assert await verify_api_secret_async(self.SECRET, hashed) is True

    async def test_a_wrong_secret_is_refused(self, hashed):
        assert await verify_api_secret_async(self.SECRET + "x", hashed) is False

    async def test_the_event_loop_keeps_running_during_the_hash(self, hashed):
        """The whole point: other requests must progress while bcrypt works."""
        ticks = 0

        async def heartbeat():
            nonlocal ticks
            while True:
                await asyncio.sleep(0.005)
                ticks += 1

        beat = asyncio.create_task(heartbeat())
        await asyncio.sleep(0)  # let the heartbeat reach its first await
        await verify_api_secret_async(self.SECRET + "wrong", hashed)  # never cached
        beat.cancel()

        assert ticks > 0, "the event loop was frozen for the duration of bcrypt"

    async def test_concurrent_checks_do_not_serialise(self, hashed):
        started = time.perf_counter()
        results = await asyncio.gather(
            *[verify_api_secret_async(self.SECRET + str(i), hashed) for i in range(4)]
        )
        elapsed = time.perf_counter() - started

        assert not any(results)
        single = time.perf_counter()
        verify_api_secret(self.SECRET + "z", hashed)
        single = time.perf_counter() - single
        assert elapsed < single * 4, "four checks took as long as running them in series"

    async def test_a_repeat_check_is_served_from_cache(self, hashed):
        await verify_api_secret_async(self.SECRET, hashed)

        started = time.perf_counter()
        assert await verify_api_secret_async(self.SECRET, hashed) is True
        assert (time.perf_counter() - started) < 0.01, "the second check re-ran bcrypt"

    async def test_a_wrong_secret_is_never_cached(self, hashed):
        """Otherwise a near-miss would be remembered as a success."""
        await verify_api_secret_async(self.SECRET + "no", hashed)
        assert _SECRET_CACHE == {}

    async def test_the_cache_does_not_confuse_two_merchants(self):
        """Same secret, different account: the hash is part of the key."""
        shared = "identical_secret_value"
        first, second = hash_api_secret(shared), hash_api_secret(shared + "!")

        assert await verify_api_secret_async(shared, first) is True
        assert await verify_api_secret_async(shared, second) is False

    async def test_the_cache_stays_bounded(self, hashed):
        from app.core.security import _SECRET_CACHE_MAX

        for i in range(_SECRET_CACHE_MAX + 20):
            _SECRET_CACHE[("k", str(i))] = time.monotonic()
        await verify_api_secret_async(self.SECRET, hashed)

        assert len(_SECRET_CACHE) <= _SECRET_CACHE_MAX
