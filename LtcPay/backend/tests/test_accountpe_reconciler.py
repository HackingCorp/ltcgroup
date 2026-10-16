"""AccountPE reconciliation sweep (2026-10-16).

Webhooks refused for a bad signature left four AccountPE payins that had
succeeded PROCESSING, then EXPIRED. The sweep asks AccountPE directly.
"""
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select

from app.core.security import generate_api_secret, hash_api_secret
from app.models.merchant import Merchant, generate_api_key_live, generate_api_key_test
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.models.provider import ProviderConfig, ProviderGroup
from app.services import accountpe_reconciler
from tests.conftest import TestSessionLocal


async def _payment(db_session, status):
    if not (await db_session.execute(select(ProviderConfig).where(ProviderConfig.code == "ACCOUNTPE"))).scalar_one_or_none():
        db_session.add(ProviderConfig(code="ACCOUNTPE", name="AccountPE", provider_group=ProviderGroup.MOBILE,
                                      is_active=True, config={"api_key": "k"}))
    m = Merchant(name="m", email=f"{uuid.uuid4().hex[:8]}@example.com",
                 api_key_live=generate_api_key_live(), api_key_test=generate_api_key_test(),
                 api_secret_hash=hash_api_secret(generate_api_secret()), is_active=True, is_verified=True)
    db_session.add(m)
    await db_session.commit()
    p = Payment(merchant_id=m.id, reference=f"PAY-{uuid.uuid4().hex[:16].upper()}", payment_token=uuid.uuid4().hex,
                amount=Decimal("72616"), currency="CDF", status=status, provider=PaymentProvider.ACCOUNTPE)
    db_session.add(p)
    await db_session.commit()
    return p.id


async def _status(db_session, p):
    pid = p.id if isinstance(p, Payment) else p
    db_session.expire_all()
    return (await db_session.execute(select(Payment.status).where(Payment.id == pid))).scalar_one()


async def _sweep(answer):
    with patch.object(accountpe_reconciler, "async_session", TestSessionLocal), \
         patch("app.services.accountpe_service.accountpe_service.check_payment_status", new=AsyncMock(return_value=answer)), \
         patch("app.services.notification.notify_merchant", new=AsyncMock()):
        return await accountpe_reconciler.sweep_once()


@pytest.mark.parametrize("status", [PaymentStatus.PROCESSING, PaymentStatus.EXPIRED])
async def test_a_success_at_accountpe_completes_the_payment(db_session, status):
    p = await _payment(db_session, status)
    assert await _sweep({"status": "successful", "id": 131695}) == 1
    assert await _status(db_session, p) == PaymentStatus.COMPLETED


async def test_a_late_failure_leaves_an_expired_payment_alone(db_session):
    p = await _payment(db_session, PaymentStatus.EXPIRED)
    assert await _sweep({"status": "failed"}) == 0
    assert await _status(db_session, p) == PaymentStatus.EXPIRED


async def test_a_failure_settles_a_processing_payment(db_session):
    p = await _payment(db_session, PaymentStatus.PROCESSING)
    await _sweep({"status": "failed"})
    assert await _status(db_session, p) == PaymentStatus.FAILED


async def test_no_answer_changes_nothing(db_session):
    p = await _payment(db_session, PaymentStatus.PROCESSING)
    assert await _sweep(None) == 0
    assert await _status(db_session, p) == PaymentStatus.PROCESSING
