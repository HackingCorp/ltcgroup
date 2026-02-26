import asyncio
import io
import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


def _load_image(file_bytes: bytes) -> np.ndarray:
    """Load image bytes into numpy array for DeepFace."""
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    return np.array(img)


async def check_liveness(image_bytes: bytes) -> dict:
    """Check if a selfie is a real face (anti-spoofing).

    Returns {"is_real": bool, "confidence": float}
    """
    def _run():
        from deepface import DeepFace

        img = _load_image(image_bytes)
        try:
            faces = DeepFace.extract_faces(
                img_path=img,
                anti_spoofing=True,
                enforce_detection=True,
            )
            if not faces:
                return {"is_real": False, "confidence": 0.0}

            face = faces[0]
            is_real = face.get("is_real", False)
            confidence = face.get("antispoof_score", 0.0)
            return {"is_real": bool(is_real), "confidence": float(confidence)}
        except Exception as e:
            logger.warning(f"Liveness check failed: {e}")
            return {"is_real": False, "confidence": 0.0}

    return await asyncio.to_thread(_run)


async def face_match(selfie_bytes: bytes, id_image_bytes: bytes) -> dict:
    """Compare selfie to ID document photo.

    Returns {"match": bool, "distance": float, "threshold": float}
    """
    def _run():
        from deepface import DeepFace

        img1 = _load_image(selfie_bytes)
        img2 = _load_image(id_image_bytes)
        try:
            result = DeepFace.verify(
                img1_path=img1,
                img2_path=img2,
                model_name="Facenet",
                enforce_detection=False,
            )
            return {
                "match": bool(result.get("verified", False)),
                "distance": float(result.get("distance", 1.0)),
                "threshold": float(result.get("threshold", 0.4)),
            }
        except Exception as e:
            logger.warning(f"Face match failed: {e}")
            return {"match": False, "distance": 1.0, "threshold": 0.4}

    return await asyncio.to_thread(_run)
