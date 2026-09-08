import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.services.user import create_user


@pytest_asyncio.fixture
async def users():
	async with AsyncSessionLocal() as session:
		admin = await create_user(
			session,
			full_name="Administrator",
			username="admin",
			password="admin-password-123",
			role=UserRole.ADMIN,
		)
		reception = await create_user(
			session,
			full_name="Reception User",
			username="reception",
			password="reception-password-123",
			role=UserRole.RECEPTION,
		)
		return admin, reception


async def token_for(client: AsyncClient, username: str, password: str) -> str:
	response = await client.post(
		"/api/v1/auth/login", json={"username": username, "password": password}
	)
	return response.json()["access_token"]


@pytest.mark.asyncio
async def test_successful_login(client: AsyncClient, users) -> None:
	response = await client.post(
		"/api/v1/auth/login",
		json={"username": "admin", "password": "admin-password-123"},
	)
	assert response.status_code == 200
	assert response.json()["user"]["username"] == "admin"
	assert response.json()["user"]["role"] == "ADMIN"
	assert "password_hash" not in response.json()["user"]

	reception_login = await client.post(
		"/api/v1/auth/login",
		json={"username": "reception", "password": "reception-password-123"},
	)
	assert reception_login.status_code == 200
	assert reception_login.json()["user"]["username"] == "reception"
	assert reception_login.json()["user"]["role"] == "RECEPTION"


@pytest.mark.asyncio
@pytest.mark.parametrize("credentials", [{"username": "missing", "password": "password"}, {"username": "admin", "password": "wrong-password"}])
async def test_invalid_login(client: AsyncClient, users, credentials) -> None:
	response = await client.post("/api/v1/auth/login", json=credentials)
	assert response.status_code == 401


@pytest.mark.asyncio
async def test_inactive_user_cannot_login(client: AsyncClient, users) -> None:
	async with AsyncSessionLocal() as session:
		admin = await session.get(User, 1)
		admin.is_active = False
		await session.commit()
	response = await client.post(
		"/api/v1/auth/login",
		json={"username": "admin", "password": "admin-password-123"},
	)
	assert response.status_code == 401


@pytest.mark.asyncio
async def test_authenticated_me(client: AsyncClient, users) -> None:
	token = await token_for(client, "admin", "admin-password-123")
	response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
	assert response.status_code == 200
	assert response.json()["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_unauthenticated_me(client: AsyncClient) -> None:
	response = await client.get("/api/v1/auth/me")
	assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_and_reception_strict_rbac(client: AsyncClient, users) -> None:
	admin_token = await token_for(client, "admin", "admin-password-123")
	reception_token = await token_for(client, "reception", "reception-password-123")
	admin_auth = {"Authorization": f"Bearer {admin_token}"}
	rec_auth = {"Authorization": f"Bearer {reception_token}"}

	# 1. Users management: Admin 200, Reception 403
	assert (await client.get("/api/v1/users", headers=admin_auth)).status_code == 200
	assert (await client.get("/api/v1/users", headers=rec_auth)).status_code == 403

	# 2. Expense operations: Admin and Reception can record expenses
	assert (await client.get("/api/v1/expenses", headers=admin_auth)).status_code == 200
	assert (await client.get("/api/v1/expenses", headers=rec_auth)).status_code == 200

	# 3. Reports: Admin 200, Reception 403
	assert (await client.get("/api/v1/reports/daily", headers=admin_auth)).status_code == 200
	assert (await client.get("/api/v1/reports/daily", headers=rec_auth)).status_code == 403

	# 4. Settings: Admin 200, Reception 403
	assert (await client.get("/api/v1/settings", headers=admin_auth)).status_code == 200
	assert (await client.get("/api/v1/settings", headers=rec_auth)).status_code == 403

	# 5. Operational endpoints: Both Admin and Reception 200
	assert (await client.get("/api/v1/rooms", headers=admin_auth)).status_code == 200
	assert (await client.get("/api/v1/rooms", headers=rec_auth)).status_code == 200
	assert (await client.get("/api/v1/guests", headers=admin_auth)).status_code == 200
	assert (await client.get("/api/v1/guests", headers=rec_auth)).status_code == 200
	assert (await client.get("/api/v1/stays", headers=admin_auth)).status_code == 200
	assert (await client.get("/api/v1/stays", headers=rec_auth)).status_code == 200


@pytest.mark.asyncio
async def test_no_guest_or_customer_user_roles(client: AsyncClient, users) -> None:
	token = await token_for(client, "admin", "admin-password-123")
	headers = {"Authorization": f"Bearer {token}"}

	# Cannot create a user with non-existent roles like GUEST, CUSTOMER, etc.
	for invalid_role in ("GUEST", "CUSTOMER", "ONLINE_CUSTOMER", "PUBLIC_USER", "STAFF"):
		res = await client.post(
			"/api/v1/users",
			headers=headers,
			json={
				"full_name": f"Test {invalid_role}",
				"username": f"user-{invalid_role.lower()}",
				"password": "some-password-123",
				"role": invalid_role,
			},
		)
		assert res.status_code == 422


@pytest.mark.asyncio
async def test_no_public_guest_endpoints_remain(client: AsyncClient) -> None:
	# Public booking and customer auth endpoints must not exist (404)
	assert (await client.get("/api/v1/public/rooms")).status_code == 404
	assert (await client.post("/api/v1/public/reservations", json={})).status_code == 404
	assert (await client.get("/api/v1/public/reservations/lookup?query=test")).status_code == 404
	assert (await client.post("/api/v1/public/google-auth", json={})).status_code == 404
	assert (await client.post("/api/v1/public/auth/register", json={})).status_code == 404
	assert (await client.post("/api/v1/public/auth/login", json={})).status_code == 404


@pytest.mark.asyncio
async def test_duplicate_username_and_user_creation(client: AsyncClient, users) -> None:
	token = await token_for(client, "admin", "admin-password-123")
	headers = {"Authorization": f"Bearer {token}"}
	duplicate = await client.post(
		"/api/v1/users",
		headers=headers,
		json={
			"full_name": "Another Admin",
			"username": "admin",
			"password": "another-password-123",
			"role": "ADMIN",
		},
	)
	created = await client.post(
		"/api/v1/users",
		headers=headers,
		json={
			"full_name": "New Reception",
			"username": "new-reception",
			"password": "new-reception-password",
			"role": "RECEPTION",
		},
	)
	assert duplicate.status_code == 409
	assert created.status_code == 201
	assert "password_hash" not in created.json()


@pytest.mark.asyncio
async def test_user_activation_and_deactivation(client: AsyncClient, users) -> None:
	token = await token_for(client, "admin", "admin-password-123")
	headers = {"Authorization": f"Bearer {token}"}
	deactivated = await client.post("/api/v1/users/2/deactivate", headers=headers)
	assert deactivated.status_code == 200
	assert deactivated.json()["is_active"] is False
	activated = await client.post("/api/v1/users/2/activate", headers=headers)
	assert activated.status_code == 200
	assert activated.json()["is_active"] is True
