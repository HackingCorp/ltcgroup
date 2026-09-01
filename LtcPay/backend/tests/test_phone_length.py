"""A number with the wrong digit count must be refused before any provider call.

Every country carries phone_digits, we publish it in GET /payments/countries
and the docs tell merchants to respect it — but nothing enforced it.
normalize_phone consults it only to decide whether to strip the country
prefix, so a number missing a digit was truncated and forwarded. Seen
2026-09-01 on Gabon: "24174452464" (8 digits after 241) reached AccountPE,
which answered "Invalid phone number"; the customer retried 44 seconds later
with the ninth digit and it went through.
"""
from types import SimpleNamespace

import pytest

from app.services.country_service import country_service
from app.services.touchpay_direct_service import (
    InvalidPhoneNumberError, OperatorMismatchError, TouchPayDirectError,
)

GA = SimpleNamespace(name="Gabon", phone_prefix="241", phone_digits=9)
CM = SimpleNamespace(name="Cameroun", phone_prefix="237", phone_digits=9)


def _normalized(raw, country):
    return country_service.normalize_phone(
        raw, country.phone_prefix, country.phone_digits,
    )


# --------------------------------------------------------------------------
# The case that motivated this
# --------------------------------------------------------------------------

def test_the_gabon_typo_is_caught():
    # 241 + 8 digits: the customer dropped one.
    normalized = _normalized("24174452464", GA)
    assert len(normalized) == 8
    assert country_service.phone_length_error(normalized, GA) is not None


def test_the_corrected_number_passes():
    normalized = _normalized("241074452464", GA)
    assert len(normalized) == 9
    assert country_service.phone_length_error(normalized, GA) is None


def test_the_message_names_both_counts():
    message = country_service.phone_length_error(_normalized("24174452464", GA), GA)
    assert "8" in message and "9" in message
    assert "Gabon" in message


# --------------------------------------------------------------------------
# Boundaries
# --------------------------------------------------------------------------

@pytest.mark.parametrize("raw", ["237670123456", "670123456", "00237670123456"])
def test_valid_cameroon_numbers_pass_in_every_written_form(raw):
    assert country_service.phone_length_error(_normalized(raw, CM), CM) is None


def test_too_many_digits_is_refused():
    assert country_service.phone_length_error("6701234567", CM) is not None


def test_empty_number_is_refused():
    assert country_service.phone_length_error("", CM) is not None


def test_country_without_a_declared_length_is_left_alone():
    # An unknown expected length must not become a blanket rejection.
    unknown = SimpleNamespace(name="X", phone_prefix="99", phone_digits=None)
    assert country_service.phone_length_error("12345", unknown) is None
    assert country_service.phone_length_error("", unknown) is None


def test_zero_length_is_treated_as_unknown():
    zero = SimpleNamespace(name="X", phone_prefix="99", phone_digits=0)
    assert country_service.phone_length_error("12345", zero) is None


# --------------------------------------------------------------------------
# The error must behave like the other pre-flight rejections
# --------------------------------------------------------------------------

def test_it_is_treated_as_an_operator_mismatch_by_existing_handlers():
    # Both the router (never fails over on it) and the endpoints (map it to
    # HTTP 400) already branch on OperatorMismatchError.
    assert issubclass(InvalidPhoneNumberError, OperatorMismatchError)
    assert issubclass(InvalidPhoneNumberError, TouchPayDirectError)


def test_a_wrong_length_never_triggers_a_failover():
    from app.services.payment_router import initiate_mobile_payment  # noqa: F401
    import inspect
    from app.services import payment_router

    source = inspect.getsource(payment_router.initiate_mobile_payment)
    assert "OperatorMismatchError" in source
    assert "raise  # pre-flight rejections" in source
