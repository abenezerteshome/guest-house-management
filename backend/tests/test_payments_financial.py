import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.payment import Payment, PaymentStatus
from app.repositories.payment import PaymentRepository
from app.services.chapa_client import ChapaClient


def auth(token: str) -> dict[str, str]:
	return {"Authorization": f"Bearer {token}"}


async def token_for(client: AsyncClient, username: str = "admin") -> str:
	response = await client.post(
		"/api/v1/auth/login",
		json={"username": username, "password": f"{username}-password-123"},
	)
	return response.json()["access_token"]


async def create_checked_in_stay(client: AsyncClient, token: str) -> tuple[int, int]:
	room = await client.post(
		"/api/v1/rooms", headers=auth(token),
		json={"room_number": "401", "room_type": "Single", "price": "1000.00"},
	)
	guest = await client.post(
		"/api/v1/guests", headers=auth(token),
		json={"full_name": "Financial Guest", "id_number": "FIN-1", "phone": "555"},
	)
	arrival = datetime.now(timezone.utc) + timedelta(days=1)
	reservation = await client.post(
		"/api/v1/reservations", headers=auth(token),
		json={"guest_id": guest.json()["id"], "room_id": room.json()["id"],
			  "expected_arrival": arrival.isoformat(), "expected_checkout": (arrival + timedelta(days=1)).isoformat()},
	)
	assert reservation.status_code == 201
	check_in = await client.post(
		f"/api/v1/reservations/{reservation.json()['id']}/check-in", headers=auth(token)
	)
	assert check_in.status_code == 200
	stay_id = (await client.get("/api/v1/stays", headers=auth(token))).json()[0]["id"]
	return stay_id, room.json()["id"]


@pytest.mark.asyncio
async def test_room_charge_and_derived_summary(client: AsyncClient, users) -> None:
	token = await token_for(client)
	stay_id, _ = await create_checked_in_stay(client, token)
	charges = await client.get(f"/api/v1/stays/{stay_id}/charges", headers=auth(token))
	summary = await client.get(f"/api/v1/stays/{stay_id}/financial-summary", headers=auth(token))
	assert charges.status_code == 200
	assert charges.json()[0]["charge_type"] == "ROOM"
	assert summary.json()["total_due"] == "1000.00"
	assert summary.json()["total_paid"] == "0.00"
	assert summary.json()["balance"] == "1000.00"


@pytest.mark.asyncio
async def test_extension_and_manual_payment_balance(client: AsyncClient, users) -> None:
	token = await token_for(client)
	stay_id, _ = await create_checked_in_stay(client, token)
	stay = (await client.get(f"/api/v1/stays/{stay_id}", headers=auth(token))).json()
	new_checkout = datetime.fromisoformat(stay["expected_checkout"]) + timedelta(days=1)
	assert (await client.patch(
		f"/api/v1/stays/{stay_id}/extend", headers=auth(token),
		json={"new_expected_checkout": new_checkout.isoformat()},
	)).status_code == 200
	payment = await client.post(
		f"/api/v1/stays/{stay_id}/payments", headers=auth(token),
		json={"amount": "500.00", "payment_method": "CASH"},
	)
	assert payment.status_code == 201
	summary = (await client.get(f"/api/v1/stays/{stay_id}/financial-summary", headers=auth(token))).json()
	assert summary == {"stay_id": stay_id, "total_due": "2000.00", "total_paid": "500.00", "balance": "1500.00"}
	overpayment = await client.post(
		f"/api/v1/stays/{stay_id}/payments", headers=auth(token),
		json={"amount": "1501.00", "payment_method": "CASH"},
	)
	assert overpayment.status_code == 409


@pytest.mark.asyncio
async def test_payment_methods_and_failed_payment_not_counted(client: AsyncClient, users) -> None:
	token = await token_for(client)
	stay_id, _ = await create_checked_in_stay(client, token)
	for method in ("TELEBIRR", "CBE_BIRR", "BANK_TRANSFER"):
		response = await client.post(
			f"/api/v1/stays/{stay_id}/payments", headers=auth(token),
			json={"amount": "100.00", "payment_method": method},
		)
		assert response.status_code == 201
	async with AsyncSessionLocal() as session:
		payment = (await PaymentRepository(session).list_for_stay(stay_id))[-1]
		payment.status = PaymentStatus.FAILED.value
		await session.commit()
	summary = (await client.get(f"/api/v1/stays/{stay_id}/financial-summary", headers=auth(token))).json()
	assert summary["total_paid"] == "200.00"


@pytest.mark.asyncio
async def test_chapa_initialization_and_verified_reconciliation(client: AsyncClient, users, monkeypatch) -> None:
	token = await token_for(client)
	stay_id, _ = await create_checked_in_stay(client, token)

	async def initialize(self, **kwargs):
		return {"data": {"checkout_url": "https://checkout.example/test"}}

	async def verify(self, tx_ref):
		return {"data": {"tx_ref": tx_ref, "amount": "100.00", "currency": "ETB", "status": "success", "reference": "CHAPA-1"}}

	monkeypatch.setattr(ChapaClient, "initialize_transaction", initialize)
	monkeypatch.setattr(ChapaClient, "verify_transaction", verify)
	response = await client.post(
		f"/api/v1/stays/{stay_id}/payments/chapa/initialize", headers=auth(token),
		json={"amount": "100.00"},
	)
	assert response.status_code == 200
	assert response.json()["checkout_url"] == "https://checkout.example/test"
	callback = await client.get(f"/api/v1/payments/chapa/callback?tx_ref={response.json()['tx_ref']}")
	assert callback.status_code == 200
	payments = (await client.get(f"/api/v1/stays/{stay_id}/payments", headers=auth(token))).json()
	assert payments[0]["status"] == "SUCCESS"
	assert (await client.get(f"/api/v1/stays/{stay_id}/financial-summary", headers=auth(token))).json()["total_paid"] == "100.00"


@pytest.mark.asyncio
async def test_chapa_webhook_signature_and_idempotency(client: AsyncClient, users, monkeypatch) -> None:
	token = await token_for(client)
	stay_id, _ = await create_checked_in_stay(client, token)

	async def initialize(self, **kwargs):
		return {"data": {"checkout_url": "https://checkout.example/test"}}

	async def verify(self, tx_ref):
		return {"data": {"tx_ref": tx_ref, "amount": "100.00", "currency": "ETB", "status": "success", "reference": "CHAPA-2"}}

	monkeypatch.setattr(ChapaClient, "initialize_transaction", initialize)
	monkeypatch.setattr(ChapaClient, "verify_transaction", verify)
	initialized = await client.post(
		f"/api/v1/stays/{stay_id}/payments/chapa/initialize", headers=auth(token),
		json={"amount": "100.00"},
	)
	payload = f'{{"tx_ref":"{initialized.json()["tx_ref"]}","status":"success"}}'.encode()
	secret = get_settings().chapa_webhook_secret or "test-webhook-secret"
	get_settings().chapa_webhook_secret = secret
	signature = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
	first = await client.post("/api/v1/payments/chapa/webhook", content=payload, headers={"chapa-signature": signature})
	second = await client.post("/api/v1/payments/chapa/webhook", content=payload, headers={"x-chapa-signature": signature})
	assert first.status_code == 200
	assert second.status_code == 200
	assert len((await client.get(f"/api/v1/stays/{stay_id}/payments", headers=auth(token))).json()) == 1
	bad = await client.post("/api/v1/payments/chapa/webhook", content=payload, headers={"chapa-signature": "bad"})
	assert bad.status_code == 401


@pytest.mark.asyncio
async def test_payment_status_endpoint_and_financial_integrity(client: AsyncClient, users, monkeypatch) -> None:
	token = await token_for(client)
	stay_id, _ = await create_checked_in_stay(client, token)

	async def initialize(self, **kwargs):
		return {"data": {"checkout_url": "https://checkout.example/pay"}}

	async def verify(self, tx_ref):
		return {"data": {"tx_ref": tx_ref, "amount": "300.00", "currency": "ETB", "status": "success", "reference": "CHAPA-3"}}

	monkeypatch.setattr(ChapaClient, "initialize_transaction", initialize)
	monkeypatch.setattr(ChapaClient, "verify_transaction", verify)

	init_res = await client.post(
		f"/api/v1/stays/{stay_id}/payments/chapa/initialize", headers=auth(token),
		json={"amount": "300.00"},
	)
	assert init_res.status_code == 200
	payment_id = init_res.json()["payment_id"]
	tx_ref = init_res.json()["tx_ref"]

	# Check individual payment by ID
	pay_by_id = await client.get(f"/api/v1/payments/{payment_id}", headers=auth(token))
	assert pay_by_id.status_code == 200
	assert pay_by_id.json()["status"] == "PENDING"

	# Pending payment does not increase total_paid
	summary_before = (await client.get(f"/api/v1/stays/{stay_id}/financial-summary", headers=auth(token))).json()
	assert summary_before["total_paid"] == "0.00"
	assert summary_before["balance"] == "1000.00"

	# Query chapa status by tx_ref triggers reconciliation and returns SUCCESS
	status_res = await client.get(f"/api/v1/payments/chapa/status/{tx_ref}")
	assert status_res.status_code == 200
	assert status_res.json()["status"] == "SUCCESS"

	# Financial summary updated: total_paid increases, balance decreases
	summary_after = (await client.get(f"/api/v1/stays/{stay_id}/financial-summary", headers=auth(token))).json()
	assert summary_after["total_paid"] == "300.00"
	assert summary_after["balance"] == "700.00"