"""Strip credentials out of log records.

TouchPay's Direct API takes the agent login and password as URL query
parameters — there is no header form — so httpx's own request log line
("HTTP Request: PUT https://.../transaction?loginAgent=...&passwordAgent=...")
printed the live production password on every single payment. Anyone able
to read container logs (Dokploy, `docker logs`, any log shipper) could read
it.

Redacting at the logging layer rather than dropping httpx's INFO lines
keeps those lines useful — they are how merchant webhook deliveries and
provider round-trips get verified — and it covers any future caller that
puts a secret in a URL, instead of only the one we know about today.
"""
import logging
import re

# Query-string credentials. The value stops at & or whitespace so the rest
# of the URL survives; the key is kept so the line still reads naturally.
_SECRET_PARAM = re.compile(
    r"((?:passwordAgent|loginAgent|password|passwd|secret|api[-_]?key|apikey"
    r"|access[-_]?token|token|client[-_]?secret|consumer[-_]?secret)=)"
    r"[^&\s\"'<>]+",
    re.IGNORECASE,
)

_REPLACEMENT = r"\1***"


def redact(text: str) -> str:
    """Replace query-string credential values with ***."""
    return _SECRET_PARAM.sub(_REPLACEMENT, text)


class SecretRedactingFilter(logging.Filter):
    """Redact credentials in a record's message and its interpolation args.

    httpx passes the URL as a %s argument rather than baking it into the
    message, so both have to be scrubbed — redacting only record.msg would
    silently miss the case this filter exists for.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # Only rewrite the message when it is the final text. With args it is
        # a format string — "updated (token=%s)" would lose its %s to the
        # redaction and every later argument would then be unconvertible.
        # Format strings are code; secrets only ever live in the arguments.
        if not record.args and isinstance(record.msg, str) and "=" in record.msg:
            record.msg = redact(record.msg)

        args = record.args
        if isinstance(args, tuple):
            record.args = tuple(
                redact(a) if isinstance(a, str) and "=" in a else a for a in args
            )
        elif isinstance(args, dict):
            record.args = {
                key: redact(value) if isinstance(value, str) and "=" in value else value
                for key, value in args.items()
            }
        return True  # never drop the record, only rewrite it


def install(logger: logging.Logger | None = None) -> None:
    """Attach the filter to every handler of the root logger.

    Handlers, not the logger: a filter on a logger only sees records logged
    through that logger, so records propagating up from httpx, uvicorn or
    any library logger would bypass it.
    """
    root = logger or logging.getLogger()
    for handler in root.handlers:
        if not any(isinstance(f, SecretRedactingFilter) for f in handler.filters):
            handler.addFilter(SecretRedactingFilter())
