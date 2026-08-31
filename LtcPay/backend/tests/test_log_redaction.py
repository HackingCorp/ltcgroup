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
