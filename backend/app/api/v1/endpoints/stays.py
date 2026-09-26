from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.stay import Stay, StayStatus
from app.models.user import User, UserRole
from app.repositories.stay import StayRepository
from app.schemas.stay import StayCheckOut, StayExtend, StayRead, VoidCheckInRequest
from app.services.reservation import InvalidTransitionError, ResourceNotFoundError
from app.services.stay import check_out, extend_stay, get_stay, void_check_in


router = APIRouter(prefix="/stays", tags=["stays"])
operational_user = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION))


def stay_error(exc: Exception) -> HTTPException:
	if isinstance(exc, ResourceNotFoundError):
		return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
	return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("", response_model=list[StayRead])
async def list_stays(
	stay_status: StayStatus | None = Query(default=None, alias="status"),
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)),
	session: AsyncSession = Depends(get_db),
) -> list[Stay]:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	return await StayRepository(session, property_id=prop_id).list(status=stay_status.value if stay_status else None)


@router.get("/{stay_id}", response_model=StayRead)
async def get_stay_endpoint(
	stay_id: int,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)),
	session: AsyncSession = Depends(get_db),
) -> Stay:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	stay = await StayRepository(session, property_id=prop_id).get_by_id(stay_id)
	if stay is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stay not found")
	return stay


@router.post("/{stay_id}/check-out", response_model=StayRead)
async def check_out_stay(
	stay_id: int,
	payload: StayCheckOut | None = Body(default=None),
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)),
	session: AsyncSession = Depends(get_db),
) -> Stay:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	stay = await StayRepository(session, property_id=prop_id).get_by_id(stay_id)
	if stay is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stay not found")
	try:
		return await check_out(
			session,
			stay,
			user_id=current_user.id,
			now=datetime.now(timezone.utc),
			penalty_amount=payload.penalty_amount if payload else None,
			actual_checkout_at=payload.actual_checkout_at if payload else None,
		)
	except (ResourceNotFoundError, InvalidTransitionError) as exc:
		raise stay_error(exc) from exc


@router.patch("/{stay_id}/extend", response_model=StayRead)
async def extend_stay_endpoint(
	stay_id: int,
	payload: StayExtend,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)),
	session: AsyncSession = Depends(get_db),
) -> Stay:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	stay = await StayRepository(session, property_id=prop_id).get_by_id(stay_id)
	if stay is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stay not found")
	try:
		return await extend_stay(
			session,
			stay,
			user_id=current_user.id,
			new_expected_checkout=payload.new_expected_checkout,
			payment_option=payload.payment_option,
			payment_method=payload.payment_method,
		)
	except (ResourceNotFoundError, InvalidTransitionError) as exc:
		raise stay_error(exc) from exc


@router.post("/{stay_id}/void", response_model=StayRead)
async def void_stay_check_in(
	stay_id: int,
	payload: VoidCheckInRequest,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)),
	session: AsyncSession = Depends(get_db),
) -> Stay:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	stay = await StayRepository(session, property_id=prop_id).get_by_id(stay_id)
	if stay is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stay not found")
	try:
		return await void_check_in(
			session,
			stay,
			user_id=current_user.id,
			now=datetime.now(timezone.utc),
			reason=payload.reason,
			notes=payload.notes,
			room_condition=payload.room_condition,
			refund_amount=payload.refund_amount,
			refund_method=payload.refund_method,
			refund_bank_name=payload.refund_bank_name,
		)
	except (ResourceNotFoundError, InvalidTransitionError) as exc:
		raise stay_error(exc) from exc