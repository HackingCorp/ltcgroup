"""
LtcPay - Admin Country Management Endpoints

CRUD for countries, operators, and merchant country restrictions.
All endpoints require admin authentication.
"""
import logging
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.encryption import encrypt_value, decrypt_value
from app.api.v1.auth import get_current_admin
from app.models.admin_user import AdminUser
from app.models.country import SupportedCountry, CountryOperator, MerchantCountry
from app.models.payment import Payment
from app.schemas.country import (
    CountryCreate, CountryUpdate, CountryResponse, CountryDetailResponse,
    OperatorCreate, OperatorUpdate, OperatorResponse,
    MerchantCountryResponse, MerchantCountryToggle,
    CountryTestCheck, CountryTestResult,
)

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "operators"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/countries", tags=["Admin Countries"])


def _country_to_response(country: SupportedCountry) -> CountryResponse:
    creds_ok = bool(country.tp_agency_code and country.tp_merchant_id)
    return CountryResponse(
        code=country.code,
        name=country.name,
        currency=country.currency,
        phone_prefix=country.phone_prefix,
        phone_digits=country.phone_digits,
        phone_pattern=country.phone_pattern,
        flag_emoji=country.flag_emoji,
        default_city=country.default_city,
        min_amount=country.min_amount,
        max_amount=country.max_amount,
        credentials_configured=creds_ok,
        is_active=country.is_active,
        created_at=country.created_at,
        updated_at=country.updated_at,
    )


def _country_to_detail(country: SupportedCountry) -> CountryDetailResponse:
    base = _country_to_response(country)
    ops = [OperatorResponse.model_validate(op) for op in (country.operators or [])]
    return CountryDetailResponse(**base.model_dump(), operators=ops)


# ---------------------------------------------------------------------------
# Countries CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[CountryResponse])
async def list_countries(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all countries (active + inactive)."""
    try:
        result = await db.execute(
            select(SupportedCountry).order_by(SupportedCountry.name)
        )
        countries = result.scalars().all()
        return [_country_to_response(c) for c in countries]
    except Exception as exc:
        logger.exception("Failed to list countries: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("", response_model=CountryDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_country(
    payload: CountryCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new country with optional credentials."""
    code = payload.code.upper()

    existing = await db.execute(
        select(SupportedCountry).where(SupportedCountry.code == code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Country '{code}' already exists")

    creds = payload.credentials
    country = SupportedCountry(
        code=code,
        name=payload.name,
        currency=payload.currency.upper(),
        phone_prefix=payload.phone_prefix,
        phone_digits=payload.phone_digits,
        phone_pattern=payload.phone_pattern,
        flag_emoji=payload.flag_emoji,
        default_city=payload.default_city,
        min_amount=payload.min_amount,
        max_amount=payload.max_amount,
        is_active=payload.is_active,
        tp_agency_code=creds.agency_code if creds else "",
        tp_login=creds.login if creds else "",
        tp_password=encrypt_value(creds.password) if creds and creds.password else "",
        tp_secret=encrypt_value(creds.secret) if creds and creds.secret else "",
        tp_merchant_id=creds.merchant_id if creds else "",
        tp_secure_code=encrypt_value(creds.secure_code) if creds and creds.secure_code else "",
        tp_merchant_website=creds.merchant_website if creds else "",
        tp_sdk_url=creds.sdk_url if creds else "https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.1.js",
        tp_direct_api_url=creds.direct_api_url if creds else "https://apidist.gutouch.net/apidist/sec/touchpayapi",
    )
    db.add(country)
    await db.commit()
    await db.refresh(country, attribute_names=["operators"])

    logger.info("Country created: %s (%s) by admin %s", code, payload.name, admin.email)
    return _country_to_detail(country)


@router.get("/{code}", response_model=CountryDetailResponse)
async def get_country(
    code: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get country details (credentials masked)."""
    result = await db.execute(
        select(SupportedCountry)
        .options(selectinload(SupportedCountry.operators))
        .where(SupportedCountry.code == code.upper())
    )
    country = result.scalar_one_or_none()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return _country_to_detail(country)


@router.get("/{code}/credentials")
async def get_country_credentials(
    code: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get decrypted TouchPay credentials for a country (admin only)."""
    result = await db.execute(
        select(SupportedCountry).where(SupportedCountry.code == code.upper())
    )
    country = result.scalar_one_or_none()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    return {
        "agency_code": country.tp_agency_code or "",
        "login": country.tp_login or "",
        "password": decrypt_value(country.tp_password) if country.tp_password else "",
        "secret": decrypt_value(country.tp_secret) if country.tp_secret else "",
        "merchant_id": country.tp_merchant_id or "",
        "secure_code": decrypt_value(country.tp_secure_code) if country.tp_secure_code else "",
        "merchant_website": country.tp_merchant_website or "",
        "sdk_url": country.tp_sdk_url or "",
        "direct_api_url": country.tp_direct_api_url or "",
    }


@router.patch("/{code}", response_model=CountryDetailResponse)
async def update_country(
    code: str,
    payload: CountryUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a country's metadata, credentials, or active status."""
    result = await db.execute(
        select(SupportedCountry)
        .options(selectinload(SupportedCountry.operators))
        .where(SupportedCountry.code == code.upper())
    )
    country = result.scalar_one_or_none()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    # Update simple fields
    for field in ("name", "currency", "phone_prefix", "phone_digits", "phone_pattern",
                  "flag_emoji", "default_city", "min_amount", "max_amount", "is_active"):
        val = getattr(payload, field, None)
        if val is not None:
            if field == "currency":
                val = val.upper()
            setattr(country, field, val)

    # Update credentials if provided
    if payload.credentials:
        creds = payload.credentials
        if creds.agency_code:
            country.tp_agency_code = creds.agency_code
        if creds.login:
            country.tp_login = creds.login
        if creds.password:
            country.tp_password = encrypt_value(creds.password)
        if creds.secret:
            country.tp_secret = encrypt_value(creds.secret)
        if creds.merchant_id:
            country.tp_merchant_id = creds.merchant_id
        if creds.secure_code:
            country.tp_secure_code = encrypt_value(creds.secure_code)
        if creds.merchant_website:
            country.tp_merchant_website = creds.merchant_website
        if creds.sdk_url:
            country.tp_sdk_url = creds.sdk_url
        if creds.direct_api_url:
            country.tp_direct_api_url = creds.direct_api_url

    await db.commit()
    await db.refresh(country, attribute_names=["operators"])

    logger.info("Country updated: %s by admin %s", code.upper(), admin.email)
    return _country_to_detail(country)


@router.delete("/{code}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_country(
    code: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a country (only if no payments reference it)."""
    code = code.upper()
    result = await db.execute(
        select(SupportedCountry).where(SupportedCountry.code == code)
    )
    country = result.scalar_one_or_none()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    # Check for linked payments
    pay_count = await db.execute(
        select(Payment.id).where(Payment.country == code).limit(1)
    )
    if pay_count.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Cannot delete country with existing payments. Deactivate instead.",
        )

    await db.delete(country)
    await db.commit()
    logger.info("Country deleted: %s by admin %s", code, admin.email)


# ---------------------------------------------------------------------------
# Integration test
# ---------------------------------------------------------------------------

@router.post("/{code}/test", response_model=CountryTestResult)
async def test_country_integration(
    code: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Test TouchPay integration for a country without making a real payment.

    Runs 5 checks: credentials completeness, Direct API connectivity,
    Direct API authentication, SDK URL reachability, and operator configuration.
    """
    code = code.upper()

    # Load country (any status, not just active)
    result = await db.execute(
        select(SupportedCountry)
        .options(selectinload(SupportedCountry.operators))
        .where(SupportedCountry.code == code)
    )
    country = result.scalar_one_or_none()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    checks: list[CountryTestCheck] = []

    # Decrypt credentials (per-country DB values, fallback to global env vars)
    creds = {
        "agency_code": country.tp_agency_code or settings.TOUCHPAY_DIRECT_AGENCY_CODE,
        "login": country.tp_login or settings.TOUCHPAY_DIRECT_LOGIN,
        "password": (decrypt_value(country.tp_password) if country.tp_password else "") or settings.TOUCHPAY_DIRECT_PASSWORD,
        "merchant_id": country.tp_merchant_id or settings.TOUCHPAY_MERCHANT_ID,
        "secure_code": (decrypt_value(country.tp_secure_code) if country.tp_secure_code else "") or settings.TOUCHPAY_SECURE_CODE,
        "sdk_url": country.tp_sdk_url or settings.TOUCHPAY_SDK_URL,
        "direct_api_url": country.tp_direct_api_url or settings.TOUCHPAY_DIRECT_API_URL,
    }

    # -- Check 1: Credentials completeness --
    required_fields = ["agency_code", "login", "password", "merchant_id", "secure_code"]
    missing = [f for f in required_fields if not creds[f]]
    creds_ok = len(missing) == 0

    if creds_ok:
        checks.append(CountryTestCheck(
            name="credentials_complete",
            status="pass",
            message=f"All {len(required_fields)} required credentials are configured",
        ))
    else:
        checks.append(CountryTestCheck(
            name="credentials_complete",
            status="fail",
            message=f"Missing credentials: {', '.join(missing)}",
        ))

    # -- Check 2 & 3: Direct API (skip if credentials incomplete) --
    if creds_ok:
        api_url = creds["direct_api_url"]
        agency_code = creds["agency_code"]
        login = creds["login"]
        password = creds["password"]
        url = (
            f"{api_url.rstrip('/')}/{agency_code}/transaction"
            f"?loginAgent={login}&passwordAgent={password}"
        )
        test_body = {"idFromClient": "TEST-PING", "amount": "1"}

        # Check 2: Connectivity (PUT without Digest Auth)
        try:
            start = time.monotonic()
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.put(url, json=test_body)
            latency = round((time.monotonic() - start) * 1000)
            checks.append(CountryTestCheck(
                name="direct_api_connectivity",
                status="pass",
                message=f"TouchPay Direct API reachable ({resp.status_code} in {latency}ms)",
                latency_ms=latency,
            ))
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            checks.append(CountryTestCheck(
                name="direct_api_connectivity",
                status="fail",
                message=f"Cannot reach TouchPay Direct API: {type(exc).__name__}",
            ))
            # Skip auth check if server unreachable
            checks.append(CountryTestCheck(
                name="direct_api_auth",
                status="fail",
                message="Skipped (server unreachable)",
            ))
        else:
            # Check 3: Authentication (PUT with Digest Auth)
            try:
                start = time.monotonic()
                auth = httpx.DigestAuth(login, password)
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.put(url, json=test_body, auth=auth)
                latency = round((time.monotonic() - start) * 1000)

                if resp.status_code == 401:
                    checks.append(CountryTestCheck(
                        name="direct_api_auth",
                        status="fail",
                        message="Digest authentication rejected (401)",
                        latency_ms=latency,
                    ))
                else:
                    checks.append(CountryTestCheck(
                        name="direct_api_auth",
                        status="pass",
                        message="Digest authentication accepted",
                        latency_ms=latency,
                    ))
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                checks.append(CountryTestCheck(
                    name="direct_api_auth",
                    status="fail",
                    message=f"Auth request failed: {type(exc).__name__}",
                ))
    else:
        checks.append(CountryTestCheck(
            name="direct_api_connectivity",
            status="fail",
            message="Skipped (credentials incomplete)",
        ))
        checks.append(CountryTestCheck(
            name="direct_api_auth",
            status="fail",
            message="Skipped (credentials incomplete)",
        ))

    # -- Check 4: SDK URL reachable --
    sdk_url = creds["sdk_url"]
    if sdk_url:
        try:
            start = time.monotonic()
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.head(sdk_url)
            latency = round((time.monotonic() - start) * 1000)
            if resp.status_code == 200:
                checks.append(CountryTestCheck(
                    name="sdk_url_reachable",
                    status="pass",
                    message="SDK JS file reachable (200)",
                    latency_ms=latency,
                ))
            else:
                checks.append(CountryTestCheck(
                    name="sdk_url_reachable",
                    status="fail",
                    message=f"SDK URL returned HTTP {resp.status_code}",
                    latency_ms=latency,
                ))
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            checks.append(CountryTestCheck(
                name="sdk_url_reachable",
                status="fail",
                message=f"Cannot reach SDK URL: {type(exc).__name__}",
            ))
    else:
        checks.append(CountryTestCheck(
            name="sdk_url_reachable",
            status="fail",
            message="SDK URL not configured",
        ))

    # -- Check 5: Operators configured --
    active_ops = [
        op for op in (country.operators or [])
        if op.is_active and op.service_code
    ]
    if active_ops:
        op_names = ", ".join(op.operator_code for op in active_ops)
        checks.append(CountryTestCheck(
            name="operators_configured",
            status="pass",
            message=f"{len(active_ops)} active operator(s) with service codes ({op_names})",
        ))
    else:
        checks.append(CountryTestCheck(
            name="operators_configured",
            status="fail",
            message="No active operators with service codes configured",
        ))

    # Compute overall status
    statuses = [c.status for c in checks]
    if all(s == "pass" for s in statuses):
        overall = "pass"
    elif all(s == "fail" for s in statuses):
        overall = "fail"
    else:
        overall = "partial"

    logger.info("Country integration test: %s → %s by admin %s", code, overall, admin.email)

    return CountryTestResult(
        country_code=code,
        overall_status=overall,
        checks=checks,
        tested_at=datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Operators CRUD
# ---------------------------------------------------------------------------

@router.get("/{code}/operators", response_model=list[OperatorResponse])
async def list_operators(
    code: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all operators for a country."""
    result = await db.execute(
        select(CountryOperator)
        .where(CountryOperator.country_code == code.upper())
        .order_by(CountryOperator.operator_code)
    )
    return [OperatorResponse.model_validate(op) for op in result.scalars().all()]


@router.post("/{code}/operators", response_model=OperatorResponse, status_code=status.HTTP_201_CREATED)
async def create_operator(
    code: str,
    payload: OperatorCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Add an operator to a country."""
    code = code.upper()
    # Verify country exists
    country = await db.execute(
        select(SupportedCountry).where(SupportedCountry.code == code)
    )
    if not country.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Country not found")

    # Check uniqueness
    existing = await db.execute(
        select(CountryOperator).where(
            CountryOperator.country_code == code,
            CountryOperator.operator_code == payload.operator_code.upper(),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Operator '{payload.operator_code}' already exists for {code}",
        )

    op = CountryOperator(
        country_code=code,
        operator_code=payload.operator_code.upper(),
        operator_name=payload.operator_name,
        service_code=payload.service_code,
        color=payload.color,
        logo_url=payload.logo_url,
        min_amount=payload.min_amount,
        max_amount=payload.max_amount,
        ussd_code=payload.ussd_code,
        is_active=payload.is_active,
    )
    db.add(op)
    await db.commit()
    await db.refresh(op)

    logger.info("Operator created: %s/%s by admin %s", code, payload.operator_code, admin.email)
    return OperatorResponse.model_validate(op)


@router.patch("/{code}/operators/{op_id}", response_model=OperatorResponse)
async def update_operator(
    code: str,
    op_id: uuid.UUID,
    payload: OperatorUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update an operator."""
    result = await db.execute(
        select(CountryOperator).where(
            CountryOperator.id == op_id,
            CountryOperator.country_code == code.upper(),
        )
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")

    for field in ("operator_code", "operator_name", "service_code", "color", "logo_url", "min_amount", "max_amount", "ussd_code", "is_active"):
        val = getattr(payload, field, None)
        if val is not None:
            if field == "operator_code":
                val = val.upper()
            setattr(op, field, val)

    await db.commit()
    await db.refresh(op)

    logger.info("Operator updated: %s/%s by admin %s", code.upper(), op.operator_code, admin.email)
    return OperatorResponse.model_validate(op)


@router.delete("/{code}/operators/{op_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_operator(
    code: str,
    op_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete an operator."""
    result = await db.execute(
        select(CountryOperator).where(
            CountryOperator.id == op_id,
            CountryOperator.country_code == code.upper(),
        )
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")

    await db.delete(op)
    await db.commit()
    logger.info("Operator deleted: %s/%s by admin %s", code.upper(), op.operator_code, admin.email)


@router.post("/{code}/operators/{op_id}/logo", response_model=OperatorResponse)
async def upload_operator_logo(
    code: str,
    op_id: uuid.UUID,
    file: UploadFile = File(...),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upload a logo image for an operator."""
    result = await db.execute(
        select(CountryOperator).where(
            CountryOperator.id == op_id,
            CountryOperator.country_code == code.upper(),
        )
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")

    # Validate file type
    if file.content_type not in ("image/png", "image/jpeg", "image/webp", "image/svg+xml"):
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, WebP, and SVG images are allowed")

    # Read and save file
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:  # 2 MB
        raise HTTPException(status_code=400, detail="File too large (max 2 MB)")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "png"
    if ext not in ("png", "jpg", "jpeg", "webp", "svg"):
        ext = "png"
    filename = f"{code.upper()}_{op.operator_code}.{ext}"

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOAD_DIR / filename
    dest.write_bytes(content)

    op.logo_url = f"/static/operators/{filename}"
    await db.commit()
    await db.refresh(op)

    logger.info("Operator logo uploaded: %s/%s -> %s by admin %s", code.upper(), op.operator_code, filename, admin.email)
    return OperatorResponse.model_validate(op)


# ---------------------------------------------------------------------------
# Merchant country restrictions
# ---------------------------------------------------------------------------

merchant_router = APIRouter(prefix="/admin/merchants", tags=["Admin Merchant Countries"])


@merchant_router.get("/{merchant_id}/countries", response_model=list[MerchantCountryResponse])
async def list_merchant_countries(
    merchant_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List country restrictions for a merchant."""
    result = await db.execute(
        select(MerchantCountry, SupportedCountry.name)
        .join(SupportedCountry, MerchantCountry.country_code == SupportedCountry.code)
        .where(MerchantCountry.merchant_id == merchant_id)
        .order_by(SupportedCountry.name)
    )
    return [
        MerchantCountryResponse(
            country_code=mc.country_code,
            country_name=name,
            is_active=mc.is_active,
        )
        for mc, name in result.all()
    ]


@merchant_router.put("/{merchant_id}/countries/{code}", response_model=MerchantCountryResponse)
async def set_merchant_country(
    merchant_id: uuid.UUID,
    code: str,
    payload: MerchantCountryToggle,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Enable or disable a country for a merchant."""
    code = code.upper()

    # Verify country exists
    country_result = await db.execute(
        select(SupportedCountry).where(SupportedCountry.code == code)
    )
    country = country_result.scalar_one_or_none()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    # Upsert
    result = await db.execute(
        select(MerchantCountry).where(
            MerchantCountry.merchant_id == merchant_id,
            MerchantCountry.country_code == code,
        )
    )
    mc = result.scalar_one_or_none()
    if mc:
        mc.is_active = payload.is_active
    else:
        mc = MerchantCountry(
            merchant_id=merchant_id,
            country_code=code,
            is_active=payload.is_active,
        )
        db.add(mc)

    await db.commit()

    logger.info(
        "Merchant %s country %s set to %s by admin %s",
        merchant_id, code, payload.is_active, admin.email,
    )
    return MerchantCountryResponse(
        country_code=code,
        country_name=country.name,
        is_active=payload.is_active,
    )


@merchant_router.delete("/{merchant_id}/countries/{code}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_merchant_country(
    merchant_id: uuid.UUID,
    code: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove a country restriction for a merchant (= allow by default)."""
    code = code.upper()
    result = await db.execute(
        select(MerchantCountry).where(
            MerchantCountry.merchant_id == merchant_id,
            MerchantCountry.country_code == code,
        )
    )
    mc = result.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Restriction not found")

    await db.delete(mc)
    await db.commit()
    logger.info("Merchant %s country restriction %s removed by admin %s", merchant_id, code, admin.email)
