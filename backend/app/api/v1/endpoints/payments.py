import hashlib
import hmac
import json
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.charge import Charge
from app.models.guest import Guest
from app.models.payment import Payment, PaymentStatus
from app.models.stay import Stay
from app.models.user import User, UserRole
from app.repositories.charge import ChargeRepository
from app.repositories.payment import PaymentRepository
from app.schemas.charge import ChargeCreate, ChargeRead, FinancialSummary
from app.schemas.payment import (
	ChapaInitializeRequest,
	ChapaInitializeResponse,
	ManualPaymentCreate,
	PaymentRead,
)
from app.services.chapa_client import ChapaClient, ChapaClientError
from app.services.payment import (
	FinancialConflictError,
	FinancialNotFoundError,
	create_charge,
	create_manual_payment,
	create_pending_chapa_payment,
	financial_summary,
	generate_tx_ref,
	process_verified_chapa_payment,
)


router = APIRouter(tags=["payments"])
operational_user = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION))


def financial_error(exc: Exception) -> HTTPException:
	if isinstance(exc, FinancialNotFoundError):
		return HTTPException(status_code=404, detail=str(exc))
	return HTTPException(status_code=409, detail=str(exc))


async def stay_or_404(stay_id: int, session: AsyncSession) -> Stay:
	stay = await session.get(Stay, stay_id)
	if stay is None:
		raise HTTPException(status_code=404, detail="Stay not found")
	return stay


@router.get("/stays/{stay_id}/charges", response_model=list[ChargeRead], dependencies=[operational_user])
async def list_charges(stay_id: int, session: AsyncSession = Depends(get_db)) -> list[Charge]:
	await stay_or_404(stay_id, session)
	return await ChargeRepository(session).list_for_stay(stay_id)


@router.post("/stays/{stay_id}/charges", response_model=ChargeRead, status_code=201, dependencies=[operational_user])
async def add_charge(
	stay_id: int,
	payload: ChargeCreate,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> Charge:
	try:
		return await create_charge(session, stay_id=stay_id, user_id=current_user.id, **payload.model_dump())
	except (FinancialNotFoundError, FinancialConflictError) as exc:
		raise financial_error(exc) from exc


@router.get("/stays/{stay_id}/payments", response_model=list[PaymentRead], dependencies=[operational_user])
async def list_payments(stay_id: int, session: AsyncSession = Depends(get_db)) -> list[Payment]:
	await stay_or_404(stay_id, session)
	return await PaymentRepository(session).list_for_stay(stay_id)


@router.post("/stays/{stay_id}/payments", response_model=PaymentRead, status_code=201, dependencies=[operational_user])
async def add_manual_payment(
	stay_id: int,
	payload: ManualPaymentCreate,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> Payment:
	try:
		return await create_manual_payment(session, stay_id=stay_id, user_id=current_user.id, **payload.model_dump())
	except (FinancialNotFoundError, FinancialConflictError) as exc:
		raise financial_error(exc) from exc


@router.get("/stays/{stay_id}/financial-summary", response_model=FinancialSummary, dependencies=[operational_user])
async def get_financial_summary(stay_id: int, session: AsyncSession = Depends(get_db)) -> dict:
	try:
		return await financial_summary(session, stay_id)
	except FinancialNotFoundError as exc:
		raise financial_error(exc) from exc


@router.post("/stays/{stay_id}/payments/chapa/initialize", response_model=ChapaInitializeResponse, dependencies=[operational_user])
async def initialize_chapa_payment(
	stay_id: int,
	payload: ChapaInitializeRequest,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> ChapaInitializeResponse:
	try:
		stay = await stay_or_404(stay_id, session)
		guest = await session.get(Guest, stay.guest_id)
		if guest is None:
			raise FinancialNotFoundError("Guest not found")
		tx_ref = generate_tx_ref(stay_id)
		payment = await create_pending_chapa_payment(
			session, stay_id=stay_id, user_id=current_user.id, amount=payload.amount, tx_ref=tx_ref
		)
		parts = guest.full_name.split(maxsplit=1)
		guest_email = f"guest-{guest.id}@havenhouse.com"
		data = await ChapaClient().initialize_transaction(
			amount=str(payload.amount), tx_ref=tx_ref,
			email=guest_email, first_name=parts[0],
			last_name=parts[1] if len(parts) > 1 else parts[0],
		)
		payment.metadata_json = {"checkout_url": data["data"]["checkout_url"]}
		await session.commit()
		return ChapaInitializeResponse(payment_id=payment.id, tx_ref=tx_ref, checkout_url=data["data"]["checkout_url"])
	except (FinancialNotFoundError, FinancialConflictError) as exc:
		raise financial_error(exc) from exc
	except ChapaClientError as exc:
		if "payment" in locals():
			payment.status = PaymentStatus.FAILED.value
			from app.services.payment import audit

			audit(session, user_id=current_user.id, action="PAYMENT_FAILED", entity_type="Payment", entity_id=payment.id)
			await session.commit()
		raise HTTPException(status_code=502, detail="Payment provider unavailable") from exc


def _verified_transaction(data: dict) -> dict:
	transaction = data.get("data", data)
	return {
		"tx_ref": transaction.get("tx_ref") or transaction.get("trx_ref"),
		"amount": transaction.get("amount"),
		"currency": transaction.get("currency"),
		"status": transaction.get("status"),
		"reference": transaction.get("reference") or transaction.get("ref_id"),
	}


async def reconcile_tx_ref(tx_ref: str, session: AsyncSession) -> Payment:
	payment = await PaymentRepository(session).get_by_tx_ref(tx_ref)
	if payment is None:
		raise FinancialNotFoundError("Payment not found")
	if payment.status == PaymentStatus.SUCCESS.value:
		return payment
	verified = _verified_transaction(await ChapaClient().verify_transaction(tx_ref))
	try:
		return await process_verified_chapa_payment(session, payment=payment, transaction=verified)
	except FinancialConflictError:
		from app.services.payment import audit

		audit(session, user_id=None, action="PAYMENT_RECONCILIATION_FAILED", entity_type="Payment", entity_id=payment.id)
		await session.commit()
		raise


@router.get("/payments/{payment_id}", response_model=PaymentRead, dependencies=[operational_user])
async def get_payment(payment_id: int, session: AsyncSession = Depends(get_db)) -> Payment:
	payment = await PaymentRepository(session).get_by_id(payment_id)
	if payment is None:
		raise HTTPException(status_code=404, detail="Payment not found")
	return payment


@router.get("/payments/chapa/status/{tx_ref}", response_model=PaymentRead)
async def get_chapa_payment_status(tx_ref: str, session: AsyncSession = Depends(get_db)) -> Payment:
	payment = await PaymentRepository(session).get_by_tx_ref(tx_ref)
	if payment is None:
		raise HTTPException(status_code=404, detail="Payment not found")
	if payment.status == PaymentStatus.PENDING.value:
		try:
			payment = await reconcile_tx_ref(tx_ref, session)
		except Exception:
			pass
	return payment


@router.get("/payments/chapa/callback")
async def chapa_callback(
	trx_ref: str | None = Query(default=None),
	tx_ref: str | None = Query(default=None),
	ref_id: str | None = Query(default=None),
	status_value: str | None = Query(default=None, alias="status"),
	session: AsyncSession = Depends(get_db),
) -> dict[str, str]:
	transaction_ref = tx_ref or trx_ref
	if not transaction_ref:
		raise HTTPException(status_code=400, detail="Missing transaction reference")
	try:
		await reconcile_tx_ref(transaction_ref, session)
	except (FinancialNotFoundError, FinancialConflictError, ChapaClientError) as exc:
		raise HTTPException(status_code=400, detail="Payment verification failed") from exc
	return {"status": "verified"}


def valid_webhook_signature(raw_body: bytes, signature: str | None) -> bool:
	secret = get_settings().chapa_webhook_secret
	if not secret or not signature:
		return False
	digest = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
	provided = signature.removeprefix("sha256=")
	return hmac.compare_digest(digest, provided)


@router.post("/payments/chapa/webhook")
async def chapa_webhook(request: Request, session: AsyncSession = Depends(get_db)) -> dict[str, str]:
	raw_body = await request.body()
	signature = request.headers.get("chapa-signature") or request.headers.get("x-chapa-signature")
	if not valid_webhook_signature(raw_body, signature):
		raise HTTPException(status_code=401, detail="Invalid webhook signature")
	try:
		payload = json.loads(raw_body)
	except json.JSONDecodeError as exc:
		raise HTTPException(status_code=400, detail="Invalid webhook payload") from exc
	tx_ref = payload.get("tx_ref") or payload.get("trx_ref") or payload.get("data", {}).get("tx_ref")
	if not tx_ref:
		raise HTTPException(status_code=400, detail="Missing transaction reference")
	payment = await PaymentRepository(session).get_by_tx_ref(tx_ref)
	if payment is not None:
		from app.services.payment import audit

		audit(session, user_id=None, action="CHAPA_WEBHOOK_RECEIVED", entity_type="Payment", entity_id=payment.id)
		await session.flush()
	try:
		await reconcile_tx_ref(tx_ref, session)
	except FinancialNotFoundError:
		return {"status": "ignored"}
	except (FinancialConflictError, ChapaClientError) as exc:
		raise HTTPException(status_code=400, detail="Payment verification failed") from exc
	return {"status": "processed"}