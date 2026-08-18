"""
Admin API - Payment Provider Management

- List providers with their global kill-switch and country coverage
- Toggle a provider globally (all countries at once) or per country
- Configure account-level credentials (encrypted at rest)
- Set the default / secondary provider per country via priorities
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_admin
from app.core.database import get_db
from app.core.encryption import encrypt_value
from app.models.admin_user import AdminUser
from app.models.country import CountryOperator, SupportedCountry
from app.models.provider import CountryProvider, ProviderConfig
from app.services.provider_service import _SENSITIVE_CONFIG_KEYS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/providers", tags=["Admin Providers"])


# ── Schemas ──────────────────────────────────────────────────────

class CountryLinkInfo(BaseModel):
    country_code: str
    priority: int
    is_active: bool


class ProviderInfo(BaseModel):
    code: str
    name: str
    provider_group: str
    is_active: bool
    config_keys: list[str]
    countries: list[CountryLinkInfo]


class ProviderUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    # Merged into the stored config; sensitive keys are encrypted.
    # Set a key to null/"" to remove it.
    config: dict | None = None


class CountryLinkUpdate(BaseModel):
    priority: int = Field(default=1, ge=1, le=10)
    is_active: bool = True


# ── Helpers ──────────────────────────────────────────────────────

async def _get_provider_or_404(db: AsyncSession, code: str) -> ProviderConfig:
    result = await db.execute(
        select(ProviderConfig).where(ProviderConfig.code == code.upper())
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider '{code}' not found")
    return provider


def _provider_info(provider: ProviderConfig, links: list[CountryProvider]) -> ProviderInfo:
    return ProviderInfo(
        code=provider.code,
        name=provider.name,
        provider_group=provider.provider_group.value,
        is_active=provider.is_active,
        config_keys=sorted((provider.config or {}).keys()),
        countries=[
            CountryLinkInfo(
                country_code=link.country_code,
                priority=link.priority,
                is_active=link.is_active,
            )
            for link in sorted(links, key=lambda l: (l.country_code, l.priority))
        ],
    )


# ── Endpoints ────────────────────────────────────────────────────

@router.get("", response_model=list[ProviderInfo])
async def list_providers(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """All providers with their global state and country coverage."""
    providers = (await db.execute(select(ProviderConfig).order_by(ProviderConfig.code))).scalars().all()
    links = (await db.execute(select(CountryProvider))).scalars().all()
    by_provider: dict[str, list[CountryProvider]] = {}
    for link in links:
        by_provider.setdefault(link.provider_code, []).append(link)
    return [_provider_info(p, by_provider.get(p.code, [])) for p in providers]


@router.patch("/{code}", response_model=ProviderInfo)
async def update_provider(
    code: str,
    payload: ProviderUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a provider: global toggle, display name, account config.

    Setting is_active=false here disables the provider in EVERY country.
    Sensitive config values (api_key, webhook_secret, ...) are encrypted
    before storage and never returned by the API.
    """
    provider = await _get_provider_or_404(db, code)

    if payload.name is not None:
        provider.name = payload.name
    if payload.is_active is not None:
        provider.is_active = payload.is_active
        logger.info(
            "Admin %s set provider %s globally %s",
            admin.email, provider.code, "ACTIVE" if payload.is_active else "INACTIVE",
        )
    if payload.config:
        config = dict(provider.config or {})
        for key, value in payload.config.items():
            if value in (None, ""):
                config.pop(key, None)
            elif key in _SENSITIVE_CONFIG_KEYS:
                config[key] = encrypt_value(str(value))
            else:
                config[key] = value
        provider.config = config

    await db.commit()
    await db.refresh(provider)
    links = (await db.execute(
        select(CountryProvider).where(CountryProvider.provider_code == provider.code)
    )).scalars().all()
    return _provider_info(provider, list(links))


@router.put("/{code}/countries/{country_code}", response_model=CountryLinkInfo)
async def set_country_link(
    code: str,
    country_code: str,
    payload: CountryLinkUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Enable a provider for a country (or update priority / toggle).

    priority 1 = default provider, 2 = secondary (failover), etc.
    """
    provider = await _get_provider_or_404(db, code)
    cc = country_code.upper()

    country = (await db.execute(
        select(SupportedCountry).where(SupportedCountry.code == cc)
    )).scalar_one_or_none()
    if not country:
        raise HTTPException(status_code=404, detail=f"Country '{cc}' not found")

    link = (await db.execute(
        select(CountryProvider).where(
            CountryProvider.country_code == cc,
            CountryProvider.provider_code == provider.code,
        )
    )).scalar_one_or_none()

    if link is None:
        link = CountryProvider(
            country_code=cc,
            provider_code=provider.code,
            priority=payload.priority,
            is_active=payload.is_active,
        )
        db.add(link)
    else:
        link.priority = payload.priority
        link.is_active = payload.is_active

    await db.commit()
    logger.info(
        "Admin %s set %s/%s priority=%s active=%s",
        admin.email, cc, provider.code, payload.priority, payload.is_active,
    )
    return CountryLinkInfo(
        country_code=cc, priority=link.priority, is_active=link.is_active,
    )


@router.delete("/{code}/countries/{country_code}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_country_link(
    code: str,
    country_code: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove a provider from a country entirely."""
    provider = await _get_provider_or_404(db, code)
    cc = country_code.upper()
    link = (await db.execute(
        select(CountryProvider).where(
            CountryProvider.country_code == cc,
            CountryProvider.provider_code == provider.code,
        )
    )).scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    await db.delete(link)
    await db.commit()


merchant_prefs_router = APIRouter(
    prefix="/admin/merchants", tags=["Admin Merchant Providers"],
)


class MerchantPrefsUpdate(BaseModel):
    # {"MOBILE": {"CM": ["ACCOUNTPE", "TOUCHPAY"]}, "CARD": {"CM": ["STRIPE"]}}
    provider_prefs: dict[str, dict[str, list[str]]] | None = None


@merchant_prefs_router.get("/{merchant_id}/provider-prefs")
async def get_merchant_provider_prefs(
    merchant_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.merchant import Merchant
    merchant = (await db.execute(
        select(Merchant).where(Merchant.id == merchant_id)
    )).scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return {"merchant_id": merchant_id, "provider_prefs": merchant.provider_prefs or {}}


@merchant_prefs_router.put("/{merchant_id}/provider-prefs")
async def set_merchant_provider_prefs(
    merchant_id: str,
    payload: MerchantPrefsUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Set a merchant's provider routing preferences (full replace).

    Listed providers are tried first (in order) for that group and country;
    unlisted active providers follow in country-priority order. Global and
    per-country toggles still apply — prefs can reorder, never re-enable.
    Set provider_prefs to null/{} to clear.
    """
    from app.models.merchant import Merchant
    merchant = (await db.execute(
        select(Merchant).where(Merchant.id == merchant_id)
    )).scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    prefs = payload.provider_prefs or None
    if prefs:
        known = {
            p.code for p in (await db.execute(select(ProviderConfig))).scalars().all()
        }
        normalized: dict = {}
        for group, by_country in prefs.items():
            if group.upper() not in ("MOBILE", "CARD"):
                raise HTTPException(status_code=422, detail=f"Unknown group '{group}'")
            normalized[group.upper()] = {}
            for cc, codes in (by_country or {}).items():
                bad = [c for c in codes if str(c).upper() not in known]
                if bad:
                    raise HTTPException(
                        status_code=422, detail=f"Unknown provider(s): {bad}",
                    )
                normalized[group.upper()][cc.upper()] = [str(c).upper() for c in codes]
        prefs = normalized

    merchant.provider_prefs = prefs
    await db.commit()
    logger.info(
        "Admin %s set provider prefs for merchant %s (%s): %s",
        admin.email, merchant.name, merchant_id, prefs,
    )
    return {"merchant_id": merchant_id, "provider_prefs": prefs or {}}


@router.get("/{code}/countries/{country_code}/operators")
async def list_provider_operators(
    code: str,
    country_code: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Operators configured for this (country, provider) pair."""
    provider = await _get_provider_or_404(db, code)
    result = await db.execute(
        select(CountryOperator).where(
            CountryOperator.country_code == country_code.upper(),
            CountryOperator.provider_code == provider.code,
        ).order_by(CountryOperator.operator_code)
    )
    return [
        {
            "id": str(op.id),
            "operator_code": op.operator_code,
            "operator_name": op.operator_name,
            "service_code": op.service_code,
            "is_active": op.is_active,
            "min_amount": op.min_amount,
            "max_amount": op.max_amount,
        }
        for op in result.scalars().all()
    ]
