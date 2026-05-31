"""Merchant KYC endpoints."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.kyc import (
    KycSubmission,
    KycDocument,
    KycStatus,
    KycDocumentType,
    KycDocumentStatus,
)
from app.api.v1.merchant_auth import get_current_merchant_jwt

router = APIRouter(prefix="/merchant-dashboard/kyc", tags=["Merchant KYC"])


class StepDataRequest(BaseModel):
    data: dict


class UploadDocumentRequest(BaseModel):
    document_type: str
    document_name: str
    file_name: str


def _serialize_submission(sub: KycSubmission, documents: list | None = None) -> dict:
    result = {
        "id": str(sub.id),
        "current_step": sub.current_step,
        "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
        "business_info": sub.business_info,
        "beneficial_owner": sub.beneficial_owner,
        "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
        "reviewed_at": sub.reviewed_at.isoformat() if sub.reviewed_at else None,
        "admin_note": sub.admin_note,
        "created_at": sub.created_at.isoformat(),
        "updated_at": sub.updated_at.isoformat(),
    }
    if documents is not None:
        result["documents"] = [_serialize_document(d) for d in documents]
    return result


def _serialize_document(doc: KycDocument) -> dict:
    return {
        "id": str(doc.id),
        "document_type": doc.document_type.value if hasattr(doc.document_type, "value") else str(doc.document_type),
        "document_name": doc.document_name,
        "file_name": doc.file_name,
        "file_path": doc.file_path,
        "status": doc.status.value if hasattr(doc.status, "value") else str(doc.status),
        "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
        "created_at": doc.created_at.isoformat(),
    }


async def _get_or_create_submission(
    merchant_id, db: AsyncSession
) -> KycSubmission:
    """Get existing KYC submission or create a new one."""
    result = await db.execute(
        select(KycSubmission).where(KycSubmission.merchant_id == merchant_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        sub = KycSubmission(
            merchant_id=merchant_id,
            status=KycStatus.NOT_STARTED,
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
    return sub


@router.get("/")
async def get_kyc_status(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Get the current KYC status for the merchant."""
    sub = await _get_or_create_submission(merchant.id, db)

    # Fetch documents
    docs_q = await db.execute(
        select(KycDocument).where(KycDocument.kyc_submission_id == sub.id)
    )
    documents = docs_q.scalars().all()

    return _serialize_submission(sub, documents=documents)


@router.post("/")
async def start_kyc(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Start or retrieve KYC submission (idempotent)."""
    sub = await _get_or_create_submission(merchant.id, db)
    return _serialize_submission(sub)


@router.patch("/step/{step}")
async def update_step(
    step: int,
    body: StepDataRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Update step data. Step 1: business_info, Step 2: beneficial_owner."""
    sub = await _get_or_create_submission(merchant.id, db)

    if step == 1:
        sub.business_info = body.data
    elif step == 2:
        sub.beneficial_owner = body.data
    else:
        raise HTTPException(status_code=400, detail="Invalid step. Must be 1 or 2.")

    # Advance current_step if needed
    if step >= sub.current_step:
        sub.current_step = step + 1

    # Mark as in progress if not already
    if sub.status == KycStatus.NOT_STARTED:
        sub.status = KycStatus.IN_PROGRESS

    await db.commit()
    await db.refresh(sub)
    return _serialize_submission(sub)


@router.post("/documents")
async def upload_document_metadata(
    body: UploadDocumentRequest,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Upload document metadata (no actual file upload)."""
    sub = await _get_or_create_submission(merchant.id, db)

    # Validate document_type
    try:
        doc_type = KycDocumentType(body.document_type)
    except ValueError:
        valid = [t.value for t in KycDocumentType]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document type. Must be one of: {', '.join(valid)}",
        )

    doc = KycDocument(
        kyc_submission_id=sub.id,
        document_type=doc_type,
        document_name=body.document_name,
        file_name=body.file_name,
        status=KycDocumentStatus.UPLOADED,
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return _serialize_document(doc)


@router.get("/documents")
async def list_documents(
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """List documents for the merchant's KYC submission."""
    result = await db.execute(
        select(KycSubmission).where(KycSubmission.merchant_id == merchant.id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return {"documents": []}

    docs_q = await db.execute(
        select(KycDocument).where(KycDocument.kyc_submission_id == sub.id)
    )
    documents = docs_q.scalars().all()
    return {"documents": [_serialize_document(d) for d in documents]}


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    merchant: Merchant = Depends(get_current_merchant_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Delete a KYC document."""
    # Verify submission belongs to merchant
    sub_q = await db.execute(
        select(KycSubmission).where(KycSubmission.merchant_id == merchant.id)
    )
    sub = sub_q.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="KYC submission not found")

    doc_q = await db.execute(
        select(KycDocument).where(
            and_(
                KycDocument.id == doc_id,
                KycDocument.kyc_submission_id == sub.id,
            )
        )
    )
    doc = doc_q.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.delete(doc)
    await db.commit()
    return {"detail": "Document deleted"}
