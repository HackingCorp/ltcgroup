"""
LtcPay - Credential Encryption (Fernet)

Encrypts/decrypts sensitive TouchPay credentials stored in DB.
Requires CREDENTIAL_ENCRYPTION_KEY env var (Fernet key).
Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger(__name__)

_DEV_KEY = b"dev-only-not-secure-0000000000000="  # 32 bytes base64-like fallback

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet

    key = settings.CREDENTIAL_ENCRYPTION_KEY
    if key:
        try:
            _fernet = Fernet(key.encode() if isinstance(key, str) else key)
            return _fernet
        except Exception as exc:
            logger.error("Invalid CREDENTIAL_ENCRYPTION_KEY: %s", exc)
            raise ValueError("CREDENTIAL_ENCRYPTION_KEY is not a valid Fernet key") from exc

    if settings.environment == "development":
        logger.warning(
            "CREDENTIAL_ENCRYPTION_KEY not set -- using insecure dev key. "
            "Set a real key in production!"
        )
        _fernet = Fernet(Fernet.generate_key())
        return _fernet

    raise ValueError(
        "CREDENTIAL_ENCRYPTION_KEY must be set in production. "
        "Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    )


def encrypt_value(plaintext: str) -> str:
    """Encrypt a plaintext string, return base64-encoded ciphertext.

    If no encryption key is configured, stores as plaintext with a warning.
    Credentials can be re-encrypted later once the key is set.
    """
    if not plaintext:
        return ""
    try:
        f = _get_fernet()
        return f.encrypt(plaintext.encode("utf-8")).decode("utf-8")
    except ValueError:
        logger.warning(
            "CREDENTIAL_ENCRYPTION_KEY not set — storing credential as plaintext. "
            "Set the key and re-save to encrypt."
        )
        return plaintext


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext, return plaintext string.

    If decryption fails (no key, wrong key, or value was stored as plaintext),
    returns the original value as-is. This allows graceful handling of
    credentials that were seeded before an encryption key was configured.
    """
    if not ciphertext:
        return ""
    try:
        f = _get_fernet()
        return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError):
        # Value is likely stored as plaintext (pre-encryption or no key)
        return ciphertext
