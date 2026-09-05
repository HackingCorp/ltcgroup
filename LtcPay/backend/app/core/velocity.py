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

# TouchPay refuses "une operation similaire" sent less than 5 minutes after
# the previous one for the same recipient. Customers hit this constantly by
# retrying immediately after a failed payment (9 times over 2026-08-19..22),
# and the call is wasted: we mirror the window locally so the checkout can
# say how long is left instead of firing a request that cannot succeed.
DUPLICATE_WINDOW_SECONDS = 5 * 60


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


# Placeholder value for a window opened before we know the outcome.
_WINDOW_OPEN = "1"


def format_delay(seconds: int) -> str:
    """Human French delay: '3 min 32 s' / '45 secondes'."""
    minutes, secs = divmod(max(int(seconds), 0), 60)
    return f"{minutes} min {secs:02d} s" if minutes else f"{secs} secondes"


def velocity_lockout_message(retry_after: int) -> str:
    """Customer-facing message for the per-phone attempt cap."""
    return (
        "Trop de tentatives de paiement pour ce numero. "
        f"Reessayez dans {format_delay(retry_after)}."
    )


def _duplicate_key(operator: str, normalized_phone: str, amount: int) -> str:
    return f"velocity:dup:{operator}:{normalized_phone}:{amount}"


def duplicate_payin_status(
    operator: str, normalized_phone: str, amount: int,
) -> tuple[int, str | None]:
    """Seconds left before this exact payin may be retried, and why it failed.

    Returns (0, None) when the window is closed. The second item is the
    previous attempt's rejection message when we know it — that is the thing
    the customer actually needs to hear, not "operation similaire".

    Fails open: with Redis down we let the request through and TouchPay's own
    guard remains the backstop.
    """
    redis = cache.redis
    if not redis or not normalized_phone:
        return 0, None

    key = _duplicate_key(operator, normalized_phone, amount)
    try:
        ttl = redis.ttl(key)
        if not ttl or ttl <= 0:
            return 0, None
        reason = redis.get(key)
    except RedisError as exc:
        logger.warning("Duplicate check unavailable (Redis error): %s", exc)
        return 0, None

    return ttl, (reason if reason and reason != _WINDOW_OPEN else None)


def record_payin_attempt(operator: str, normalized_phone: str, amount: int) -> None:
    """Open the 5-minute duplicate window for this recipient/amount.

    Called before the request leaves, not after it succeeds: TouchPay opens
    its own window on the attempt itself. Orange in particular rejects
    "solde insuffisant" synchronously with HTTP 300 and still refuses the
    next try for five minutes.
    """
    redis = cache.redis
    if not redis or not normalized_phone:
        return

    try:
        redis.set(
            _duplicate_key(operator, normalized_phone, amount),
            _WINDOW_OPEN,
            ex=DUPLICATE_WINDOW_SECONDS,
        )
    except RedisError as exc:
        logger.warning("Duplicate window not recorded (Redis error): %s", exc)


def clear_payin_attempt(operator: str, normalized_phone: str, amount: int) -> None:
    """Close the duplicate window: the operator never saw this attempt.

    The window is opened before the request leaves, because TouchPay opens
    its own on the attempt itself. But when the call fails *without* the
    operator registering anything — our own pre-flight refusals, a transport
    error, a TouchPay outage — there is no duplicate to protect against, and
    holding the window for five minutes only blocks a legitimate retry.
    Measured on 2026-09-05: 7 of 15 duplicate refusals in 24 h were of this
    kind, i.e. payments the provider would have accepted.
    """
    redis = cache.redis
    if not redis or not normalized_phone:
        return
    try:
        redis.delete(_duplicate_key(operator, normalized_phone, amount))
    except RedisError as exc:
        logger.warning("Duplicate window not cleared (Redis error): %s", exc)


def annotate_payin_attempt(
    operator: str, normalized_phone: str, amount: int, reason: str,
) -> None:
    """Attach the rejection message to an already-open window, keeping its TTL."""
    redis = cache.redis
    if not redis or not normalized_phone:
        return

    try:
        redis.set(
            _duplicate_key(operator, normalized_phone, amount),
            reason,
            xx=True,
            keepttl=True,
        )
    except RedisError as exc:
        logger.warning("Duplicate window not annotated (Redis error): %s", exc)


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
