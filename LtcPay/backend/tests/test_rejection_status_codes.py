"""
A refused payment is not a broken gateway.

Until 2026-09-21 every provider rejection came back as 502 Bad Gateway,
including the ones where the provider had answered perfectly and the answer
was that the customer had no money. Three things followed: merchants read an
outage where there was none, their monitoring counted customer behaviour as
server errors, and most HTTP clients retry 5xx on their own — re-sending a
payin the operator had already refused, straight into its 5-minute duplicate
window.

is_customer_error already existed and already drove the log level. These
tests pin it to the status code as well.
"""
import pytest

from app.services.touchpay_direct_service import TouchPayDirectError, is_customer_error
from app.services.failure_reasons import classify_failure


def _status_for(message: str) -> int:
    """The status create_payment picks for a raw operator message."""
    return 402 if is_customer_error(TouchPayDirectError(message)) else 502


class TestTheCustomerIsNotAnOutage:

    @pytest.mark.parametrize("message", [
        # Every one of these was seen in production.
        "Le solde du compte du payeur est insuffisant| MP260921BCD8F33A6D5BB60CDE2F",
        "Le compte  client n a pas suffisamment de balance pour effectuer cette transaction.",
        "[04] Account not found",
        "[11] Account is disabled or blocked",
        "Ce numero appartient a Moov Money, pas a l'operateur selectionne.",
        "Numero de telephone invalide : 8 chiffres recus",
        # The payer never validated the PIN prompt. TouchPay confirmed this
        # is the subscriber, not our credentials: bursts on one service code
        # return different per-subscriber diagnostics minutes apart.
        "[27] Unauthorized",
        "Le solde du client est faible ou limite de beneficiaires atteinte",
        "The transaction was not confirmed in time",
    ])
    def test_a_customer_rejection_answers_402(self, message):
        assert _status_for(message) == 402

    @pytest.mark.parametrize("message", [
        "Provider unavailable",
        "TEC-INTERNAL-001",
        "Erreur interne du service",
        "Vous n'etes pas autorise a effectuer cette operation.",
    ])
    def test_a_provider_fault_still_answers_502(self, message):
        """Including the one TouchPay words as a permissions problem: it
        means their own service is down, not that the payer did anything."""
        assert _status_for(message) == 502

    def test_the_insufficient_balance_case_that_prompted_this(self):
        """PAY-7767974C93B1481F, 12:57 UTC on 2026-09-21: Orange said the
        balance was too low and the merchant was told 502."""
        raw = "Le solde du compte du payeur est insuffisant| MP260921BCD8F33A6D5BB60CDE2F"
        assert _status_for(raw) == 402
        code, _ = classify_failure(raw)
        assert code == "INSUFFICIENT_FUNDS"

    def test_an_unrecognised_message_is_treated_as_our_problem(self):
        """A message nobody has seen before must keep failing over and keep
        raising the alert — assuming it is the customer would bury a real
        outage behind a wall of 402s."""
        assert _status_for("Une panne que personne n a encore vue") == 502

    def test_the_two_classifiers_cannot_drift_apart_again(self):
        """is_customer_error used to keep its own marker list. Everything
        the docs call a customer cause must now answer 402."""
        from app.services.failure_reasons import _FAILURE_RULES, CUSTOMER_FAILURE_CODES

        for code, markers, _ in _FAILURE_RULES:
            expected = 402 if code in CUSTOMER_FAILURE_CODES else 502
            assert _status_for(markers[0]) == expected, (
                f"{code} classified one way and billed the other"
            )

    def test_every_rejection_carries_a_machine_readable_code(self):
        """The merchant should never have to parse the French message."""
        for message in [
            "Le solde du compte du payeur est insuffisant",
            "[04] Account not found",
            "[11] Account is disabled or blocked",
            "Provider unavailable",
        ]:
            code, customer_message = classify_failure(message)
            assert code and code.isupper()
            assert customer_message


class TestTimeoutIsNotAlwaysTheOperator:
    """`[60] TIMEOUT` is the operator reporting that the payer let the USSD
    prompt lapse. It used to be swallowed by OPERATOR_UNAVAILABLE's generic
    "timeout" marker, so the customer read that the network was down and was
    invited to retry — on 2026-09-21 one Gabon number did exactly that four
    times in seven minutes, each attempt waiting for a confirmation he was
    never told to give."""

    def test_code_60_is_the_customer_not_confirming(self):
        code, message = classify_failure("[60] TIMEOUT")
        assert code == "CONFIRMATION_TIMEOUT"
        assert "confirme" in message.lower()
        assert _status_for("[60] TIMEOUT") == 402

    def test_our_own_http_timeout_is_still_the_provider(self):
        """At initiation we never read the answer, so it is not the payer's
        doing and the payment must still fail over."""
        for message in ["timed out", "Request timeout", "Read timeout"]:
            code, _ = classify_failure(message)
            assert code == "OPERATOR_UNAVAILABLE", message
            assert _status_for(message) == 502, message

    def test_the_message_tells_the_customer_what_to_do(self):
        """The old one blamed the network and said to wait a few minutes."""
        _, message = classify_failure("[60] TIMEOUT")
        assert "indisponible" not in message.lower()


class TestMessagesFromTheNewlyOpenedCountries:
    """Opening Mali, Guinea, DRC and Ivory Coast surfaced wordings no rule
    covered. Each fell through to PAYMENT_FAILED, which means "we do not
    know": failover, operator alert, and a customer told to try another
    payment method when the real instruction was on his own screen."""

    RDC_PIN = (
        "Payment ID: TJ1OW-P202609231733438GFIMQ ended FAILED. "
        "Reason: Transaction ID is invalid - User didn't enter the pin."
    )

    def test_the_drc_message_says_the_payer_skipped_the_pin(self):
        code, message = classify_failure(self.RDC_PIN)
        assert code == "CONFIRMATION_TIMEOUT"
        assert _status_for(self.RDC_PIN) == 402
        assert "confirme" in message.lower()

    def test_the_pin_wording_is_not_read_as_an_invalid_transaction(self):
        """It also contains 'Transaction ID is invalid'; the payer's own
        action is the more specific — and more useful — reading."""
        code, _ = classify_failure(self.RDC_PIN)
        assert code != "REJECTED_BY_OPERATOR"

    def test_an_unsupported_method_is_neither_the_payer_nor_an_outage(self):
        """AccountPE on Moov Ivory Coast, 2026-09-22. Retrying changes
        nothing until the configuration does, so the customer must not be
        told to wait a few minutes."""
        code, message = classify_failure("Payment method not supported")
        assert code == "METHOD_NOT_SUPPORTED"
        assert _status_for("Payment method not supported") == 502
        assert "indisponible" not in message.lower()
        assert "autre operateur" in message.lower()

    def test_a_bare_FAILED_stays_unknown(self):
        """MTN Guinea returns just 'FAILED'. Nothing in it identifies a
        cause, so inventing one would be worse than the honest fallback."""
        code, _ = classify_failure("FAILED")
        assert code == "PAYMENT_FAILED"
        assert _status_for("FAILED") == 502
