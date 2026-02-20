"""
Encryption utilities for sensitive card data using Fernet symmetric encryption.
"""
import base64
import hashlib
from functools import lru_cache
from cryptography.fernet import Fernet

from app.config import settings


def _derive_fernet_key(encryption_key: str) -> bytes:
    """
    Derive a valid Fernet key from the encryption_key setting.
    Fernet requires a 32-byte URL-safe base64-encoded key.
    """
    # Hash the encryption key to get consistent 32 bytes
    key_bytes = hashlib.sha256(encryption_key.encode()).digest()
    # Encode to base64 for Fernet
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
