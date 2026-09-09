from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


def auth(token: str) -> dict[str, str]:
	return {"Authorization": f"Bearer {token}"}


async def token_for(client: AsyncClient, username: str) -> str:
	response = await client.post(
		"/api/v1/auth/login",
		json={"username": username, "password": f"{username}-password-123"},
	)
	return response.json()["access_token"]


async def setup_reservation(client: AsyncClient, token: str, room_number: str = "101") -> tuple[int, int, int]:
	room = await client.post(
		"/api/v1/rooms",
		headers=auth(token),
		json={"room_number": room_number, "room_type": "Single", "price": "50.00"},
	)
	guest = await client.post(
		"/api/v1/guests",
		headers=auth(token),
		json={"full_name": "Phase Three Guest", "id_number": f"ID-{room_number}", "phone": "555"},
	)
	arrival = datetime.now(timezone.utc) + timedelta(days=1)
	checkout = arrival + timedelta(days=2)
	reservation = await client.post(
		"/api/v1/reservations",
		headers=auth(token),
		json={
			"guest_id": guest.json()["id"],
			"room_id": room.json()["id"],
			"expected_arrival": arrival.isoformat(),
			"expected_checkout": checkout.isoformat(),
		},
	)
	assert reservation.status_code == 201
	return reservation.json()["id"], room.json()["id"], guest.json()["id"]


@pytest.mark.asyncio
async def test_reservation_creation_conflict_and_room_expected(client: AsyncClient, users) -> None:
	token = await token_for(client, "admin")
	reservation_id, room_id, guest_id = await setup_reservation(client, token)
	room = await client.get(f"/api/v1/rooms/{room_id}", headers=auth(token))
	assert room.json()["status"] == "EXPECTED"
	conflict = await client.post(
		"/api/v1/reservations",
		headers=auth(token),
		json={
			"guest_id": guest_id,
			"room_id": room_id,
			"expected_arrival": (datetime.now(timezone.utc) + timedelta(days=1, hours=1)).isoformat(),
			"expected_checkout": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
		},
	)
	assert conflict.status_code == 409
	assert (await client.get(f"/api/v1/reservations/{reservation_id}", headers=auth(token))).status_code == 200


@pytest.mark.asyncio
async def test_check_in_and_check_out_lifecycle(client: AsyncClient, users) -> None:
	token = await token_for(client, "admin")
	reservation_id, room_id, _ = await setup_reservation(client, token)
	checked_in = await client.post(f"/api/v1/reservations/{reservation_id}/check-in", headers=auth(token))
	assert checked_in.status_code == 200
	stays = await client.get("/api/v1/stays", headers=auth(token))
	assert stays.status_code == 200
	stay = stays.json()[0]
	assert stay["status"] == "CHECKED_IN"
	assert stay["actual_checkout_at"] is None
	assert not {"credit", "total_paid", "total_bill", "remaining_balance", "amount_due", "paid_amount"}.intersection(stay)
	room = await client.get(f"/api/v1/rooms/{room_id}", headers=auth(token))
	assert room.json()["status"] == "OCCUPIED"
	checked_out = await client.post(f"/api/v1/stays/{stay['id']}/check-out", headers=auth(token))
	assert checked_out.status_code == 200
	assert checked_out.json()["status"] == "CHECKED_OUT"
	room_data = (await client.get(f"/api/v1/rooms/{room_id}", headers=auth(token))).json()
	assert room_data["status"] == "AVAILABLE"
	assert room_data["available_after"] is None
	assert (await client.post(f"/api/v1/stays/{stay['id']}/check-out", headers=auth(token))).status_code == 400


@pytest.mark.asyncio
async def test_cancel_and_no_show_release_room(client: AsyncClient, users) -> None:
	token = await token_for(client, "admin")
	reservation_id, room_id, _ = await setup_reservation(client, token, "102")
	assert (await client.post(f"/api/v1/reservations/{reservation_id}/cancel", headers=auth(token))).status_code == 200
	assert (await client.get(f"/api/v1/rooms/{room_id}", headers=auth(token))).json()["status"] == "AVAILABLE"
	room = await client.post(
		"/api/v1/rooms",
		headers=auth(token),
		json={"room_number": "103", "room_type": "Single", "price": "50.00"},
	)
	guest = await client.post(
		"/api/v1/guests",
		headers=auth(token),
		json={"full_name": "No Show Guest", "id_number": "ID-103", "phone": "555"},
	)
	arrival = datetime.now(timezone.utc) - timedelta(hours=1)
	reservation = await client.post(
		"/api/v1/reservations",
		headers=auth(token),
		json={
			"guest_id": guest.json()["id"],
			"room_id": room.json()["id"],
			"expected_arrival": arrival.isoformat(),
			"expected_checkout": (arrival + timedelta(days=1)).isoformat(),
		},
	)
	assert reservation.status_code == 201
	reservation_id = reservation.json()["id"]
	room_id = room.json()["id"]
	assert (await client.post(f"/api/v1/reservations/{reservation_id}/no-show", headers=auth(token))).status_code == 200
	assert (await client.get(f"/api/v1/rooms/{room_id}", headers=auth(token))).json()["status"] == "AVAILABLE"


@pytest.mark.asyncio
async def test_stay_extension_and_late_detection(client: AsyncClient, users) -> None:
	token = await token_for(client, "admin")
	reservation_id, _, _ = await setup_reservation(client, token, "104")
	assert (await client.post(f"/api/v1/reservations/{reservation_id}/check-in", headers=auth(token))).status_code == 200
	stay = (await client.get("/api/v1/stays", headers=auth(token))).json()[0]
	new_checkout = datetime.fromisoformat(stay["expected_checkout"]) + timedelta(days=1)
	extended = await client.patch(
		f"/api/v1/stays/{stay['id']}/extend",
		headers=auth(token),
		json={"new_expected_checkout": new_checkout.isoformat()},
	)
	assert extended.status_code == 200
	assert extended.json()["expected_checkout"] == new_checkout.isoformat().replace("+00:00", "Z")
	assert (await client.patch(
		f"/api/v1/stays/{stay['id']}/extend",
		headers=auth(token),
		json={"new_expected_checkout": stay["expected_checkout"]},
	)).status_code == 400


@pytest.mark.asyncio
async def test_phase3_rbac_and_validation(client: AsyncClient, users) -> None:
	reception = await token_for(client, "reception")
	assert (await client.get("/api/v1/reservations")).status_code == 401
	bad = await client.post(
		"/api/v1/reservations",
		headers=auth(reception),
		json={"guest_id": 999, "room_id": 999, "expected_arrival": "2026-01-02T00:00:00Z", "expected_checkout": "2026-01-01T00:00:00Z"},
	)
	assert bad.status_code == 422