"""Login ignores the case of the email (2026-10-15).

A phone keyboard typed "Lontsi05@gmail.com" for an admin stored as
"lontsi05@gmail.com": correct password, 401 "Invalid email or password".
"""
import uuid

import pytest

from app.api.v1.auth import hash_password
from app.models.admin_user import AdminUser


@pytest.fixture
async def admin(db_session):
    email = f"case-{uuid.uuid4().hex[:6]}@example.com"
    user = AdminUser(email=email, full_name="Admin", password_hash=hash_password("S3cret!pw"), is_active=True)
    db_session.add(user)
    await db_session.commit()
    return email


@pytest.mark.parametrize("transform", [str.upper, str.capitalize, lambda e: f"  {e} "])
async def test_admin_login_ignores_email_case_and_spaces(client, admin, transform):
    response = await client.post("/api/v1/auth/login", json={"email": transform(admin), "password": "S3cret!pw"})
    assert response.status_code == 200, response.text


async def test_wrong_password_still_401(client, admin):
    response = await client.post("/api/v1/auth/login", json={"email": admin.upper(), "password": "nope"})
    assert response.status_code == 401
