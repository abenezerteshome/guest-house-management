from unittest.mock import patch
import pytest
from httpx import AsyncClient

from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.services.user import create_user
from sqlalchemy import select


@pytest.mark.asyncio
async def test_google_login_admin_success(client: AsyncClient) -> None:
    # Ensure admin user exists with email
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.username == "admin_google_test")
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if not existing:
            await create_user(
                session,
                full_name="Google Admin Test",
                username="admin_google_test",
                email="admin.google@guesthouse.com",
                password="password-test-123",
                role=UserRole.ADMIN,
            )

    fake_id_token = {
        "email": "admin.google@guesthouse.com",
        "email_verified": True,
        "sub": "google-sub-admin-12345",
        "name": "Google Admin Test",
    }

    with patch("app.services.auth.id_token.verify_oauth2_token", return_value=fake_id_token):
        response = await client.post(
            "/api/v1/auth/google",
            json={"credential": "mocked_valid_google_token"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "ADMIN"
    assert data["user"]["username"] == "admin_google_test"
    assert data["user"]["email"] == "admin.google@guesthouse.com"


@pytest.mark.asyncio
async def test_google_login_reception_forbidden(client: AsyncClient) -> None:
    # Ensure reception user exists
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.username == "reception_google_test")
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if not existing:
            await create_user(
                session,
                full_name="Google Reception Test",
                username="reception_google_test",
                email="reception.google@guesthouse.com",
                password="password-test-123",
                role=UserRole.RECEPTION,
            )

    fake_id_token = {
        "email": "reception.google@guesthouse.com",
        "email_verified": True,
        "sub": "google-sub-reception-67890",
        "name": "Google Reception Test",
    }

    with patch("app.services.auth.id_token.verify_oauth2_token", return_value=fake_id_token):
        response = await client.post(
            "/api/v1/auth/google",
            json={"credential": "mocked_reception_google_token"},
        )

    assert response.status_code == 403
    assert "Administrator" in response.json()["detail"]


@pytest.mark.asyncio
async def test_google_login_unrecognized_account(client: AsyncClient) -> None:
    fake_id_token = {
        "email": "unregistered.stranger@gmail.com",
        "email_verified": True,
        "sub": "google-sub-unknown-99999",
        "name": "Unknown Stranger",
    }

    with patch("app.services.auth.id_token.verify_oauth2_token", return_value=fake_id_token):
        response = await client.post(
            "/api/v1/auth/google",
            json={"credential": "mocked_unknown_token"},
        )

    assert response.status_code == 401
    assert "not recognized" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_google_login_unverified_email(client: AsyncClient) -> None:
    fake_id_token = {
        "email": "unverified@gmail.com",
        "email_verified": False,
        "sub": "google-sub-unverified",
    }

    with patch("app.services.auth.id_token.verify_oauth2_token", return_value=fake_id_token):
        response = await client.post(
            "/api/v1/auth/google",
            json={"credential": "mocked_unverified_token"},
        )

    assert response.status_code == 401
    assert "not verified" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_google_login_invalid_token(client: AsyncClient) -> None:
    with patch("app.services.auth.id_token.verify_oauth2_token", side_effect=ValueError("Token expired")):
        response = await client.post(
            "/api/v1/auth/google",
            json={"credential": "corrupted_or_expired_token"},
        )

    assert response.status_code == 401
    assert "Invalid Google token" in response.json()["detail"]
