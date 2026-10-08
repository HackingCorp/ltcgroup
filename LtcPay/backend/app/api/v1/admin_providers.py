"""
Admin API - Payment Provider Management

- List providers with their global kill-switch and country coverage
- Toggle a provider globally (all countries at once) or per country
- Configure account-level credentials (encrypted at rest)
- Set the default / secondary provider per country via priorities
"""
import logging
from datetime import datetime, timezone

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


# ── SebPay operator sync ─────────────────────────────────────────
# SebPay identifies operators by its own code ("mtn", "MTN" in Cameroon,
# "togocom"), stored as service_code on SEBPAY operator rows. Its catalogue
# also says which operators need a payer OTP (Orange CI/BF) and which USSD
# gives it: both land on the row (otp_required, ussd_code), and the checkout
# and the merchant API ask the payer for the code.

@router.post("/sebpay/sync-operators")
async def sync_sebpay_operators(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create/update SEBPAY operator rows from SebPay's GET /operators.

    Only countries we already have are touched. New rows start active when
    SebPay can collect on them; existing rows keep the admin's is_active,
    except that an operator SebPay has disabled is deactivated. The OTP flag
    and its USSD always follow SebPay. Never creates country links: routing
    SebPay in a country stays an explicit choice (PUT /SEBPAY/countries/{cc}).
    """
    from app.services.sebpay_service import SebPayError, sebpay_service, to_operator_code

    provider = await _get_provider_or_404(db, "SEBPAY")
    try:
        catalogue = await sebpay_service.list_operators(provider)
    except SebPayError as exc:
        raise HTTPException(status_code=502, detail=f"SebPay: {exc}")

    countries = {
        c.code: c for c in (await db.execute(select(SupportedCountry))).scalars().all()
    }
    existing_ops = (await db.execute(select(CountryOperator))).scalars().all()
    sebpay_rows = {
        (op.country_code, op.operator_code): op
        for op in existing_ops if op.provider_code == "SEBPAY"
    }
    # Another provider's row for the same operator lends its display
    # settings (colour, prefixes, limits) so both rows behave alike.
    siblings = {
        (op.country_code, op.operator_code): op
        for op in existing_ops if op.provider_code != "SEBPAY"
    }

    created, updated = [], []
    otp_operators: list[str] = []
    unsupported_countries: set[str] = set()

    for item in catalogue:
        country = item.get("country") if isinstance(item.get("country"), dict) else {}
        cc = str(country.get("country_code") or "").upper()
        sebpay_code = str(item.get("code") or "").strip()
        if not cc or not sebpay_code:
            continue
        if cc not in countries:
            unsupported_countries.add(cc)
            continue

        operator_code = to_operator_code(sebpay_code)
        collectable = bool(item.get("is_active")) and bool(item.get("payin_enabled", True))
        otp_required = bool(item.get("otp_required"))
        otp_ussd = str(item.get("ussd_code") or "")[:20] if otp_required else ""
        label = f"{cc}/{operator_code} ({sebpay_code})"
        if otp_required:
            otp_operators.append(f"{label}: {otp_ussd or 'USSD inconnu'}")

        row = sebpay_rows.get((cc, operator_code))
        if row is None:
            sibling = siblings.get((cc, operator_code))
            row = CountryOperator(
                country_code=cc,
                provider_code="SEBPAY",
                operator_code=operator_code,
                operator_name=(sibling.operator_name if sibling else None) or str(item.get("name") or operator_code)[:100],
                service_code=sebpay_code,
                color=sibling.color if sibling else "#000000",
                logo_url=(sibling.logo_url if sibling else "") or str(item.get("logo_url") or "")[:500],
                min_amount=sibling.min_amount if sibling else countries[cc].min_amount,
                max_amount=sibling.max_amount if sibling else countries[cc].max_amount,
                # For an OTP operator this is the code that gives the OTP.
                ussd_code=otp_ussd or (sibling.ussd_code if sibling else "") or "",
                phone_prefixes=list(sibling.phone_prefixes or []) if sibling else [],
                otp_required=otp_required,
                is_active=collectable,
            )
            db.add(row)
            sebpay_rows[(cc, operator_code)] = row
            created.append(label)
            continue

        changed = False
        if row.service_code != sebpay_code:
            row.service_code = sebpay_code
            changed = True
        if row.otp_required != otp_required:
            row.otp_required = otp_required
            changed = True
        if otp_required and otp_ussd and row.ussd_code != otp_ussd:
            row.ussd_code = otp_ussd
            changed = True
        if row.is_active and not collectable:
            row.is_active = False
            changed = True
        if changed:
            updated.append(label)

    await db.commit()

    logger.info(
        "Admin %s synced SebPay operators: %d created, %d updated, %d with OTP",
        admin.email, len(created), len(updated), len(otp_operators),
    )
    return {
        "created": created,
        "updated": updated,
        "countries_not_configured": sorted(unsupported_countries),
        "otp_operators": sorted(otp_operators),
    }


# ── TouchPay partner API ─────────────────────────────────────────
# Three endpoints TouchPay documents but that had no caller here: the agency
# float, a payin status lookup, and outbound cash-in. The float matters most
# operationally — a float at zero produces exactly the kind of mass
# unexplained refusals that took three days to diagnose on Gabon.

class CashinRequest(BaseModel):
    service_id: str = Field(..., min_length=3, max_length=64)
    recipient_phone_number: str = Field(..., min_length=6, max_length=20)
    amount: int = Field(..., gt=0)
    partner_transaction_id: str = Field(..., min_length=3, max_length=64)


@router.get("/touchpay/balances")
async def touchpay_balances(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """The TouchPay float of every active country, in one call.

    One agency running dry produces exactly the kind of unexplained mass
    failure that took three days to read on Gabon, and until now nothing
    showed the float at all. Countries without partner credentials are
    listed too, saying so — leaving them out would make an unconfigured
    country look like a healthy one.

    Never raises for a single country: one unreachable agency must not hide
    the others.
    """
    from app.services.touchpay_partner_service import (
        TouchPayPartnerError, touchpay_partner_service,
    )

    rows = (await db.execute(
        select(SupportedCountry)
        .where(SupportedCountry.is_active == True)  # noqa: E712
        .order_by(SupportedCountry.code)
    )).scalars().all()

    balances = []
    for country in rows:
        entry = {
            "country_code": country.code,
            "country_name": country.name,
            "currency": country.currency,
            "agency_code": country.tp_agency_code or None,
            "amount": None,
            "configured": True,
            "refused": False,
            "status_code": None,
            "error": None,
        }
        try:
            result = await touchpay_partner_service.get_balance(db, country.code)
            entry["amount"] = result["amount"]
            # get_balance answers with a figure and no currency, so keep the
            # country's own rather than showing an amount with no unit.
            entry["currency"] = result["currency"] or country.currency
        except TouchPayPartnerError as exc:
            # "Refused" and "unreadable" call for different reactions, and
            # showing both as "illisible" told nobody anything: the
            # credentials were saved and TouchPay was rejecting them.
            entry["error"] = str(exc)
            entry["configured"] = "not configured" not in str(exc)
            entry["status_code"] = exc.status_code
            entry["refused"] = entry["configured"] and exc.status_code is not None
        except Exception as exc:  # noqa: BLE001 - one country must not sink the page
            logger.warning("Balance lookup failed for %s: %s", country.code, exc)
            entry["error"] = f"{type(exc).__name__}: {exc}"
        balances.append(entry)

    return {
        "balances": balances,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/touchpay/{country_code}/balance")
async def touchpay_balance(
    country_code: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Current TouchPay float for a country's agency."""
    from app.services.touchpay_partner_service import (
        TouchPayPartnerError, touchpay_partner_service,
    )
    try:
        return await touchpay_partner_service.get_balance(db, country_code.upper())
    except TouchPayPartnerError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.get("/touchpay/{country_code}/status/{reference}")
async def touchpay_check_status(
    country_code: str,
    reference: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Ask TouchPay what it thinks of one payment. Read-only."""
    from app.services.touchpay_partner_service import (
        TouchPayPartnerError, touchpay_partner_service,
    )
    try:
        verdict = await touchpay_partner_service.check_status(db, country_code.upper(), reference)
    except TouchPayPartnerError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    if verdict is None:
        raise HTTPException(status_code=404, detail="TouchPay returned no readable status")
    return verdict


@router.post("/touchpay/{country_code}/cashin")
async def touchpay_cashin(
    country_code: str,
    payload: CashinRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send money OUT to a mobile wallet.

    Admin-only and never called automatically: this debits the agency float.
    partner_transaction_id must be unique and is the caller's to choose, so a
    retry can be made idempotent on TouchPay's side rather than double-paying.
    """
    from app.services.touchpay_partner_service import (
        TouchPayPartnerError, touchpay_partner_service,
    )
    logger.warning(
        "Admin %s initiating cashin: %s %s to %s (ref=%s)",
        admin.email, payload.amount, country_code.upper(),
        payload.recipient_phone_number, payload.partner_transaction_id,
    )
    try:
        return await touchpay_partner_service.cashin(
            db, country_code.upper(),
            service_id=payload.service_id,
            recipient_phone_number=payload.recipient_phone_number,
            amount=payload.amount,
            partner_transaction_id=payload.partner_transaction_id,
        )
    except TouchPayPartnerError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
