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
