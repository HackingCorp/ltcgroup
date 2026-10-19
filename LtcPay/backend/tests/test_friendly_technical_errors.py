"""Provider plumbing never reaches the customer (2026-10-19)."""
import pytest

from app.services.touchpay_direct_service import TouchPayDirectError, friendly_initiation_error

SEBPAY_KP = (
    "Failed to initiate collection. (error: Sebpay-KP checkout failed. Status: 422 - "
    '{"ok":false,"error":{"code":"validation_error","message":"network: Invalid enum value. '
    "Expected 'MTN_BJ' | 'MOMO_NG', received 'MTN_NG'\"}})"
)


@pytest.mark.parametrize("raw", [
    SEBPAY_KP,
    " Unexpected runtime exception : customer.otp must not be null",
    "SebPay HTTP 500",
])
def test_technical_errors_get_a_generic_message(raw):
    msg = friendly_initiation_error(TouchPayDirectError(raw))
    assert "momentanement indisponible" in msg
    assert "{" not in msg and "Sebpay" not in msg


def test_a_readable_operator_message_is_still_shown():
    msg = friendly_initiation_error(TouchPayDirectError("Montant hors plage autorisee"))
    assert "Montant hors plage autorisee" in msg
