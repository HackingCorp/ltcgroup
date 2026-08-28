"""
LtcPay - currency rounding and operator reference tests.

Two defects found on 2026-08-24 while investigating a customer who insisted
his Orange balance was sufficient:

- XAF has no centimes, but the fee was quantized to 0.01 and the total then
  sent to TouchPay as int(): 647 payments recorded an amount nobody was ever
  charged.
- Orange appends its own transaction reference to the rejection message
  ("...insuffisant| MP260824FD3C4BF9D397491AE59C"). It is the only handle
  Orange support can act on, and it never reached the merchant.
"""
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.api.v1.payments import _compute_fee, money_step, reprice_for_method
from app.services.failure_reasons import extract_operator_reference
from app.services.payment_router import extract_transaction_ids


class TestMoneyRounding:

    @pytest.mark.parametrize("currency", ["XAF", "XOF", "GNF", "UGX", "CDF", "xaf"])
    def test_african_currencies_have_no_minor_unit(self, currency):
        assert money_step(currency) == Decimal("1")

    @pytest.mark.parametrize("currency", ["EUR", "USD"])
    def test_stripe_currencies_keep_cents(self, currency):
        assert money_step(currency) == Decimal("0.01")

    def test_missing_currency_defaults_to_xaf(self):
        assert money_step(None) == Decimal("1")

    def test_xaf_fee_is_a_whole_number(self):
        """1950 x 1.75% = 34.125 -> 34, not 34.12."""
        assert _compute_fee(Decimal("1950"), Decimal("1.75"), "XAF") == Decimal("34")

    def test_xaf_fee_rounds_half_up(self):
        """Neither party is systematically favoured."""
        assert _compute_fee(Decimal("1000"), Decimal("1.75"), "XAF") == Decimal("18")

    def test_eur_fee_still_carries_cents(self):
        assert _compute_fee(Decimal("1000"), Decimal("1.75"), "EUR") == Decimal("17.50")

    def test_the_regression_case_from_production(self):
        """PAY-0361FC83C3A941C7 recorded 1984.12 and charged 1984."""
        base = Decimal("1950")
        fee = _compute_fee(base, Decimal("1.75"), "XAF")
        total = base + fee
        assert total == total.to_integral_value(), f"{total} would be truncated in transit"

    def test_repricing_to_card_stays_whole_in_xaf(self):
        payment = SimpleNamespace(amount=Decimal("1984"), fee=Decimal("34"), currency="XAF")
        merchant = SimpleNamespace(
            fee_bearer="CLIENT", fee_rate=Decimal("1.75"), fee_rate_card=None,
        )

        amount, fee = reprice_for_method(payment, merchant, "CARD")

        assert amount == amount.to_integral_value()
        assert fee == fee.to_integral_value()

    def test_repricing_keeps_cents_on_a_eur_payment(self):
        payment = SimpleNamespace(amount=Decimal("1017.50"), fee=Decimal("17.50"), currency="EUR")
        merchant = SimpleNamespace(
            fee_bearer="CLIENT", fee_rate=Decimal("1.75"), fee_rate_card=None,
        )

        amount, fee = reprice_for_method(payment, merchant, "MOBILE")

        assert fee == Decimal("17.50")
        assert amount == Decimal("1017.50")


class TestOperatorReference:

    def test_extracts_the_orange_money_reference(self):
        message = (
            "Le solde du compte du payeur est insuffisant"
            "| MP260824FD3C4BF9D397491AE59C"
        )
        assert extract_operator_reference(message) == "MP260824FD3C4BF9D397491AE59C"

    def test_mtn_messages_carry_no_reference(self):
        assert extract_operator_reference("[27] Unauthorized") is None
        assert extract_operator_reference("[04] Account not found") is None

    def test_none_and_empty_are_safe(self):
        assert extract_operator_reference(None) is None
        assert extract_operator_reference("") is None

    def test_a_pipe_used_as_punctuation_is_not_a_reference(self):
        assert extract_operator_reference("Paiement refuse | reessayez plus tard") is None

    def test_a_short_trailing_token_is_rejected(self):
        assert extract_operator_reference("Erreur| 42") is None

    def test_only_the_last_segment_is_read(self):
        message = "a| b| MP260824FD3C4BF9D397491AE59C"
        assert extract_operator_reference(message) == "MP260824FD3C4BF9D397491AE59C"


class TestTransactionIdsAreKeptAtInitiation:
    """Both ids must land in their columns before any callback exists.

    PAY-3433A41AF4E24354 sat 40 minutes in PROCESSING with no callback: its
    TouchPay id and its Orange reference were only inside the response JSON,
    unreachable to anyone without database access — on precisely the payment
    that needed escalating.
    """

    def test_orange_keeps_both_ids(self):
        response = {
            "idFromGU": "1787925525281",
            "numTransaction": "MP260828.1458.A39708",
            "status": "INITIATED",
        }
        assert extract_transaction_ids(response) == {
            "provider_transaction_id": "1787925525281",
            "operator_transaction_id": "MP260828.1458.A39708",
        }

    def test_mtn_repeats_its_id_and_must_not_fake_an_operator_reference(self):
        """On MTN numTransaction is just idFromGU again."""
        response = {"idFromGU": "1787927084784", "numTransaction": "1787927084784"}
        assert extract_transaction_ids(response) == {
            "provider_transaction_id": "1787927084784",
        }

    def test_accountpe_id_is_read_from_data(self):
        """AccountPE's transaction_id echoes our own reference back."""
        response = {"data": {"id": 71006, "transaction_id": "PAY-CAA1190DDCC74581"}}
        assert extract_transaction_ids(response) == {"provider_transaction_id": "71006"}

    def test_an_empty_response_yields_nothing(self):
        assert extract_transaction_ids({}) == {}

    def test_numbers_are_stored_as_strings(self):
        ids = extract_transaction_ids({"idFromGU": 1787925525281})
        assert ids["provider_transaction_id"] == "1787925525281"
