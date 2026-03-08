"""
Encryption utilities for sensitive card data using Fernet symmetric encryption.
"""
import base64
from functools import lru_cache
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

from app.config import settings


def _derive_fernet_key(encryption_key: str) -> bytes:
    """
    Derive a valid Fernet key from the encryption_key setting using HKDF.
    Fernet requires a 32-byte URL-safe base64-encoded key.

    Uses HKDF (HMAC-based Key Derivation Function) with SHA-256,
    which is cryptographically superior to a plain SHA-256 hash.
    """
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"ltcgroup-card-encryption-salt",
        info=b"fernet-key-derivation",
    )
    key_bytes = hkdf.derive(encryption_key.encode())
    return base64.urlsafe_b64encode(key_bytes)


@lru_cache(maxsize=1)
def _get_cipher() -> Fernet:
    """Get a cached Fernet cipher instance."""
    fernet_key = _derive_fernet_key(settings.encryption_key)
    return Fernet(fernet_key)


def encrypt_field(plaintext: str) -> str:
    """
    Encrypt a plaintext string using Fernet symmetric encryption.

    Args:
        plaintext: The plaintext string to encrypt

    Returns:
        Base64-encoded encrypted string
    """
    if not plaintext:
        return plaintext

    cipher = _get_cipher()

    # Encrypt and return as string
    encrypted_bytes = cipher.encrypt(plaintext.encode())
    return encrypted_bytes.decode()


def decrypt_field(ciphertext: str) -> str:
    """
    Decrypt a ciphertext string using Fernet symmetric encryption.

    Args:
        ciphertext: The encrypted string to decrypt

    Returns:
        Decrypted plaintext string

    Raises:
        cryptography.fernet.InvalidToken: If decryption fails
    """
    if not ciphertext:
        return ciphertext

    cipher = _get_cipher()

    # Decrypt and return as string
    decrypted_bytes = cipher.decrypt(ciphertext.encode())
    return decrypted_bytes.decode()


def encrypt_bytes(data: bytes) -> bytes:
    """Encrypt raw bytes using Fernet symmetric encryption."""
    if not data:
        return data
    cipher = _get_cipher()
    return cipher.encrypt(data)


def decrypt_bytes(data: bytes) -> bytes:
    """Decrypt raw bytes using Fernet symmetric encryption."""
    if not data:
        return data
    cipher = _get_cipher()
    return cipher.decrypt(data)
