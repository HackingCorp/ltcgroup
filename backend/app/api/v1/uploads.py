import io
import os
import re
import uuid
import enum
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from PIL import Image

from app.database import get_db
from app.models.user import User
from app.services.auth import get_current_user
from app.config import settings
from app.utils.encryption import encrypt_bytes, decrypt_bytes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# Allowed file extensions and max size
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Magic bytes for file type validation
MAGIC_BYTES = {
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".png": b"\x89PNG",
    ".pdf": b"%PDF",
}

# Valid document types
ALLOWED_DOCUMENT_TYPES = {"passport", "id_card", "driver_license", "residence_permit"}


class UploadResponse(BaseModel):
    """Response schema for file upload."""
    file_path: str
    file_url: str
    document_type: str


def validate_file(filename: str, file_size: int, content: bytes) -> None:
    """
    Validate uploaded file.

    Args:
        filename: Name of the file
        file_size: Size of the file in bytes
        content: Raw file content for magic byte validation

    Raises:
        HTTPException: If file is invalid
    """
    # Check file extension
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Check file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024 * 1024):.0f}MB",
        )

    # Validate magic bytes
    expected_magic = MAGIC_BYTES.get(ext)
    if expected_magic and not content[:len(expected_magic)].startswith(expected_magic):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match its extension",
        )


ALLOWED_SIDES = {"front", "back", "selfie"}


@router.post("/kyc", response_model=UploadResponse)
async def upload_kyc_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    side: str = Form("front"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload KYC document for the current user.

    Args:
        file: The file to upload (multipart/form-data)
        document_type: Type of document (e.g., "passport", "id_card", "driver_license")
        side: Which side/type of file: "front", "back", or "selfie"
        current_user: Current authenticated user
        db: Database session

    Returns:
        UploadResponse with file path and URL
    """
    # Validate document_type against allowed values
    if document_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Allowed types: {', '.join(sorted(ALLOWED_DOCUMENT_TYPES))}",
        )

    if side not in ALLOWED_SIDES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid side. Allowed values: {', '.join(sorted(ALLOWED_SIDES))}",
        )

    try:
        # Read file content to check size
        content = await file.read()
        file_size = len(content)

        # Validate file (including magic bytes)
        validate_file(file.filename, file_size, content)

        # Create directory structure: uploads/kyc/{user_id}/
        upload_base = Path(settings.upload_dir)
        kyc_dir = upload_base / "kyc" / str(current_user.id)
        kyc_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename: {timestamp}_{side}{ext}
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        ext = Path(file.filename).suffix
        safe_filename = f"{timestamp}_{side}{ext}"
        file_path = kyc_dir / safe_filename

        # Strip EXIF metadata from images
        ext_lower = ext.lower()
        if ext_lower in {".jpg", ".jpeg", ".png"}:
            img = Image.open(io.BytesIO(content))
            clean_buffer = io.BytesIO()
            img.save(clean_buffer, format=img.format or "JPEG", quality=95)
            content = clean_buffer.getvalue()

        # Encrypt file data at rest
        encrypted_data = encrypt_bytes(content)

        # Save encrypted file
        with open(file_path, "wb") as f:
            f.write(encrypted_data)

        # Generate file URL (relative path from uploads directory)
        relative_path = f"kyc/{current_user.id}/{safe_filename}"
        file_url = f"/uploads/{relative_path}"

        logger.info(f"KYC document uploaded for user {current_user.id}: {file_path} (side={side})")

        return UploadResponse(
            file_path=str(file_path),
            file_url=file_url,
            document_type=document_type,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading KYC document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file",
        )
    finally:
        await file.close()


# Filename regex: timestamp_side.ext — only allow safe characters
_SAFE_FILENAME = re.compile(r"^[a-zA-Z0-9_\-]+\.[a-z]{3,4}$")


@router.get("/kyc/{user_id}/{filename}")
async def serve_kyc_file(
    user_id: str,
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """
    Serve a KYC document file with authentication and ownership check.
    Only the file owner or an admin can access the file.
    """
    # Ownership / admin check
    if str(current_user.id) != user_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this file",
        )

    # Validate filename to prevent path traversal
    if not _SAFE_FILENAME.match(filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename",
        )

    file_path = Path(settings.upload_dir) / "kyc" / user_id / filename
    resolved = file_path.resolve()

    # Ensure resolved path is still inside upload_dir
    upload_root = Path(settings.upload_dir).resolve()
    if not str(resolved).startswith(str(upload_root)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path",
        )

    if not resolved.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    # Decrypt file before serving
    from fastapi.responses import Response
    with open(resolved, "rb") as f:
        encrypted_data = f.read()
    try:
        decrypted_data = decrypt_bytes(encrypted_data)
    except Exception:
        # File may not be encrypted (legacy upload) — serve as-is
        return FileResponse(str(resolved))

    # Determine media type from extension
    ext = resolved.suffix.lower()
    media_types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".pdf": "application/pdf"}
    media_type = media_types.get(ext, "application/octet-stream")
    return Response(content=decrypted_data, media_type=media_type)
