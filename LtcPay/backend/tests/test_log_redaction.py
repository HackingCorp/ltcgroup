"""Credentials must never survive into a log line.

The case this exists for: TouchPay's Direct API takes the agent password as
a URL query parameter, and httpx logs the full URL at INFO on every request.
"""
import logging

from app.core.log_redaction import SecretRedactingFilter, install, redact

TOUCHPAY_URL = (
    "https://apidist.gutouch.net/apidist/sec/touchpayapi/LTCGR11789/transaction"
    "?loginAgent=913719226&passwordAgent=EZrcwCRmeY"
)


def _record(msg, args=None):
    return logging.LogRecord("x", logging.INFO, __file__, 1, msg, args, None)


def _rendered(msg, args=None):
    record = _record(msg, args)
    SecretRedactingFilter().filter(record)
    return record.getMessage()


# --------------------------------------------------------------------------
# The actual leak
# --------------------------------------------------------------------------

def test_touchpay_password_is_removed_from_the_httpx_request_line():
    # httpx passes the URL as a %s arg, not inside the message.
    out = _rendered('HTTP Request: %s %s "%s"', ("PUT", TOUCHPAY_URL, "HTTP/1.1 300"))
    assert "EZrcwCRmeY" not in out
    assert "passwordAgent=***" in out


def test_the_rest_of_the_url_survives_redaction():
    out = _rendered("HTTP Request: %s", (TOUCHPAY_URL,))
    assert "apidist.gutouch.net" in out
    assert "LTCGR11789" in out
    assert "/transaction" in out


def test_login_is_redacted_too():
    # The agent login is half of the Digest credential pair.
    out = _rendered("HTTP Request: %s", (TOUCHPAY_URL,))
    assert "913719226" not in out


def test_secret_inside_the_message_itself_is_redacted():
    assert "hunter2" not in _rendered(f"calling {TOUCHPAY_URL}")
    assert redact("url?password=hunter2") == "url?password=***"


def test_a_format_string_placeholder_is_never_eaten():
    # Regression: callbacks.py logs "... (token=%s, command=%s)". Redacting
    # the message would consume the first %s and every argument after it
    # would fail to convert, killing the request with a TypeError.
    out = _rendered(
        "Payment %s updated %s -> %s (token=%s, command=%s)",
        ("PAY-1", "PENDING", "FAILED", "", "PAY-1"),
    )
    assert out == "Payment PAY-1 updated PENDING -> FAILED (token=, command=PAY-1)"


def test_secret_in_dict_args_is_redacted():
    # logging wraps a mapping argument in a 1-tuple, then LogRecord unwraps
    # it — mirror that here rather than hand-building record.args.
    out = _rendered("%(url)s", ({"url": TOUCHPAY_URL},))
    assert "EZrcwCRmeY" not in out
    assert "apidist.gutouch.net" in out


# --------------------------------------------------------------------------
# Other credentials that travel in URLs here
# --------------------------------------------------------------------------

def test_accountpe_callback_token_is_redacted():
    out = redact("https://pay.ltcgroup.site/api/v1/callbacks/accountpe?token=abc123&outcome=success")
    assert "abc123" not in out
    assert "outcome=success" in out  # non-secret params must be readable


def test_common_credential_parameter_names_are_covered():
    for key in ("api_key", "apiKey", "secret", "access_token", "consumer_secret"):
        assert redact(f"https://x/y?{key}=SUPERSECRET") == f"https://x/y?{key}=***"


def test_redaction_stops_at_the_parameter_boundary():
    out = redact("https://x/y?password=abc&keep=this&also=that")
    assert out == "https://x/y?password=***&keep=this&also=that"


def test_case_insensitive():
    assert "abc" not in redact("?PASSWORDAGENT=abc")


# --------------------------------------------------------------------------
# The filter must not damage ordinary logging
# --------------------------------------------------------------------------

def test_records_are_never_dropped():
    assert SecretRedactingFilter().filter(_record("anything")) is True


def test_message_without_credentials_is_untouched():
    msg = "TouchPay Direct: HTTP 300 for ref=PAY-3433A41AF4E24354"
    assert _rendered(msg) == msg


def test_non_string_args_survive():
    out = _rendered("status=%d ref=%s", (300, "PAY-1"))
    assert out == "status=300 ref=PAY-1"


def test_no_args_is_safe():
    assert _rendered("plain message") == "plain message"


# --------------------------------------------------------------------------
# Installation
# --------------------------------------------------------------------------

def test_install_attaches_to_handlers_not_the_logger():
    # A filter on the logger would miss records propagating up from httpx.
    root = logging.Logger("probe")
    handler = logging.NullHandler()
    root.addHandler(handler)
    install(root)
    assert any(isinstance(f, SecretRedactingFilter) for f in handler.filters)
    assert not any(isinstance(f, SecretRedactingFilter) for f in root.filters)


def test_install_is_idempotent():
    root = logging.Logger("probe2")
    handler = logging.NullHandler()
    root.addHandler(handler)
    install(root)
    install(root)
    assert sum(isinstance(f, SecretRedactingFilter) for f in handler.filters) == 1


# --------------------------------------------------------------------------
# The factory must survive a later logging reconfiguration
# --------------------------------------------------------------------------
# The handler filter alone silently stopped working in production: uvicorn
# configures logging with dictConfig, which replaces the handlers our filter
# was attached to. 95 TouchPay agent passwords ended up in the logs while a
# freshly imported process reported the filter correctly installed.

def test_redaction_survives_dictconfig_replacing_the_handlers():
    import logging.config

    original_factory = logging.getLogRecordFactory()
    try:
        install()
        # Exactly what uvicorn does at startup: rebuild the handlers.
        logging.config.dictConfig({
            "version": 1,
            "disable_existing_loggers": False,
            "handlers": {"h": {"class": "logging.NullHandler"}},
            "root": {"handlers": ["h"], "level": "INFO"},
        })
        record = logging.getLogRecordFactory()(
            "httpx", logging.INFO, __file__, 1,
            "HTTP Request: %s", (TOUCHPAY_URL,), None,
        )
        assert "EZrcwCRmeY" not in record.getMessage()
        assert "passwordAgent=***" in record.getMessage()
    finally:
        logging.setLogRecordFactory(original_factory)


def test_install_is_idempotent_on_the_factory():
    original_factory = logging.getLogRecordFactory()
    try:
        install()
        after_first = logging.getLogRecordFactory()
        install()
        install()
        assert logging.getLogRecordFactory() is after_first
    finally:
        logging.setLogRecordFactory(original_factory)


def test_the_factory_does_not_break_ordinary_records():
    original_factory = logging.getLogRecordFactory()
    try:
        install()
        record = logging.getLogRecordFactory()(
            "app", logging.INFO, __file__, 1,
            "Payment %s updated %s -> %s (token=%s, command=%s)",
            ("PAY-1", "PENDING", "FAILED", "", "PAY-1"), None,
        )
        assert record.getMessage() == "Payment PAY-1 updated PENDING -> FAILED (token=, command=PAY-1)"
    finally:
        logging.setLogRecordFactory(original_factory)


# --------------------------------------------------------------------------
# The argument httpx actually passes
# --------------------------------------------------------------------------
# Two earlier versions of this filter shipped and did nothing: httpx logs the
# request URL as an httpx.URL object, not a string, and only str arguments
# were scrubbed. Every TouchPay agent password went on being written in clear
# — CM, CG and GA — while the tests, which all used strings, passed.

def test_an_httpx_url_argument_is_redacted():
    import httpx
    from app.core.log_redaction import _redact_record

    url = httpx.URL(TOUCHPAY_URL)
    assert not isinstance(url, str)  # the whole point
    record = _record('HTTP Request: %s %s "%s"', ("PUT", url, "HTTP/1.1 300"))
    _redact_record(record)
    rendered = record.getMessage()
    assert "EZrcwCRmeY" not in rendered
    assert "passwordAgent=***" in rendered
    assert "apidist.gutouch.net" in rendered


def test_the_exact_httpx_log_call_is_covered():
    # Reproduces httpx._client's own logger.info signature.
    import httpx
    from app.core.log_redaction import _redact_record

    record = _record(
        'HTTP Request: %s %s "%s %d %s"',
        ("PUT", httpx.URL(TOUCHPAY_URL), "HTTP/1.1", 300, "Multiple Choices"),
    )
    _redact_record(record)
    assert "EZrcwCRmeY" not in record.getMessage()


def test_ordinary_objects_keep_their_own_repr():
    from app.core.log_redaction import _redact_record

    class Thing:
        def __repr__(self):
            return "<Thing>"
        __str__ = __repr__

    thing = Thing()
    record = _record("got %s", (thing,))
    _redact_record(record)
    assert record.args[0] is thing  # untouched, not stringified


def test_an_object_whose_str_raises_does_not_break_logging():
    from app.core.log_redaction import _redact_record

    class Hostile:
        def __str__(self):
            raise RuntimeError("nope")

    record = _record("got %s", (Hostile(),))
    _redact_record(record)  # must not raise


def test_scalars_are_left_alone():
    from app.core.log_redaction import _redact_record

    record = _record("status=%d ok=%s ratio=%s", (300, True, 1.5))
    _redact_record(record)
    assert record.args == (300, True, 1.5)
