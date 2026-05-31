"""Merchant billing/invoices endpoints."""
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment, PaymentStatus
from app.api.v1.merchant_auth import get_current_merchant_jwt

router = APIRouter(prefix="/merchant-dashboard/billing", tags=["Merchant Billing"])


def _serialize_invoice(inv: Invoice) -> dict:
    return {
        "id": str(inv.id),
        "reference": inv.reference,
        "period_start": inv.period_start.isoformat(),
        "period_end": inv.period_end.isoformat(),
        "period_label": inv.period_label,
        "amount": float(inv.amount),
        "volume_processed": float(inv.volume_processed),
        "fee_rate_applied": inv.fee_rate_applied,
        "status": inv.status.value if hasattr(inv.status, "value") else str(inv.status),
        "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
        "created_at": inv.created_at.isoformat(),
    }


@router.get("/invoices")
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """List invoices for the current merchant."""
    filters = [Invoice.merchant_id == merchant.id]

    count_q = await db.execute(
        select(func.count(Invoice.id)).where(and_(*filters))
    )
    total = count_q.scalar() or 0

    offset = (page - 1) * page_size
    items_q = await db.execute(
        select(Invoice)
        .where(and_(*filters))
        .order_by(Invoice.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = items_q.scalars().all()

    return {
        "items": [_serialize_invoice(inv) for inv in items],
        "total": total,
        "page": page,
        "per_page": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


@router.get("/invoices/{ref}")
async def get_invoice(
    ref: str,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get an invoice by reference."""
    result = await db.execute(
        select(Invoice).where(
            and_(Invoice.reference == ref, Invoice.merchant_id == merchant.id)
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return _serialize_invoice(invoice)


@router.get("/current")
async def get_current_invoice(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Compute the current month's invoice dynamically from completed payments."""
    now = datetime.now(timezone.utc)
    year = now.year
    month = now.month

    # Sum completed payments this month
    agg_q = await db.execute(
        select(
            func.coalesce(func.sum(Payment.amount), 0),
            func.coalesce(func.sum(Payment.fee), 0),
        ).where(
            and_(
                Payment.merchant_id == merchant.id,
                Payment.status == PaymentStatus.COMPLETED,
                extract("year", Payment.created_at) == year,
                extract("month", Payment.created_at) == month,
            )
        )
    )
    row = agg_q.one()
    volume_processed = float(row[0] or 0)
    total_fees = float(row[1] or 0)

    # If fees are zero, compute from fee_rate
    fee_rate = float(merchant.fee_rate)
    if total_fees == 0 and volume_processed > 0:
        total_fees = round(volume_processed * fee_rate / 100, 2)

    period_label = now.strftime("%B %Y")

    return {
        "period_label": period_label,
        "period_start": datetime(year, month, 1, tzinfo=timezone.utc).isoformat(),
        "amount": total_fees,
        "volume_processed": volume_processed,
        "fee_rate": str(fee_rate),
        "status": "CURRENT",
    }
