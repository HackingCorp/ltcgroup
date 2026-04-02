"""
LtcPay - Transaction model tests.

Note: The Transaction endpoints are no longer in the main router.
The Payment model is the primary model used by the API.
These tests verify the Transaction model still works for legacy support.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionStatus


@pytest.mark.asyncio
async def test_create_transaction(db_session: AsyncSession):
    """Test creating a transaction in the database."""
    txn = Transaction(
        reference="TXN-TEST-001",
        amount=5000.0,
        currency="XAF",
        status=TransactionStatus.PENDING,
        payer_phone="237670000000",
        payer_name="Test User",
        description="Test transaction",
    )
    db_session.add(txn)
    await db_session.commit()
    await db_session.refresh(txn)

    assert txn.id is not None
    assert txn.reference == "TXN-TEST-001"
    assert txn.status == TransactionStatus.PENDING
    assert txn.amount == 5000.0


@pytest.mark.asyncio
async def test_transaction_status_values():
    """Test that TransactionStatus enum has expected values."""
    assert TransactionStatus.PENDING.value == "pending"
    assert TransactionStatus.COMPLETED.value == "completed"
    assert TransactionStatus.FAILED.value == "failed"
    assert TransactionStatus.CANCELLED.value == "cancelled"
