"""
LtcPay - Provider Routing Service

Resolves which mobile-money PSP handles a payment:

    candidates(country, operator) =
        country_providers rows for the country
        WHERE row.is_active AND provider.is_active           (both toggles)
          AND provider.provider_group == MOBILE
          AND an active country_operators row exists for
              (country, provider, operator)
        ORDER BY priority ASC                                (1 = default)

The payment initiation loop tries candidates in order and fails over to the
next one only on provider-side errors (never on customer-caused rejections
like insufficient balance — retrying those elsewhere just double-charges
push notifications to the customer for the same inevitable outcome).
"""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import decrypt_value
from app.models.country import CountryOperator
from app.models.provider import CountryProvider, ProviderConfig, ProviderGroup

logger = logging.getLogger(__name__)

# Config keys whose values are stored Fernet-encrypted.
_SENSITIVE_CONFIG_KEYS = {"api_key", "webhook_secret", "password", "secret", "consumer_key", "consumer_secret"}

# Currencies each provider can actually settle, overridable per provider via
# config["currencies"]. Providers absent from this map take the country's own
# currency and nothing else: TouchPay and AccountPE receive a bare integer
# with no currency field at all, so a "EUR" label would not convert anything —
# it would quietly collect that many XAF.
_PROVIDER_CURRENCIES = {
    "ENKAP": {"XAF"},
    "STRIPE": {"XAF", "XOF", "EUR", "USD"},
}


class ProviderRoutingError(Exception):
    """No usable provider for the requested country/operator."""


class ProviderService:

    @staticmethod
    def supported_currencies(
        provider_code: str,
        country_currency: str | None,
        provider: ProviderConfig | None = None,
    ) -> set[str]:
        """Currencies this provider can settle for a country.

        An empty set means "unknown" — callers must not reject on it.
        """
        override = ((provider.config if provider else None) or {}).get("currencies")
        if override:
            return {str(c).upper() for c in override}

        declared = _PROVIDER_CURRENCIES.get(provider_code.upper())
        if declared is not None:
            return set(declared)

        return {country_currency.upper()} if country_currency else set()

    async def get_provider(self, db: AsyncSession, code: str) -> ProviderConfig | None:
        result = await db.execute(
            select(ProviderConfig).where(ProviderConfig.code == code.upper())
        )
        return result.scalar_one_or_none()

    async def list_providers(self, db: AsyncSession) -> list[ProviderConfig]:
        result = await db.execute(select(ProviderConfig).order_by(ProviderConfig.code))
        return list(result.scalars().all())

    async def get_country_providers(
        self, db: AsyncSession, country_code: str,
    ) -> list[CountryProvider]:
        """All provider links for a country (active or not), by priority."""
        result = await db.execute(
            select(CountryProvider)
            .where(CountryProvider.country_code == country_code.upper())
            .order_by(CountryProvider.priority)
        )
        return list(result.scalars().all())

    async def resolve_mobile_providers(
        self,
        db: AsyncSession,
        country_code: str,
        operator_code: str | None = None,
    ) -> list[tuple[ProviderConfig, CountryOperator | None]]:
        """Ordered (provider, operator_row) candidates for a mobile payment.

        With an operator_code, only providers that have that operator active
        in the country qualify; the matching operator row is returned so the
        caller gets the provider-specific service_code. Without one, all
        active mobile providers of the country are returned (operator None).
        """
        cc = country_code.upper()
        result = await db.execute(
            select(CountryProvider, ProviderConfig)
            .join(ProviderConfig, CountryProvider.provider_code == ProviderConfig.code)
            .where(
                CountryProvider.country_code == cc,
                CountryProvider.is_active == True,  # noqa: E712
                ProviderConfig.is_active == True,  # noqa: E712
                ProviderConfig.provider_group == ProviderGroup.MOBILE,
            )
            .order_by(CountryProvider.priority)
        )
        links = result.all()
        if not links:
            return []

        if operator_code is None:
            return [(provider, None) for _, provider in links]

        op_result = await db.execute(
            select(CountryOperator).where(
                CountryOperator.country_code == cc,
                CountryOperator.operator_code == operator_code.upper(),
                CountryOperator.is_active == True,  # noqa: E712
            )
        )
        ops_by_provider = {op.provider_code: op for op in op_result.scalars().all()}

        candidates: list[tuple[ProviderConfig, CountryOperator | None]] = []
        for _, provider in links:
            op = ops_by_provider.get(provider.code)
            if op is not None:
                candidates.append((provider, op))
        return candidates

    async def resolve_card_providers(
        self, db: AsyncSession, country_code: str | None,
    ) -> list[ProviderConfig]:
        """Ordered active CARD-group providers for a country.

        Without a country (legacy card payments), returns an empty list —
        the caller falls back to the historical Stripe behavior.
        """
        if not country_code:
            return []
        result = await db.execute(
            select(CountryProvider, ProviderConfig)
            .join(ProviderConfig, CountryProvider.provider_code == ProviderConfig.code)
            .where(
                CountryProvider.country_code == country_code.upper(),
                CountryProvider.is_active == True,  # noqa: E712
                ProviderConfig.is_active == True,  # noqa: E712
                ProviderConfig.provider_group == ProviderGroup.CARD,
            )
            .order_by(CountryProvider.priority)
        )
        return [provider for _, provider in result.all()]

    @staticmethod
    def apply_merchant_prefs(candidates, merchant, group: str, country_code: str | None):
        """Reorder provider candidates according to a merchant's preferences.

        merchant.provider_prefs shape:
            {"MOBILE": {"CM": ["ACCOUNTPE", "TOUCHPAY"]}, "CARD": {...}}
        Listed providers come first in that order; unlisted ones keep their
        country-priority order after them. Toggles are already applied by the
        resolve_* queries — prefs can only reorder, never re-enable.
        Accepts both ProviderConfig items and (ProviderConfig, op) tuples.
        """
        if merchant is None or not country_code:
            return candidates
        prefs = (
            (getattr(merchant, "provider_prefs", None) or {})
            .get(group.upper(), {})
            .get(country_code.upper())
        )
        if not prefs:
            return candidates
        rank = {str(code).upper(): i for i, code in enumerate(prefs)}

        def sort_key(indexed):
            index, item = indexed
            provider = item[0] if isinstance(item, tuple) else item
            return (rank.get(provider.code, len(rank)), index)

        return [item for _, item in sorted(enumerate(candidates), key=lambda x: sort_key(x))]

    def decrypted_config(self, provider: ProviderConfig) -> dict:
        """Provider account config with sensitive values decrypted."""
        config = dict(provider.config or {})
        for key in list(config.keys()):
            if key in _SENSITIVE_CONFIG_KEYS and config[key]:
                try:
                    config[key] = decrypt_value(config[key])
                except Exception:  # value stored unencrypted (legacy/manual)
                    pass
        return config


provider_service = ProviderService()
