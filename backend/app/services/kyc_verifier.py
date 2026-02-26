"""
KYC Verifier microservice client.

Calls the kyc-verifier Docker service for:
- Liveness detection (anti-spoofing)
- Face matching (selfie vs ID)
- OCR text extraction from ID documents
"""

import httpx
from pathlib import Path
from app.config import settings
from app.utils.logging_config import get_logger

logger = get_logger(__name__)


class KYCVerifierError(Exception):
    pass


class KYCVerifierClient:
    def __init__(self):
        self.base_url = settings.kyc_verifier_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=120.0)

    def _url(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

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
            with open(path, "rb") as f:
                files = {"file": (path.name, f, "image/jpeg")}
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
            with open(selfie, "rb") as sf, open(id_img, "rb") as idf:
                files = {
                    "selfie": (selfie.name, sf, "image/jpeg"),
                    "id_image": (id_img.name, idf, "image/jpeg"),
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
            with open(path, "rb") as f:
                files = {"file": (path.name, f, "image/jpeg")}
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
