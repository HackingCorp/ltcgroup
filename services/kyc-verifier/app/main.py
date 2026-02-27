import logging
import os
from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile, File

from app.services.deepface_service import check_liveness, face_match
from app.services.ocr_service import ocr_extract

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="KYC Verifier", version="1.0.0")

KYC_VERIFIER_API_KEY = os.environ.get("KYC_VERIFIER_API_KEY", "")


async def verify_api_key(x_api_key: str = Header(...)):
    """Require a valid API key for all protected endpoints."""
    if not KYC_VERIFIER_API_KEY:
        return  # No key configured — allow (dev mode)
    if x_api_key != KYC_VERIFIER_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "kyc-verifier"}


@app.post("/liveness", dependencies=[Depends(verify_api_key)])
async def liveness_endpoint(file: UploadFile = File(...)):
    """Check if selfie is a real face (anti-spoofing)."""
    image_bytes = await file.read()
    result = await check_liveness(image_bytes)
    return result


@app.post("/face-match", dependencies=[Depends(verify_api_key)])
async def face_match_endpoint(
    selfie: UploadFile = File(...),
    id_image: UploadFile = File(...),
):
    """Compare selfie to ID document photo."""
    selfie_bytes = await selfie.read()
    id_bytes = await id_image.read()
    result = await face_match(selfie_bytes, id_bytes)
    return result


@app.post("/ocr", dependencies=[Depends(verify_api_key)])
async def ocr_endpoint(file: UploadFile = File(...)):
    """Extract text from ID document image."""
    image_bytes = await file.read()
    result = await ocr_extract(image_bytes)
    return result
