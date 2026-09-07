from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.charge import Charge
from app.models.payment import Payment
from app.models.stay import Stay
from app.models.user import User, UserRole
from app.repositories.charge import ChargeRepository
from app.repositories.payment import PaymentRepository
from app.schemas.charge import ChargeCreate, ChargeRead, FinancialSummary
from app.schemas.payment import ManualPaymentCreate, PaymentRead
from app.services.payment import (
	FinancialConflictError,
	FinancialNotFoundError,
	create_charge,
	create_manual_payment,
	financial_summary,
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


@router.get("/payments/{payment_id}", response_model=PaymentRead, dependencies=[operational_user])
async def get_payment(payment_id: int, session: AsyncSession = Depends(get_db)) -> Payment:
	payment = await PaymentRepository(session).get_by_id(payment_id)
	if payment is None:
		raise HTTPException(status_code=404, detail="Payment not found")
	return payment