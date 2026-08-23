"""
LtcPay - per-provider currency capability tests.

LtcPay converts nothing. TouchPay and AccountPE receive a bare integer with
no currency field, so the amount is always read in the country's own
currency, and E-nkap only knows XAF. Before this guard, `currency: "EUR"`
with `amount: 50` was accepted and collected 50 XAF — a silent ~99% loss.
"""
from types import SimpleNamespace

import pytest
import pytest_asyncio

from app.models.country import SupportedCountry
from app.services.provider_service import provider_service


@pytest_asyncio.fixture
async def cameroon(db_session):
    """A minimal active XAF country — the currency check needs one."""
    country = SupportedCountry(
        code="CM", name="Cameroun", currency="XAF",
        phone_prefix="237", is_active=True,
    )
    db_session.add(country)
    await db_session.commit()
    return country


def _provider(**config):
    return SimpleNamespace(config=config or {})


class TestSupportedCurrencies:

    def test_enkap_only_settles_xaf(self):
        assert provider_service.supported_currencies("ENKAP", "XAF") == {"XAF"}

    def test_enkap_stays_xaf_only_in_a_non_xaf_country(self):
        """The country's currency must not widen what the provider accepts."""
        assert provider_service.supported_currencies("ENKAP", "XOF") == {"XAF"}

    def test_stripe_is_multi_currency(self):
        assert provider_service.supported_currencies("STRIPE", "XAF") == {
            "XAF", "XOF", "EUR", "USD",
        }

    @pytest.mark.parametrize("code", ["TOUCHPAY", "ACCOUNTPE"])
    def test_mobile_providers_take_the_country_currency_only(self, code):
        assert provider_service.supported_currencies(code, "XOF") == {"XOF"}

    def test_unknown_country_currency_yields_no_opinion(self):
        """Empty means 'unknown': legacy payments must not be rejected."""
        assert provider_service.supported_currencies("TOUCHPAY", None) == set()

    def test_config_override_wins_over_the_default(self):
        allowed = provider_service.supported_currencies(
            "ENKAP", "XAF", _provider(currencies=["XAF", "XOF"]),
        )
        assert allowed == {"XAF", "XOF"}

    def test_override_is_case_insensitive(self):
        allowed = provider_service.supported_currencies(
            "STRIPE", "XAF", _provider(currencies=["eur"]),
        )
        assert allowed == {"EUR"}

    def test_empty_override_falls_back_to_the_default(self):
        allowed = provider_service.supported_currencies(
            "ENKAP", "XAF", _provider(currencies=[]),
        )
        assert allowed == {"XAF"}

    def test_provider_without_config_uses_the_default(self):
        assert provider_service.supported_currencies(
            "ENKAP", "XAF", SimpleNamespace(config=None),
        ) == {"XAF"}


class TestRejectionContract:
    """The 400 body merchants integrate against."""

    async def test_foreign_currency_is_refused_with_a_machine_readable_code(
        self, client, auth_headers, cameroon,
    ):
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={
                "amount": 32800,
                "currency": "EUR",
                "country": "CM",
                "description": "Commande internationale",
            },
        )

        assert response.status_code == 400
        body = response.json()
        assert body["failure_code"] == "CURRENCY_NOT_SUPPORTED"
        assert body["supported_currencies"] == ["XAF"]
        assert "conversion" in body["detail"].lower()

    async def test_the_country_currency_still_goes_through(
        self, client, auth_headers, cameroon,
    ):
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={
                "amount": 32800,
                "currency": "XAF",
                "country": "CM",
                "description": "Commande locale",
            },
        )

        assert response.status_code != 400, response.text


class TestDisplayCurrency:
    """Cosmetic foreign-currency pair: shown, never charged."""

    async def test_display_pair_is_stored_and_returned(
        self, client, auth_headers, cameroon,
    ):
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={
                "amount": 32800,
                "currency": "XAF",
                "country": "CM",
                "display_amount": 50,
                "display_currency": "eur",
                "description": "Commande internationale",
            },
        )

        assert response.status_code == 201, response.text
        body = response.json()
        assert body["currency"] == "XAF"
        assert float(body["amount"]) == 32800
        assert float(body["display_amount"]) == 50
        assert body["display_currency"] == "EUR"

    async def test_display_currency_is_not_checked_against_the_provider(
        self, client, auth_headers, cameroon,
    ):
        """EUR is refused as a settlement currency but fine as a label."""
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={
                "amount": 32800, "currency": "XAF", "country": "CM",
                "display_amount": 50, "display_currency": "EUR",
            },
        )
        assert response.status_code == 201, response.text

    @pytest.mark.parametrize("partial", [
        {"display_amount": 50},
        {"display_currency": "EUR"},
    ])
    async def test_half_a_pair_is_rejected(
        self, client, auth_headers, cameroon, partial,
    ):
        """One without the other would render nothing on the checkout."""
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={"amount": 32800, "currency": "XAF", "country": "CM", **partial},
        )
        assert response.status_code == 422

    async def test_omitting_the_pair_leaves_it_null(
        self, client, auth_headers, cameroon,
    ):
        response = await client.post(
            "/api/v1/payments",
            headers=auth_headers,
            json={"amount": 32800, "currency": "XAF", "country": "CM"},
        )
        body = response.json()
        assert body["display_amount"] is None
        assert body["display_currency"] is None
