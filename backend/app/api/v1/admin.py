from datetime import datetime
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from pydantic import BaseModel, UUID4

from app.database import get_db
from app.models.user import User, KYCStatus
from app.models.card import Card
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.audit_log import AuditLog
from app.services.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


# Dependency to check admin access
async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensure the current user is an admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# Schemas
class UserListItem(BaseModel):
    id: UUID4
    email: str
    phone: str
    first_name: str
    last_name: str
    kyc_status: KYCStatus
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: list[UserListItem]
    total: int
    page: int
    page_size: int


class KYCActionRequest(BaseModel):
    reason: Optional[str] = None


class TransactionListItem(BaseModel):
    id: UUID4
    user_id: UUID4
    card_id: UUID4
    amount: Decimal
    currency: str
    type: TransactionType
    status: TransactionStatus
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    transactions: list[TransactionListItem]
    total: int
    page: int
    page_size: int


class AdminStats(BaseModel):
    total_users: int
    total_cards: int
    total_transactions: int
    total_volume: Decimal
    total_revenue: Decimal
    pending_kyc: int


# Utility function to log audit events
async def log_audit(
    db: AsyncSession,
    user_id: UUID4,
    action: str,
    resource_type: str,
    resource_id: str,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
):
    """Log an audit event."""
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        details=details or {},
        ip_address=ip_address,
    )
    db.add(audit_log)
    await db.commit()


# Endpoints
@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    kyc_status: Optional[KYCStatus] = None,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users with optional KYC status filter (paginated)."""
    # Build query
    query = select(User)
    if kyc_status:
        query = query.where(User.kyc_status == kyc_status)

    # Get total count
    count_query = select(func.count()).select_from(User)
    if kyc_status:
        count_query = count_query.where(User.kyc_status == kyc_status)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginate
    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    users = result.scalars().all()

    return UserListResponse(
        users=[UserListItem.model_validate(user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/users/{user_id}/kyc/approve")
async def approve_kyc(
    user_id: UUID4,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve a user's KYC."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.kyc_status == KYCStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC already approved",
        )

    # Update KYC status
    user.kyc_status = KYCStatus.APPROVED
    await db.commit()

    # Log audit event
    await log_audit(
        db=db,
        user_id=admin_user.id,
        action="kyc_approve",
        resource_type="user",
        resource_id=user_id,
        details={"target_user_id": str(user_id)},
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "KYC approved successfully"}


@router.post("/users/{user_id}/kyc/reject")
async def reject_kyc(
    user_id: UUID4,
    kyc_action: KYCActionRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reject a user's KYC with optional reason."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.kyc_status == KYCStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC already rejected",
        )

    # Update KYC status
    user.kyc_status = KYCStatus.REJECTED
    await db.commit()

    # Log audit event
    await log_audit(
        db=db,
        user_id=admin_user.id,
        action="kyc_reject",
        resource_type="user",
        resource_id=user_id,
        details={"target_user_id": str(user_id), "reason": kyc_action.reason},
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "KYC rejected successfully", "reason": kyc_action.reason}


@router.get("/transactions", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[TransactionStatus] = None,
    type_filter: Optional[TransactionType] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all transactions with filters (paginated)."""
    # Build query
    query = select(Transaction)
    conditions = []

    if status_filter:
        conditions.append(Transaction.status == status_filter)
    if type_filter:
        conditions.append(Transaction.type == type_filter)
    if start_date:
        conditions.append(Transaction.created_at >= start_date)
    if end_date:
        conditions.append(Transaction.created_at <= end_date)

    if conditions:
        query = query.where(and_(*conditions))

    # Get total count
    count_query = select(func.count()).select_from(Transaction)
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginate
    query = query.order_by(Transaction.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    transactions = result.scalars().all()

    return TransactionListResponse(
        transactions=[TransactionListItem.model_validate(txn) for txn in transactions],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics."""
    # Total users
    total_users_result = await db.execute(select(func.count()).select_from(User))
    total_users = total_users_result.scalar_one()

    # Total cards
    total_cards_result = await db.execute(select(func.count()).select_from(Card))
    total_cards = total_cards_result.scalar_one()

    # Total transactions
    total_transactions_result = await db.execute(select(func.count()).select_from(Transaction))
    total_transactions = total_transactions_result.scalar_one()

    # Total volume (sum of completed transactions)
    total_volume_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.status == TransactionStatus.COMPLETED
        )
    )
    total_volume = total_volume_result.scalar_one()

    # Revenue calculation (assuming 2% fee on completed topups)
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(
                Transaction.status == TransactionStatus.COMPLETED,
                Transaction.type == TransactionType.TOPUP,
            )
        )
    )
    total_topup = revenue_result.scalar_one()
    total_revenue = Decimal(total_topup) * Decimal("0.02")  # 2% fee

    # Pending KYC count
    pending_kyc_result = await db.execute(
        select(func.count()).select_from(User).where(User.kyc_status == KYCStatus.PENDING)
    )
    pending_kyc = pending_kyc_result.scalar_one()

    return AdminStats(
        total_users=total_users,
        total_cards=total_cards,
        total_transactions=total_transactions,
        total_volume=Decimal(total_volume),
        total_revenue=total_revenue,
        pending_kyc=pending_kyc,
    )
