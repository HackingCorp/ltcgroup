"""Merchant reports endpoints."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.report import Report, ReportStatus
from app.api.v1.merchant_auth import get_current_merchant_jwt

router = APIRouter(prefix="/merchant-dashboard/reports", tags=["Merchant Reports"])

REPORT_TYPES = [
    {
        "id": "transactions",
        "name": "Transactions",
        "description": "Detailed report of all transactions including status, amounts, and customer info.",
    },
    {
        "id": "revenue",
        "name": "Revenue",
        "description": "Revenue breakdown by period, payment method, and operator.",
    },
    {
        "id": "payouts",
        "name": "Payouts",
        "description": "Summary of all payouts and withdrawal history.",
    },
    {
        "id": "fees",
        "name": "Fees",
        "description": "Breakdown of processing fees and commissions charged.",
    },
]


class CreateReportRequest(BaseModel):
    report_type: str
    format: str = "csv"
    period_start: datetime
    period_end: datetime


def _serialize_report(report: Report) -> dict:
    return {
        "id": str(report.id),
        "name": report.name,
        "report_type": report.report_type,
        "format": report.format,
        "period_start": report.period_start.isoformat() if report.period_start else None,
        "period_end": report.period_end.isoformat() if report.period_end else None,
        "period_label": report.period_label,
        "file_size": report.file_size,
        "status": report.status.value if hasattr(report.status, "value") else str(report.status),
        "created_at": report.created_at.isoformat(),
    }


@router.get("/types")
async def list_report_types():
    """Return the list of available report types."""
    return REPORT_TYPES


@router.get("/")
async def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """List reports for the current merchant."""
    filters = [Report.merchant_id == merchant.id]

    count_q = await db.execute(
        select(func.count(Report.id)).where(and_(*filters))
    )
    total = count_q.scalar() or 0

    offset = (page - 1) * page_size
    items_q = await db.execute(
        select(Report)
        .where(and_(*filters))
        .order_by(Report.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = items_q.scalars().all()

    return {
        "items": [_serialize_report(r) for r in items],
        "total": total,
        "page": page,
        "per_page": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


@router.post("/")
async def create_report(
    body: CreateReportRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Create a report request."""
    # Validate report type
    valid_types = [rt["id"] for rt in REPORT_TYPES]
    if body.report_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid report type. Must be one of: {', '.join(valid_types)}")

    # Auto-generate name from type and dates
    start_str = body.period_start.strftime("%Y-%m-%d")
    end_str = body.period_end.strftime("%Y-%m-%d")
    name = f"{body.report_type.capitalize()} Report {start_str} to {end_str}"

    report = Report(
        merchant_id=merchant.id,
        name=name,
        report_type=body.report_type,
        format=body.format,
        period_start=body.period_start,
        period_end=body.period_end,
        status=ReportStatus.PENDING,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return _serialize_report(report)


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get a single report detail."""
    result = await db.execute(
        select(Report).where(
            and_(Report.id == report_id, Report.merchant_id == merchant.id)
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return _serialize_report(report)
