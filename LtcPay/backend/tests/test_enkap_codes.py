"""E-nkap numeric outcome codes: mapping, extraction, and exposure.

The codes come from E-nkap's test-scenario sheet (Orange 703xxx, MTN
704xxx). They are the only signal that distinguishes a refusal from a
timeout from an empty wallet — E-nkap's textual payload only says "FAILED".
"""
from app.models.payment import Payment, PaymentStatus
from app.services.enkap_service import extract_outcome_code
from app.services.failure_reasons import classify_enkap_code


# --------------------------------------------------------------------------
# classify_enkap_code
# --------------------------------------------------------------------------

def test_orange_low_balance_maps_to_insufficient_funds():
    assert classify_enkap_code("703108")[0] == "INSUFFICIENT_FUNDS"


def test_customer_rejection_maps_to_not_authorized():
    assert classify_enkap_code("703202")[0] == "NOT_AUTHORIZED"


def test_missing_confirmation_maps_to_confirmation_timeout():
    code, message = classify_enkap_code("703201")
    assert code == "CONFIRMATION_TIMEOUT"
    assert "confirme" in message.lower()


def test_orange_transaction_failed_maps_to_rejected_by_operator():
    assert classify_enkap_code("703000")[0] == "REJECTED_BY_OPERATOR"


def test_mtn_transaction_failed_maps_to_rejected_by_operator():
    assert classify_enkap_code("704005")[0] == "REJECTED_BY_OPERATOR"


def test_rejection_and_timeout_are_distinct_outcomes():
    # A refusal is final for this attempt; a timeout is worth relaunching
    # immediately. Collapsing them would lose the merchant's next action.
    assert classify_enkap_code("703202")[0] != classify_enkap_code("703201")[0]


def test_success_code_is_not_a_failure():
    assert classify_enkap_code("0") is None


def test_missing_code_is_not_a_failure():
    assert classify_enkap_code(None) is None
    assert classify_enkap_code("") is None
    assert classify_enkap_code("   ") is None


def test_unknown_code_falls_back_rather_than_inventing_a_reason():
    assert classify_enkap_code("999999") is None


def test_code_accepts_integers_and_whitespace():
    assert classify_enkap_code(703108)[0] == "INSUFFICIENT_FUNDS"
    assert classify_enkap_code(" 703108 ")[0] == "INSUFFICIENT_FUNDS"


def test_every_mapped_code_returns_a_non_empty_message():
    for raw in ("703000", "703108", "703201", "703202", "704005"):
        code, message = classify_enkap_code(raw)
        assert code and message.strip()


# --------------------------------------------------------------------------
# extract_outcome_code
# --------------------------------------------------------------------------

def test_extracts_camel_case_error_code():
    assert extract_outcome_code({"paymentStatus": "FAILED", "errorCode": "703108"}) == "703108"


def test_extracts_snake_case_error_code():
    assert extract_outcome_code({"error_code": 703202}) == "703202"


def test_extracts_from_a_nested_container():
    payload = {"paymentStatus": "FAILED", "payment": {"responseCode": "704005"}}
    assert extract_outcome_code(payload) == "704005"


def test_top_level_field_wins_over_nested():
    payload = {"errorCode": "703108", "payment": {"errorCode": "703202"}}
    assert extract_outcome_code(payload) == "703108"


def test_success_code_is_returned_verbatim():
    # The caller, not the extractor, decides that "0" means success.
    assert extract_outcome_code({"errorCode": 0}) == "0"


def test_non_numeric_values_are_ignored():
    # "code" also carries WSO2 strings; a wrong code means a wrong message.
    assert extract_outcome_code({"code": "900901"}) == "900901"
    assert extract_outcome_code({"code": "SUCCESS"}) is None
    assert extract_outcome_code({"statusCode": "OK"}) is None


def test_booleans_are_not_codes():
    assert extract_outcome_code({"errorCode": True}) is None


def test_absent_code_returns_none():
    assert extract_outcome_code({"paymentStatus": "FAILED"}) is None


def test_non_dict_payload_returns_none():
    assert extract_outcome_code(None) is None
    assert extract_outcome_code("703108") is None
    assert extract_outcome_code([{"errorCode": "703108"}]) is None


# --------------------------------------------------------------------------
# Exposure on the Payment model
# --------------------------------------------------------------------------

def _payment(status, touchpay_data=None):
    payment = Payment()
    payment.status = status
    payment.touchpay_data = touchpay_data
    payment.direct_api_data = None
    return payment


def test_enkap_code_surfaces_on_a_payment_that_never_reached_failed():
    # The whole point: E-nkap attempt failures leave the payment payable,
    # so gating on FAILED would hide the reason entirely.
    payment = _payment(PaymentStatus.PENDING, {"provider": "ENKAP", "enkap_code": "703108"})
    assert payment.failure_code == "INSUFFICIENT_FUNDS"
    assert payment.failure_reason


def test_enkap_code_surfaces_on_an_expired_payment():
    payment = _payment(PaymentStatus.EXPIRED, {"provider": "ENKAP", "enkap_code": "703201"})
    assert payment.failure_code == "CONFIRMATION_TIMEOUT"


def test_completed_payment_reports_no_failure_even_with_a_stale_code():
    # A customer who fails once then pays on a retry must not be told the
    # payment failed.
    payment = _payment(PaymentStatus.COMPLETED, {"provider": "ENKAP", "enkap_code": "703202"})
    assert payment.failure_code is None
    assert payment.failure_reason is None


def test_unknown_enkap_code_falls_back_to_message_classification():
    payment = _payment(
        PaymentStatus.FAILED,
        {"enkap_code": "999999", "message": "Le solde du compte du payeur est insuffisant"},
    )
    assert payment.failure_code == "INSUFFICIENT_FUNDS"


def test_pending_payment_without_an_enkap_code_reports_nothing():
    payment = _payment(PaymentStatus.PENDING, {"message": "whatever"})
    assert payment.failure_code is None


def test_touchpay_classification_is_unchanged():
    payment = _payment(PaymentStatus.FAILED, {"message": "[27] Unauthorized"})
    assert payment.failure_code == "NOT_AUTHORIZED"


# --------------------------------------------------------------------------
# TouchPay: "Vous n'etes pas autorise a effectuer cette operation"
# --------------------------------------------------------------------------
# TouchPay confirmed on 2026-09-02 that this HTTP 300 signals an unstable or
# unavailable service on their side, cleared within minutes — not a
# permissions problem, despite the wording. It is what every Gabon initiation
# returns, and what the failover to AccountPE rescues.

TOUCHPAY_UNAVAILABLE = "Vous n'etes pas autorise a effectuer cette operation."


def test_touchpay_unavailability_is_not_a_customer_error():
    # A customer error aborts instead of failing over; this one must fail over.
    from app.services.touchpay_direct_service import TouchPayDirectError, is_customer_error
    assert not is_customer_error(TouchPayDirectError(TOUCHPAY_UNAVAILABLE, status_code=300))


def test_touchpay_unavailability_maps_to_operator_unavailable():
    from app.services.failure_reasons import classify_failure
    assert classify_failure(TOUCHPAY_UNAVAILABLE)[0] == "OPERATOR_UNAVAILABLE"


def test_the_customer_is_never_told_they_are_unauthorised():
    from app.services.touchpay_direct_service import TouchPayDirectError, friendly_initiation_error
    message = friendly_initiation_error(TouchPayDirectError(TOUCHPAY_UNAVAILABLE, status_code=300))
    assert "autorise" not in message.lower()
    assert "indisponible" in message.lower()


def test_a_real_customer_refusal_is_still_not_an_outage():
    from app.services.failure_reasons import classify_failure
    assert classify_failure("[27] Unauthorized")[0] == "NOT_AUTHORIZED"
    assert classify_failure("Le solde du compte du payeur est insuffisant")[0] == "INSUFFICIENT_FUNDS"
