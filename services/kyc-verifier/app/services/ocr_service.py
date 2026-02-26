import asyncio
import io
import re
import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Lazy-loaded reader (heavy init)
_reader = None


def _get_reader():
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(["fr", "en"], gpu=False)
    return _reader


def _load_image(file_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    return np.array(img)


def _extract_fields(raw_text: str) -> dict:
    """Parse structured fields from OCR raw text using regex."""
    fields = {}

    # ID number patterns (alphanumeric, 6-20 chars)
    id_match = re.search(r'\b([A-Z0-9]{6,20})\b', raw_text)
    if id_match:
        fields["id_number"] = id_match.group(1)

    # Date patterns: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    dates = re.findall(r'\b(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})\b', raw_text)
    if dates:
        fields["dates_found"] = dates
        if len(dates) >= 1:
            fields["dob"] = dates[0]
        if len(dates) >= 2:
            fields["expiry_date"] = dates[-1]

    # Gender
    gender_match = re.search(r'\b(MASCULIN|FEMININ|MALE|FEMALE|[MF])\b', raw_text, re.IGNORECASE)
    if gender_match:
        val = gender_match.group(1).upper()
        if val in ("MASCULIN", "MALE", "M"):
            fields["gender"] = "M"
        elif val in ("FEMININ", "FEMALE", "F"):
            fields["gender"] = "F"

    # Name patterns (after NOM or SURNAME)
    name_match = re.search(r'(?:NOM|SURNAME)[:\s]+([A-ZÀ-Ÿ\s]+)', raw_text, re.IGNORECASE)
    if name_match:
        fields["last_name"] = name_match.group(1).strip()

    prenom_match = re.search(r'(?:PRENOM|GIVEN NAME|FIRST NAME)[:\s]+([A-ZÀ-Ÿa-zà-ÿ\s]+)', raw_text, re.IGNORECASE)
    if prenom_match:
        fields["first_name"] = prenom_match.group(1).strip()

    return fields


async def ocr_extract(image_bytes: bytes) -> dict:
    """Extract text from ID document image.

    Returns {"raw_text": str, "extracted_fields": dict, "confidence": float}
    """
    def _run():
        reader = _get_reader()
        img = _load_image(image_bytes)

        try:
            results = reader.readtext(img)
            if not results:
                return {"raw_text": "", "extracted_fields": {}, "confidence": 0.0}

            # Combine all detected text
            texts = []
            confidences = []
            for (_bbox, text, conf) in results:
                texts.append(text)
                confidences.append(conf)

            raw_text = " ".join(texts)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

            extracted_fields = _extract_fields(raw_text)

            return {
                "raw_text": raw_text,
                "extracted_fields": extracted_fields,
                "confidence": float(avg_confidence),
            }
        except Exception as e:
            logger.warning(f"OCR extraction failed: {e}")
            return {"raw_text": "", "extracted_fields": {}, "confidence": 0.0}

    return await asyncio.to_thread(_run)
