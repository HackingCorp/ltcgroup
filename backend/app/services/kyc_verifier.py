"""
KYC Verifier microservice client.

Calls the kyc-verifier Docker service for:
- Liveness detection (anti-spoofing)
- Face matching (selfie vs ID)
- OCR text extraction from ID documents
"""

import io
import httpx
from pathlib import Path
from app.config import settings
from app.utils.encryption import decrypt_bytes
from app.utils.logging_config import get_logger

logger = get_logger(__name__)


class KYCVerifierError(Exception):
    pass


class KYCVerifierClient:
    def __init__(self):
        self.base_url = settings.kyc_verifier_url.rstrip("/")
        headers = {}
        if settings.kyc_verifier_api_key:
            headers["X-API-Key"] = settings.kyc_verifier_api_key
        self.client = httpx.AsyncClient(timeout=120.0, headers=headers)

    def _url(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

    def _read_file(self, file_path: Path) -> bytes:
        """Read a file from disk, decrypting if encrypted at rest."""
        with open(file_path, "rb") as f:
            data = f.read()
        try:
            return decrypt_bytes(data)
        except Exception:
            return data  # Not encrypted (legacy file)

    async def close(self):
        await self.client.aclose()

    async def check_liveness(self, image_path: str) -> dict:
        """Check if selfie is a real face.

        Returns {"is_real": bool, "confidence": float}
        """
        path = Path(image_path)
        if not path.exists():
            raise KYCVerifierError(f"Image file not found: {image_path}")

        try:
            file_data = self._read_file(path)
            files = {"file": (path.name, io.BytesIO(file_data), "image/jpeg")}
            response = await self.client.post(self._url("/liveness"), files=files)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Liveness check HTTP error: {e.response.status_code}")
            raise KYCVerifierError(f"Liveness check failed: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Liveness check request error: {e}")
            raise KYCVerifierError(f"KYC verifier unreachable: {e}")

    async def face_match(self, selfie_path: str, id_image_path: str) -> dict:
        """Compare selfie to ID document photo.

        Returns {"match": bool, "distance": float, "threshold": float}
        """
        selfie = Path(selfie_path)
        id_img = Path(id_image_path)
        if not selfie.exists():
            raise KYCVerifierError(f"Selfie file not found: {selfie_path}")
        if not id_img.exists():
            raise KYCVerifierError(f"ID image file not found: {id_image_path}")

        try:
            selfie_data = self._read_file(selfie)
            id_data = self._read_file(id_img)
            files = {
                "selfie": (selfie.name, io.BytesIO(selfie_data), "image/jpeg"),
                "id_image": (id_img.name, io.BytesIO(id_data), "image/jpeg"),
            }
            response = await self.client.post(self._url("/face-match"), files=files)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Face match HTTP error: {e.response.status_code}")
            raise KYCVerifierError(f"Face match failed: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Face match request error: {e}")
            raise KYCVerifierError(f"KYC verifier unreachable: {e}")

    async def ocr_extract(self, image_path: str) -> dict:
        """Extract text from ID document.

        Returns {"raw_text": str, "extracted_fields": dict, "confidence": float}
        """
        path = Path(image_path)
        if not path.exists():
            raise KYCVerifierError(f"Image file not found: {image_path}")

        try:
            file_data = self._read_file(path)
            files = {"file": (path.name, io.BytesIO(file_data), "image/jpeg")}
            response = await self.client.post(self._url("/ocr"), files=files)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"OCR HTTP error: {e.response.status_code}")
            raise KYCVerifierError(f"OCR extraction failed: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"OCR request error: {e}")
            raise KYCVerifierError(f"KYC verifier unreachable: {e}")


kyc_verifier_client = KYCVerifierClient()
