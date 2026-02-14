"""
Tests for encryption utilities.
"""

import pytest
from app.utils.encryption import encrypt_field, decrypt_field


class TestEncryption:
    """Test encryption and decryption of sensitive fields."""

    def test_encrypt_field_returns_different_value(self):
        """Test that encryption returns a different value than input."""
        plaintext = "4111111111111111"
        encrypted = encrypt_field(plaintext)

        assert encrypted != plaintext
        assert len(encrypted) > 0

    def test_decrypt_field_reverses_encryption(self):
        """Test that decrypt_field(encrypt_field(value)) == value."""
        plaintext = "4111111111111111"
        encrypted = encrypt_field(plaintext)
        decrypted = decrypt_field(encrypted)

        assert decrypted == plaintext

    def test_encrypt_different_values_produce_different_ciphertexts(self):
        """Test that different values produce different encrypted outputs."""
        value1 = "4111111111111111"
        value2 = "5500000000000004"

        encrypted1 = encrypt_field(value1)
        encrypted2 = encrypt_field(value2)

        assert encrypted1 != encrypted2

    def test_encrypt_empty_string(self):
        """Test encryption of empty string."""
        result = encrypt_field("")
        assert result == ""

    def test_decrypt_empty_string(self):
        """Test decryption of empty string."""
        result = decrypt_field("")
        assert result == ""

    def test_encrypt_cvv(self):
        """Test encryption of CVV codes."""
        cvv = "123"
        encrypted = encrypt_field(cvv)
        decrypted = decrypt_field(encrypted)

        assert decrypted == cvv
        assert encrypted != cvv

    def test_encrypt_special_characters(self):
        """Test encryption of strings with special characters."""
        value = "Test@123!#$%"
        encrypted = encrypt_field(value)
        decrypted = decrypt_field(encrypted)

        assert decrypted == value

    def test_encrypt_unicode_characters(self):
        """Test encryption of unicode strings."""
        value = "Test€£¥"
        encrypted = encrypt_field(value)
        decrypted = decrypt_field(encrypted)

        assert decrypted == value
