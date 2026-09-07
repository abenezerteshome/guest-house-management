import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.db.session import AsyncSessionLocal
from app.models.user import UserRole
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


async def token_for(client: AsyncClient, username: str) -> str:
	response = await client.post(
		"/api/v1/auth/login",
		json={"username": username, "password": f"{username}-password-123"},
	)
	return response.json()["access_token"]


def auth(token: str) -> dict[str, str]:
	return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_room_rbac_and_crud(client: AsyncClient, users) -> None:
	admin_token = await token_for(client, "admin")
	reception_token = await token_for(client, "reception")
	created = await client.post(
		"/api/v1/rooms",
		headers=auth(admin_token),
		json={"room_number": "101", "room_type": "Single", "price": "50.00"},
	)
	assert created.status_code == 201
	room_id = created.json()["id"]

	assert (await client.post(
		"/api/v1/rooms",
		headers=auth(reception_token),
		json={"room_number": "102", "room_type": "Double", "price": "70.00"},
	)).status_code == 403
	assert (await client.get("/api/v1/rooms", headers=auth(admin_token))).status_code == 200
	assert (await client.get("/api/v1/rooms", headers=auth(reception_token))).status_code == 200
	assert (await client.get(f"/api/v1/rooms/{room_id}", headers=auth(reception_token))).status_code == 200
	assert (await client.patch(
		f"/api/v1/rooms/{room_id}",
		headers=auth(reception_token),
		json={"price": "55.00"},
	)).status_code == 403
	updated = await client.patch(
		f"/api/v1/rooms/{room_id}",
		headers=auth(admin_token),
		json={"price": "55.00"},
	)
	assert updated.status_code == 200


@pytest.mark.asyncio
async def test_room_status_filter_and_status_rbac(client: AsyncClient, users) -> None:
	admin_token = await token_for(client, "admin")
	reception_token = await token_for(client, "reception")
	created = await client.post(
		"/api/v1/rooms",
		headers=auth(admin_token),
		json={"room_number": "201", "room_type": "Suite", "price": "100.00"},
	)
	room_id = created.json()["id"]
	changed = await client.patch(
		f"/api/v1/rooms/{room_id}/status",
		headers=auth(admin_token),
		json={"status": "MAINTENANCE"},
	)
	assert changed.status_code == 200
	assert changed.json()["status"] == "MAINTENANCE"
	assert (await client.patch(
		f"/api/v1/rooms/{room_id}/status",
		headers=auth(reception_token),
		json={"status": "AVAILABLE"},
	)).status_code == 403
	filtered = await client.get("/api/v1/rooms?status=MAINTENANCE", headers=auth(reception_token))
	assert [room["id"] for room in filtered.json()] == [room_id]


@pytest.mark.asyncio
async def test_room_validation_conflicts_and_not_found(client: AsyncClient, users) -> None:
	token = await token_for(client, "admin")
	room = {"room_number": "301", "room_type": "Single", "price": "10.00"}
	assert (await client.post("/api/v1/rooms", headers=auth(token), json=room)).status_code == 201
	assert (await client.post("/api/v1/rooms", headers=auth(token), json=room)).status_code == 409
	assert (await client.post(
		"/api/v1/rooms", headers=auth(token),
		json={"room_number": "302", "room_type": "Single", "price": "-1"},
	)).status_code == 422
	assert (await client.post(
		"/api/v1/rooms", headers=auth(token),
		json={"room_number": "303", "room_type": "Single", "price": "10", "status": "BROKEN"},
	)).status_code == 422
	assert (await client.get("/api/v1/rooms/9999", headers=auth(token))).status_code == 404
	assert (await client.get("/api/v1/rooms")).status_code == 401


@pytest.mark.asyncio
async def test_guest_rbac_crud_and_search(client: AsyncClient, users) -> None:
	admin_token = await token_for(client, "admin")
	reception_token = await token_for(client, "reception")
	guest = {
		"full_name": "  Abebe Kebede ",
		"id_number": " ETH-123 ",
		"phone": " +251900000000 ",
		"address": " Addis Ababa ",
	}
	created = await client.post("/api/v1/guests", headers=auth(reception_token), json=guest)
	assert created.status_code == 201
	assert created.json()["full_name"] == "Abebe Kebede"
	guest_id = created.json()["id"]

	assert (await client.get("/api/v1/guests", headers=auth(admin_token))).status_code == 200
	assert (await client.get(f"/api/v1/guests/{guest_id}", headers=auth(reception_token))).status_code == 200
	assert (await client.patch(
		f"/api/v1/guests/{guest_id}",
		headers=auth(reception_token),
		json={"phone": " +251911111111 "},
	)).status_code == 200
	for search in ("Abebe", "ETH-123", "+251911111111"):
		response = await client.get(f"/api/v1/guests?search={search}", headers=auth(reception_token))
		assert response.status_code == 200
		assert response.json()[0]["id"] == guest_id
	assert (await client.delete(f"/api/v1/guests/{guest_id}", headers=auth(reception_token))).status_code == 403
	assert (await client.delete(f"/api/v1/guests/{guest_id}", headers=auth(admin_token))).status_code == 204


@pytest.mark.asyncio
async def test_guest_validation_and_not_found(client: AsyncClient, users) -> None:
	token = await token_for(client, "admin")
	invalid = {"full_name": " ", "id_number": "ID", "phone": "123"}
	assert (await client.post("/api/v1/guests", headers=auth(token), json=invalid)).status_code == 422
	assert (await client.get("/api/v1/guests/9999", headers=auth(token))).status_code == 404
	assert (await client.get("/api/v1/guests")).status_code == 401