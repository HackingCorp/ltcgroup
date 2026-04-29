"""
Merchant management endpoints for LtcPay.
Merchants register to get API credentials, then use those to create payments.
"""

import uuid
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, and_

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import hash_api_secret, get_current_merchant, generate_api_secret
from app.models.merchant import Merchant, generate_api_key_live, generate_api_key_test
from app.models.payment import Payment, PaymentStatus
from app.models.withdrawal import Withdrawal, WithdrawalStatus
from app.schemas.merchant import (
    MerchantCreate,
    MerchantResponse,
    MerchantCredentialsResponse,
    MerchantListResponse,
    MerchantUpdate,
)
from app.api.v1.auth import get_current_admin

router = APIRouter(prefix="/merchants", tags=["Merchants"])


@router.post("/register", response_model=MerchantCredentialsResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def register_merchant(
    request: Request,
    data: MerchantCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new merchant and generate API credentials.

    Returns live/test API keys and the raw API secret. The secret is shown
    only once and must be stored securely by the merchant.

    Rate limit: 5 registrations per hour per IP to prevent abuse.
    """
    # Check if email already exists
    existing = await db.execute(
        select(Merchant).where(Merchant.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A merchant with this email already exists",
        )

    # Generate API credentials
    raw_secret = generate_api_secret()
    hashed_secret = hash_api_secret(raw_secret)

    merchant = Merchant(
        name=data.name,
        email=data.email,
        phone=data.phone,
        website=data.website,
        callback_url=data.callback_url,
        business_type=data.business_type,
        description=data.description,
        logo_url=data.logo_url,
        default_payment_mode=data.default_payment_mode,
        api_key_live=generate_api_key_live(),
        api_key_test=generate_api_key_test(),
        api_secret_hash=hashed_secret,
    )
    db.add(merchant)
    await db.commit()
    await db.refresh(merchant)

    return MerchantCredentialsResponse(
        id=merchant.id,
        name=merchant.name,
        api_key_live=merchant.api_key_live,
        api_key_test=merchant.api_key_test,
        api_secret=raw_secret,
        webhook_secret=merchant.webhook_secret,
        message="Store the api_secret securely. It cannot be retrieved again.",
    )


@router.get("/me", response_model=MerchantResponse)
async def get_merchant_profile(
    merchant: Merchant = Depends(get_current_merchant),
):
    """Get the authenticated merchant's profile."""
    return MerchantResponse.model_validate(merchant)


# ── Admin endpoints ──────────────────────────────────────────────────────

@router.get("/", response_model=MerchantListResponse)
async def list_merchants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all merchants (admin only)."""
    total_result = await db.execute(select(func.count(Merchant.id)))
    total_count = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Merchant)
        .order_by(Merchant.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    merchants = result.scalars().all()

    return MerchantListResponse(
        merchants=[MerchantResponse.model_validate(m) for m in merchants],
        total_count=total_count,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=MerchantCredentialsResponse, status_code=status.HTTP_201_CREATED)
async def create_merchant(
    data: MerchantCreate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new merchant (admin only). Returns credentials including raw API secret."""
    existing = await db.execute(
        select(Merchant).where(Merchant.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A merchant with this email already exists",
        )

    raw_secret = generate_api_secret()
    hashed_secret = hash_api_secret(raw_secret)

    merchant = Merchant(
        name=data.name,
        email=data.email,
        phone=data.phone,
        website=data.website,
        callback_url=data.callback_url,
        business_type=data.business_type,
        description=data.description,
        logo_url=data.logo_url,
        default_payment_mode=data.default_payment_mode,
        api_key_live=generate_api_key_live(),
        api_key_test=generate_api_key_test(),
        api_secret_hash=hashed_secret,
    )
    db.add(merchant)
    await db.commit()
    await db.refresh(merchant)

    return MerchantCredentialsResponse(
        id=merchant.id,
        name=merchant.name,
        api_key_live=merchant.api_key_live,
        api_key_test=merchant.api_key_test,
        api_secret=raw_secret,
        webhook_secret=merchant.webhook_secret,
        message="Store the api_secret securely. It cannot be retrieved again.",
    )


@router.get("/all/balances")
async def get_all_merchant_balances(
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get balances for all merchants (admin only). Returns dict keyed by merchant_id."""
    result = await db.execute(select(Merchant.id))
    merchant_ids = [row[0] for row in result.all()]

    balances = {}
    for mid in merchant_ids:
        balances[str(mid)] = await _compute_merchant_balance(mid, db)
    return balances


@router.get("/{merchant_id}", response_model=MerchantResponse)
async def get_merchant(
    merchant_id: uuid.UUID,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a single merchant by ID (admin only)."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return MerchantResponse.model_validate(merchant)


@router.patch("/{merchant_id}", response_model=MerchantResponse)
async def update_merchant(
    merchant_id: uuid.UUID,
    data: MerchantUpdate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a merchant (admin only)."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(merchant, field, value)

    await db.commit()
    await db.refresh(merchant)
    return MerchantResponse.model_validate(merchant)


@router.delete("/{merchant_id}")
async def delete_merchant(
    merchant_id: uuid.UUID,
    force: bool = Query(False, description="Force delete even if merchant has payments"),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a merchant (admin only). Returns 409 if merchant has payments unless force=true."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    # Count associated payments
    count_result = await db.execute(
        select(func.count(Payment.id)).where(Payment.merchant_id == merchant_id)
    )
    payment_count = count_result.scalar() or 0

    if payment_count > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Merchant has {payment_count} payment(s). Use force=true to delete anyway.",
        )

    # cascade="all, delete-orphan" on the relationship handles payment deletion at ORM level
    await db.delete(merchant)
    await db.commit()

    return {
        "detail": f"Merchant '{merchant.name}' deleted successfully",
        "payments_deleted": payment_count,
    }


@router.post("/{merchant_id}/regenerate-api-secret", response_model=MerchantCredentialsResponse)
async def regenerate_api_secret(
    merchant_id: uuid.UUID,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate the API secret for a merchant (admin only). Returns new raw secret."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    raw_secret = generate_api_secret()
    merchant.api_secret_hash = hash_api_secret(raw_secret)

    await db.commit()
    await db.refresh(merchant)

    return MerchantCredentialsResponse(
        id=merchant.id,
        name=merchant.name,
        api_key_live=merchant.api_key_live,
        api_key_test=merchant.api_key_test,
        api_secret=raw_secret,
        webhook_secret=merchant.webhook_secret,
        message="New API secret generated. Store it securely.",
    )


@router.post("/{merchant_id}/regenerate-webhook-secret")
async def regenerate_webhook_secret(
    merchant_id: uuid.UUID,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate the webhook secret for a merchant (admin only)."""
    import secrets as _secrets

    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    merchant.webhook_secret = _secrets.token_hex(32)

    await db.commit()
    await db.refresh(merchant)

    return {
        "id": str(merchant.id),
        "name": merchant.name,
        "webhook_secret": merchant.webhook_secret,
        "message": "New webhook secret generated. Update your webhook handler.",
    }


async def _compute_merchant_balance(merchant_id, db: AsyncSession) -> dict:
    """Compute balance for a given merchant (admin use)."""
    # Total earned from COMPLETED payments
    earned_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            and_(
                Payment.merchant_id == merchant_id,
                Payment.status == PaymentStatus.COMPLETED,
            )
        )
    )
    total_earned = Decimal(str(earned_q.scalar() or 0))

    # Total fees
    fees_q = await db.execute(
        select(func.coalesce(func.sum(Payment.fee), 0)).where(
            and_(
                Payment.merchant_id == merchant_id,
                Payment.status == PaymentStatus.COMPLETED,
            )
        )
    )
    total_fees = Decimal(str(fees_q.scalar() or 0))

    # Total completed withdrawals
    withdrawn_q = await db.execute(
        select(func.coalesce(func.sum(Withdrawal.amount), 0)).where(
            and_(
                Withdrawal.merchant_id == merchant_id,
                Withdrawal.status == WithdrawalStatus.COMPLETED,
            )
        )
    )
    total_withdrawn = Decimal(str(withdrawn_q.scalar() or 0))

    # Pending/approved/processing withdrawals
    pending_q = await db.execute(
        select(func.coalesce(func.sum(Withdrawal.amount), 0)).where(
            and_(
                Withdrawal.merchant_id == merchant_id,
                Withdrawal.status.in_([
                    WithdrawalStatus.PENDING,
                    WithdrawalStatus.APPROVED,
                    WithdrawalStatus.PROCESSING,
                ]),
            )
        )
    )
    pending_withdrawals = Decimal(str(pending_q.scalar() or 0))

    # Payment counts
    payment_count_q = await db.execute(
        select(func.count(Payment.id)).where(Payment.merchant_id == merchant_id)
    )
    total_payments = payment_count_q.scalar() or 0

    completed_count_q = await db.execute(
        select(func.count(Payment.id)).where(
            and_(
                Payment.merchant_id == merchant_id,
                Payment.status == PaymentStatus.COMPLETED,
            )
        )
    )
    completed_payments = completed_count_q.scalar() or 0

    available_balance = total_earned - total_fees - total_withdrawn - pending_withdrawals

    return {
        "total_earned": float(total_earned),
        "total_fees": float(total_fees),
        "total_withdrawn": float(total_withdrawn),
        "pending_withdrawals": float(pending_withdrawals),
        "available_balance": float(max(available_balance, Decimal("0.00"))),
        "total_payments": total_payments,
        "completed_payments": completed_payments,
        "currency": "XAF",
    }


@router.get("/{merchant_id}/balance")
async def get_merchant_balance(
    merchant_id: uuid.UUID,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get balance info for a specific merchant (admin only)."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return await _compute_merchant_balance(merchant.id, db)


@router.get("/{merchant_id}/payments")
async def get_merchant_payments(
    merchant_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List payments for a specific merchant (admin only)."""
    # Verify merchant exists
    m_result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    if not m_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Merchant not found")

    filters = [Payment.merchant_id == merchant_id]
    if status:
        try:
            ps = PaymentStatus(status)
            filters.append(Payment.status == ps)
        except ValueError:
            pass

    count_q = await db.execute(
        select(func.count(Payment.id)).where(and_(*filters))
    )
    total = count_q.scalar() or 0

    offset = (page - 1) * per_page
    result = await db.execute(
        select(Payment)
        .where(and_(*filters))
        .order_by(Payment.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    payments = result.scalars().all()

    items = []
    for p in payments:
        items.append({
            "id": str(p.id),
            "reference": p.reference,
            "amount": float(p.amount),
            "fee": float(p.fee) if p.fee else 0,
            "currency": p.currency,
            "status": p.status.value,
            "description": p.description,
            "payment_method": p.method.value if p.method else None,
            "operator": p.operator.value if p.operator else None,
            "customer_email": p.customer_info.get("email") if p.customer_info else None,
            "customer_phone": p.customer_info.get("phone") if p.customer_info else None,
            "customer_name": p.customer_info.get("name") if p.customer_info else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })

    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/{merchant_id}/withdrawals")
async def get_merchant_withdrawals(
    merchant_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List withdrawals for a specific merchant (admin only)."""
    m_result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    if not m_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Merchant not found")

    filters = [Withdrawal.merchant_id == merchant_id]
    if status:
        try:
            ws = WithdrawalStatus(status)
            filters.append(Withdrawal.status == ws)
        except ValueError:
            pass

    count_q = await db.execute(
        select(func.count(Withdrawal.id)).where(and_(*filters))
    )
    total = count_q.scalar() or 0

    offset = (page - 1) * per_page
    result = await db.execute(
        select(Withdrawal)
        .where(and_(*filters))
        .order_by(Withdrawal.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    withdrawals = result.scalars().all()

    items = []
    for w in withdrawals:
        items.append({
            "id": str(w.id),
            "reference": w.reference,
            "amount": float(w.amount),
            "fee": float(w.fee),
            "currency": w.currency,
            "method": w.method.value,
            "status": w.status.value,
            "mobile_money_number": w.mobile_money_number,
            "mobile_money_operator": w.mobile_money_operator,
            "bank_name": w.bank_name,
            "bank_account_number": w.bank_account_number,
            "bank_account_name": w.bank_account_name,
            "admin_note": w.admin_note,
            "processed_at": w.processed_at.isoformat() if w.processed_at else None,
            "created_at": w.created_at.isoformat() if w.created_at else None,
            "updated_at": w.updated_at.isoformat() if w.updated_at else None,
        })

    return {"items": items, "total": total, "page": page, "per_page": per_page}
