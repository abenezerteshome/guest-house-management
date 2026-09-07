import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.charge import Charge, ChargeType
from app.models.guest import Guest
from app.models.payment import Payment, PaymentMethod, PaymentProvider, PaymentStatus
from app.models.room import Room
from app.models.stay import Stay, StayStatus
from app.repositories.charge import ChargeRepository
from app.repositories.payment import PaymentRepository


class FinancialServiceError(Exception):
	pass


class FinancialNotFoundError(FinancialServiceError):
	pass


class FinancialConflictError(FinancialServiceError):
	pass


def audit(session: AsyncSession, *, user_id: int | None, action: str, entity_type: str, entity_id: int, details: str | None = None) -> None:
	session.add(AuditLog(user_id=user_id, action=action, entity_type=entity_type, entity_id=entity_id, details=details))


async def get_stay_or_error(session: AsyncSession, stay_id: int) -> Stay:
	stay = await session.get(Stay, stay_id)
	if stay is None:
		raise FinancialNotFoundError("Stay not found")
	return stay


async def financial_summary(session: AsyncSession, stay_id: int) -> dict[str, Decimal | int]:
	await get_stay_or_error(session, stay_id)
	total_due = await ChargeRepository(session).total_for_stay(stay_id)
	total_paid = await PaymentRepository(session).successful_total_for_stay(stay_id)
	return {"stay_id": stay_id, "total_due": total_due, "total_paid": total_paid, "balance": total_due - total_paid}


async def add_charge_record(
	session: AsyncSession,
	*,
	stay_id: int,
	charge_type: ChargeType,
	description: str,
	amount: Decimal,
	quantity: int = 1,
	created_by: int | None,
) -> Charge:
	if amount <= 0 or quantity <= 0:
		raise FinancialConflictError("Charge amount and quantity must be positive")
	await get_stay_or_error(session, stay_id)
	charge = Charge(
		stay_id=stay_id,
		charge_type=charge_type.value,
		description=description,
		amount=amount,
		quantity=quantity,
		created_by=created_by,
	)
	await ChargeRepository(session).add(charge)
	audit(session, user_id=created_by, action="CHARGE_CREATED", entity_type="Charge", entity_id=charge.id)
	return charge


async def create_charge(
	session: AsyncSession, *, stay_id: int, user_id: int, charge_type: ChargeType, description: str, amount: Decimal, quantity: int = 1
) -> Charge:
	try:
		charge = await add_charge_record(
			session, stay_id=stay_id, charge_type=charge_type, description=description,
			amount=amount, quantity=quantity, created_by=user_id,
		)
		await session.commit()
	except FinancialServiceError:
		await session.rollback()
		raise
	await session.refresh(charge)
	return charge


async def create_manual_payment(
	session: AsyncSession, *, stay_id: int, user_id: int, amount: Decimal, payment_method: PaymentMethod, reference: str | None
) -> Payment:
	if payment_method == PaymentMethod.CHAPA:
		raise FinancialConflictError("CHAPA payments must use the Chapa initialization endpoint")
	if payment_method not in {
		PaymentMethod.CASH, PaymentMethod.TELEBIRR, PaymentMethod.CBE_BIRR, PaymentMethod.BANK_TRANSFER
	}:
		raise FinancialConflictError("Unsupported manual payment method")
	if amount <= 0:
		raise FinancialConflictError("Payment amount must be positive")
	stay = (await session.execute(select(Stay).where(Stay.id == stay_id).with_for_update())).scalar_one_or_none()
	if stay is None:
		raise FinancialNotFoundError("Stay not found")
	if stay.status not in {StayStatus.CHECKED_IN.value, StayStatus.CHECKED_OUT.value}:
		raise FinancialConflictError("Stay is not valid for payment")
	current = await financial_summary(session, stay_id)
	if amount > current["balance"]:
		raise FinancialConflictError("Payment exceeds outstanding balance")
	payment = Payment(
		stay_id=stay_id, amount=amount, payment_method=payment_method.value,
		status=PaymentStatus.SUCCESS.value, reference=reference, provider=PaymentProvider.MANUAL.value,
		paid_at=datetime.now(timezone.utc), created_by=user_id,
	)
	await PaymentRepository(session).add(payment)
	audit(session, user_id=user_id, action="PAYMENT_CREATED", entity_type="Payment", entity_id=payment.id)
	await session.commit()
	await session.refresh(payment)
	return payment


def generate_tx_ref(stay_id: int) -> str:
	return f"GH-STAY-{stay_id}-{uuid.uuid4()}"


async def create_pending_chapa_payment(
	session: AsyncSession, *, stay_id: int, user_id: int, amount: Decimal, tx_ref: str
) -> Payment:
	if amount <= 0:
		raise FinancialConflictError("Payment amount must be positive")
	stay = await get_stay_or_error(session, stay_id)
	if stay.status not in {StayStatus.CHECKED_IN.value, StayStatus.CHECKED_OUT.value}:
		raise FinancialConflictError("Stay is not valid for payment")
	current = await financial_summary(session, stay_id)
	if amount > current["balance"]:
		raise FinancialConflictError("Payment exceeds outstanding balance")
	payment = Payment(
		stay_id=stay_id, amount=amount, payment_method=PaymentMethod.CHAPA.value,
		status=PaymentStatus.PENDING.value, provider=PaymentProvider.CHAPA.value,
		tx_ref=tx_ref, created_by=user_id,
	)
	try:
		await PaymentRepository(session).add(payment)
		audit(session, user_id=user_id, action="CHAPA_PAYMENT_INITIALIZED", entity_type="Payment", entity_id=payment.id)
		await session.commit()
	except IntegrityError as exc:
		await session.rollback()
		raise FinancialConflictError("Could not create unique Chapa payment") from exc
	await session.refresh(payment)
	return payment


async def process_verified_chapa_payment(
	session: AsyncSession, *, payment: Payment, transaction: dict[str, object], user_id: int | None = None
) -> Payment:
	if payment.status == PaymentStatus.SUCCESS.value:
		return payment
	if payment.status != PaymentStatus.PENDING.value:
		raise FinancialConflictError("Payment is not pending")
	current = await financial_summary(session, payment.stay_id)
	if payment.amount > current["balance"]:
		raise FinancialConflictError("Verified payment exceeds outstanding balance")
	if transaction.get("tx_ref") != payment.tx_ref:
		raise FinancialConflictError("Chapa transaction reference mismatch")
	if str(transaction.get("currency", "")).upper() != "ETB":
		raise FinancialConflictError("Chapa currency mismatch")
	try:
		verified_amount = Decimal(str(transaction["amount"]))
	except (KeyError, ValueError) as exc:
		raise FinancialConflictError("Invalid Chapa amount") from exc
	if verified_amount != payment.amount or str(transaction.get("status", "")).lower() not in {"success", "successful"}:
		raise FinancialConflictError("Chapa transaction verification failed")
	payment.status = PaymentStatus.SUCCESS.value
	payment.provider_transaction_id = str(transaction.get("reference") or transaction.get("ref_id") or "") or None
	payment.paid_at = datetime.now(timezone.utc)
	payment.metadata_json = transaction
	audit(session, user_id=user_id, action="PAYMENT_SUCCESS", entity_type="Payment", entity_id=payment.id)
	audit(session, user_id=user_id, action="CHAPA_PAYMENT_VERIFIED", entity_type="Payment", entity_id=payment.id)
	await session.commit()
	await session.refresh(payment)
	return payment
