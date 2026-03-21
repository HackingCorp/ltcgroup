from app.config import settings
from app.utils.logging_config import get_logger

logger = get_logger(__name__)

_posthog = None
_enabled = False


def _init():
    global _posthog, _enabled
    if _posthog is not None or _enabled:
        return
    if not settings.posthog_api_key:
        logger.info("PostHog disabled: POSTHOG_API_KEY not set")
        return
    try:
        import posthog
        posthog.api_key = settings.posthog_api_key
        posthog.host = settings.posthog_host
        _posthog = posthog
        _enabled = True
        logger.info("PostHog initialized (host=%s)", settings.posthog_host)
    except Exception as e:
        logger.warning("Failed to initialize PostHog: %s", e)


def capture(user_id: str, event: str, properties: dict | None = None):
    _init()
    if not _enabled:
        return
    try:
        _posthog.capture(str(user_id), event, properties=properties or {})
    except Exception as e:
        logger.warning("PostHog capture failed: %s", e)


def identify(user_id: str, properties: dict | None = None):
    _init()
    if not _enabled:
        return
    try:
        _posthog.identify(str(user_id), properties=properties or {})
    except Exception as e:
        logger.warning("PostHog identify failed: %s", e)


def shutdown():
    global _posthog, _enabled
    if _enabled and _posthog:
        try:
            _posthog.shutdown()
            logger.info("PostHog flushed and shut down")
        except Exception as e:
            logger.warning("PostHog shutdown failed: %s", e)
    _posthog = None
    _enabled = False
