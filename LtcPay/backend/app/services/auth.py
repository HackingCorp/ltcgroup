"""
Re-export authentication utilities from core.security for backward compatibility.
"""
from app.core.security import (
    get_current_merchant,
    verify_webhook_signature,
    generate_webhook_signature,
)

# Alias for convenience
get_merchant = get_current_merchant
