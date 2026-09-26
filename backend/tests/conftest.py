import os
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool


os.environ.setdefault("SECRET_KEY", "test-only-secret-key-change-me")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ["CORS_ORIGINS"] = '["http://localhost:3000"]'

from app.core.config import get_settings
from app.db.base import Base
import app.db.session as db_session
from app.main import app
from app.models.user import UserRole
from app.services.user import create_user


test_engine = create_async_engine(
	get_settings().async_database_url,
	poolclass=NullPool,
	pool_pre_ping=True,
)
db_session.engine = test_engine
db_session.AsyncSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture
def anyio_backend() -> str:
	return "asyncio"


@pytest_asyncio.fixture
async def client():
	async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as value:
		yield value


@pytest_asyncio.fixture
async def users():
	async with db_session.AsyncSessionLocal() as session:
		admin = await create_user(
			session,
			full_name="Administrator",
			username="admin",
			password="admin-password-123",
			role=UserRole.ADMIN,
			property_id=1,
		)
		reception = await create_user(
			session,
			full_name="Reception User",
			username="reception",
			password="reception-password-123",
			role=UserRole.RECEPTION,
			property_id=1,
		)
		return admin, reception


@pytest_asyncio.fixture(autouse=True)
async def reset_database() -> AsyncGenerator[None, None]:
	db_url = str(test_engine.url)
	if ("neon.tech" in db_url or "render.com" in db_url) and os.environ.get("ALLOW_TEST_DB_TRUNCATE") != "1":
		raise RuntimeError(
			"Refusing to truncate remote database during tests! "
			"Set TEST_DATABASE_URL or ALLOW_TEST_DB_TRUNCATE=1 if you intend to wipe this database."
		)
	try:
		async with test_engine.begin() as connection:
			for table in reversed(Base.metadata.sorted_tables):
				await connection.execute(text(f'TRUNCATE TABLE "{table.name}" RESTART IDENTITY CASCADE'))
			await connection.execute(
				text(
					"INSERT INTO properties (id, name, code, currency, checkout_deadline_hour, checkout_deadline_minute, late_checkout_penalty, is_active) "
					"VALUES (1, 'Default Property', 'MAIN', 'ETB', 4, 0, 600.00, true)"
				)
			)
			await connection.execute(
				text("SELECT setval(pg_get_serial_sequence('properties', 'id'), 1, true)")
			)
		yield
	finally:
		pass


@pytest_asyncio.fixture(scope="session", autouse=True)
async def dispose_test_engine():
	yield
	await test_engine.dispose()