"""
LtcPay - Country Service

Centralizes all DB access for countries, operators, and credentials.
Used by payments API, checkout, TouchPay services, and admin endpoints.
"""
import logging
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.encryption import decrypt_value
from app.models.country import SupportedCountry, CountryOperator, MerchantCountry

logger = logging.getLogger(__name__)


class CountryService:

    async def get_country(
        self, db: AsyncSession, code: str,
    ) -> SupportedCountry:
        """Get a country by code. Raises ValueError if not found."""
        result = await db.execute(
            select(SupportedCountry)
            .options(selectinload(SupportedCountry.operators))
            .where(SupportedCountry.code == code.upper())
        )
        country = result.scalar_one_or_none()
        if not country:
            raise ValueError(f"Country '{code}' not found")
        return country

    async def get_active_country(
        self, db: AsyncSession, code: str,
    ) -> SupportedCountry:
        """Get an active country by code. Raises ValueError if not found or inactive."""
        country = await self.get_country(db, code)
        if not country.is_active:
            raise ValueError(f"Country '{code}' is not active")
        return country

    async def get_all_countries(
        self, db: AsyncSession, active_only: bool = False,
    ) -> list[SupportedCountry]:
        """Get all countries, optionally filtered to active only."""
        q = select(SupportedCountry).options(selectinload(SupportedCountry.operators))
        if active_only:
            q = q.where(SupportedCountry.is_active == True)  # noqa: E712
        q = q.order_by(SupportedCountry.name)
        result = await db.execute(q)
        return list(result.scalars().all())

    async def get_available_countries(
        self, db: AsyncSession, merchant_id: uuid.UUID | None = None,
    ) -> list[SupportedCountry]:
        """Get countries available for payments, respecting merchant restrictions."""
        countries = await self.get_all_countries(db, active_only=True)

        if merchant_id is None:
            return countries

        # Check merchant restrictions
        result = await db.execute(
            select(MerchantCountry).where(MerchantCountry.merchant_id == merchant_id)
        )
        restrictions = {mc.country_code: mc.is_active for mc in result.scalars().all()}

        if not restrictions:
            # No restrictions = all active countries
            return countries

        # Only countries with is_active=True in merchant_countries
        return [c for c in countries if restrictions.get(c.code, False)]

    async def get_active_operators(
        self, db: AsyncSession, country_code: str,
    ) -> list[CountryOperator]:
        """Get active operators for a country."""
        result = await db.execute(
            select(CountryOperator).where(
                CountryOperator.country_code == country_code.upper(),
                CountryOperator.is_active == True,  # noqa: E712
            ).order_by(CountryOperator.operator_code)
        )
        return list(result.scalars().all())

    async def is_country_available(
        self, db: AsyncSession, country_code: str, merchant_id: uuid.UUID,
    ) -> bool:
        """Check if a country is available for a specific merchant."""
        # 1. Country must be active globally
        try:
            country = await self.get_active_country(db, country_code)
        except ValueError:
            return False

        # 2. Check merchant restrictions
        result = await db.execute(
            select(MerchantCountry).where(MerchantCountry.merchant_id == merchant_id)
        )
        restrictions = {mc.country_code: mc.is_active for mc in result.scalars().all()}

        if not restrictions:
            return True  # No restrictions = all countries allowed

        return restrictions.get(country_code.upper(), False)

    async def is_operator_available(
        self,
        db: AsyncSession,
        country_code: str,
        operator_code: str,
        merchant_id: uuid.UUID,
    ) -> bool:
        """Check if an operator is available for a country + merchant."""
        if not await self.is_country_available(db, country_code, merchant_id):
            return False

        result = await db.execute(
            select(CountryOperator).where(
                CountryOperator.country_code == country_code.upper(),
                CountryOperator.operator_code == operator_code.upper(),
                CountryOperator.is_active == True,  # noqa: E712
            )
        )
        return result.scalar_one_or_none() is not None

    async def detect_country_by_phone(
        self, db: AsyncSession, phone: str,
    ) -> Optional[SupportedCountry]:
        """Detect country from phone number prefix.

        Tries longest prefix first (e.g. "225" before "22").
        """
        digits = "".join(c for c in phone if c.isdigit())
        if digits.startswith("00"):
            digits = digits[2:]

        countries = await self.get_all_countries(db, active_only=True)
        # Sort by prefix length descending for longest-match
        countries.sort(key=lambda c: len(c.phone_prefix), reverse=True)

        for country in countries:
            if digits.startswith(country.phone_prefix):
                return country

        return None

    async def get_decrypted_credentials(
        self, db: AsyncSession, country_code: str,
    ) -> dict:
        """Get decrypted TouchPay credentials for a country.

        Returns dict with keys: agency_code, login, password, secret,
        merchant_id, secure_code, merchant_website, sdk_url, direct_api_url.
        """
        country = await self.get_active_country(db, country_code)

        return {
            "agency_code": country.tp_agency_code,
            "login": country.tp_login,
            "password": decrypt_value(country.tp_password),
            "secret": decrypt_value(country.tp_secret),
            "merchant_id": country.tp_merchant_id,
            "secure_code": decrypt_value(country.tp_secure_code),
            "merchant_website": country.tp_merchant_website,
            "sdk_url": country.tp_sdk_url,
            "direct_api_url": country.tp_direct_api_url,
        }

    @staticmethod
    def normalize_phone(phone: str, phone_prefix: str, phone_digits: int) -> str:
        """Normalize phone number: strip country prefix, return local digits.

        TouchPay expects digits without country prefix.
        """
        digits = "".join(c for c in phone if c.isdigit())

        # Strip international prefix variants
        if digits.startswith("00" + phone_prefix):
            digits = digits[2 + len(phone_prefix):]
        elif digits.startswith(phone_prefix) and len(digits) > phone_digits:
            digits = digits[len(phone_prefix):]

        return digits


country_service = CountryService()
