"""Refusing a number is fine; sending the customer nowhere is not.

Gabon offers Moov only — Airtel is inactive on TouchPay and on AccountPE.
A customer with an 07x Airtel number therefore picks Moov (the single
choice on the checkout page), our prefix guard refuses it, and the message
tells them to "change operator". There is no other operator to change to.
Six of the ten Gabon attempts on 2026-09-11/12 ended exactly there.
"""
from types import SimpleNamespace

from app.services.country_service import CountryService
from app.services.failure_reasons import classify_failure


def _op(code, name, prefixes, active, provider):
    return SimpleNamespace(
        operator_code=code, operator_name=name, phone_prefixes=prefixes,
        is_active=active, provider_code=provider,
    )


# Gabon as production has it: Moov live on both providers, Airtel on neither.
GABON = [
    _op("MOOV", "Moov Money", ["06"], True, "TOUCHPAY"),
    _op("MOOV", "Moov Money", ["06"], True, "ACCOUNTPE"),
    _op("AIRTEL", "Airtel Money", ["07"], False, "TOUCHPAY"),
    _op("AIRTEL", "Airtel Money", ["07"], False, "ACCOUNTPE"),
]

# Cameroon: both operators live.
CAMEROON = [
    _op("MTN", "MTN Mobile Money", ["67", "65", "68"], True, "TOUCHPAY"),
    _op("ORANGE", "Orange Money", ["69", "655", "656"], True, "TOUCHPAY"),
]


# --------------------------------------------------------------------------
# Availability
# --------------------------------------------------------------------------

def test_an_operator_inactive_everywhere_is_unavailable():
    assert CountryService.operator_is_available(GABON, "AIRTEL") is False


def test_an_operator_live_on_one_provider_is_available():
    # One row inactive must not hide a sibling row that still works.
    mixed = [
        _op("AIRTEL", "Airtel Money", ["07"], False, "TOUCHPAY"),
        _op("AIRTEL", "Airtel Money", ["07"], True, "ACCOUNTPE"),
    ]
    assert CountryService.operator_is_available(mixed, "AIRTEL") is True


def test_availability_is_case_insensitive():
    assert CountryService.operator_is_available(GABON, "moov") is True


def test_an_unknown_operator_is_unavailable():
    assert CountryService.operator_is_available(GABON, "MTN") is False


# --------------------------------------------------------------------------
# The message the customer reads
# --------------------------------------------------------------------------

def test_gabon_airtel_is_not_told_to_change_operator():
    mismatch = CountryService.operator_mismatch(GABON, "074411658", "MOOV")
    assert mismatch is not None and mismatch.operator_code == "AIRTEL"

    message = CountryService.operator_mismatch_message(GABON, mismatch)
    assert "Airtel Money" in message
    assert "pas disponible" in message
    assert "changez d'operateur" not in message   # the dead end


def test_cameroon_is_still_told_to_change_operator():
    mismatch = CountryService.operator_mismatch(CAMEROON, "691234567", "MTN")
    assert mismatch is not None and mismatch.operator_code == "ORANGE"

    message = CountryService.operator_mismatch_message(CAMEROON, mismatch)
    assert "Orange Money" in message
    assert "changez d'operateur" in message       # here it is actionable


def test_both_messages_stay_classified_as_wrong_operator():
    """The classifier keys on "appartient a" — both wordings must keep it."""
    for operators, phone, selected in (
        (GABON, "074411658", "MOOV"),
        (CAMEROON, "691234567", "MTN"),
    ):
        mismatch = CountryService.operator_mismatch(operators, phone, selected)
        message = CountryService.operator_mismatch_message(operators, mismatch)
        code, _ = classify_failure(message)
        assert code == "WRONG_OPERATOR"


def test_a_matching_number_is_never_a_mismatch():
    assert CountryService.operator_mismatch(GABON, "064411658", "MOOV") is None


# --------------------------------------------------------------------------
# MTN Congo's underscored wording
# --------------------------------------------------------------------------

def test_payer_not_found_is_recognised():
    # "FAILED - PAYER_NOT_FOUND" has an underscore, so the "not found"
    # marker missed it and merchants got the generic code (2026-09-11).
    code, message = classify_failure("FAILED - PAYER_NOT_FOUND")
    assert code == "ACCOUNT_NOT_FOUND"
    assert "numero" in message.lower()


def test_the_spaced_wording_still_works():
    assert classify_failure("[04] Account not found")[0] == "ACCOUNT_NOT_FOUND"
