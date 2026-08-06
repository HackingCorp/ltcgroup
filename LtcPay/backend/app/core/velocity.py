"""
Payment velocity limits (anti-spam / anti-enumeration).

Counters live in Redis (same instance as the cache service). If Redis is
unavailable the checks fail open: legitimate payments must never be blocked
by an infrastructure outage.
"""

import logging

from redis.exceptions import RedisError

from app.core.cache import cache

logger = logging.getLogger(__name__)

# Max payin initiations per phone number within the window
PHONE_MAX_ATTEMPTS = 5
PHONE_WINDOW_SECONDS = 30 * 60

# Failure-spike alerting: log an ERROR (picked up by Sentry) when more than
# ALERT_FAILURE_THRESHOLD payments fail within ALERT_WINDOW_SECONDS.
ALERT_FAILURE_THRESHOLD = 20
ALERT_WINDOW_SECONDS = 10 * 60


class PaymentVelocityError(Exception):
    """Raised when a phone number exceeds the allowed payment attempts."""

    def __init__(self, phone: str, retry_after: int):
        self.phone = phone
        self.retry_after = retry_after
        super().__init__(
            f"Too many payment attempts for {phone}, retry in {retry_after}s"
        )


def check_phone_velocity(normalized_phone: str) -> None:
    """Increment the attempt counter for a phone and raise if over the limit."""
    redis = cache.redis
    if not redis or not normalized_phone:
        return

    key = f"velocity:phone:{normalized_phone}"
    try:
        count = redis.incr(key)
        if count == 1:
            redis.expire(key, PHONE_WINDOW_SECONDS)
        if count > PHONE_MAX_ATTEMPTS:
            ttl = redis.ttl(key)
            retry_after = ttl if ttl and ttl > 0 else PHONE_WINDOW_SECONDS
            logger.warning(
                "Velocity limit hit: phone=%s attempts=%s window=%ss",
                normalized_phone, count, PHONE_WINDOW_SECONDS,
            )
            raise PaymentVelocityError(normalized_phone, retry_after)
    except RedisError as exc:
        logger.warning("Velocity check unavailable (Redis error): %s", exc)


def record_payment_failure(reference: str) -> None:
    """Count a payment failure and emit an ERROR once per window on a spike.

    The ERROR log is forwarded to Sentry (logging integration), which serves
    as the admin alert channel.
    """
    redis = cache.redis
    if not redis:
        return

    try:
        key = "velocity:failures"
        count = redis.incr(key)
        if count == 1:
            redis.expire(key, ALERT_WINDOW_SECONDS)
        if count >= ALERT_FAILURE_THRESHOLD and redis.set(
            "velocity:failures:alerted", "1", nx=True, ex=ALERT_WINDOW_SECONDS
        ):
            logger.error(
                "ALERT: %s payment failures in the last %s min (latest: %s) — "
                "possible operator outage or abuse; check /dashboard/failures",
                count, ALERT_WINDOW_SECONDS // 60, reference,
            )
    except RedisError as exc:
        logger.warning("Failure counter unavailable (Redis error): %s", exc)
