from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.stay import Stay, StayStatus
from app.models.user import User, UserRole
from app.repositories.stay import StayRepository
from app.schemas.stay import StayExtend, StayRead
from app.services.reservation import InvalidTransitionError, ResourceNotFoundError
from app.services.stay import check_out, extend_stay, get_stay


router = APIRouter(prefix="/stays", tags=["stays"])
operational_user = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION))


def stay_error(exc: Exception) -> HTTPException:
	if isinstance(exc, ResourceNotFoundError):
		return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
	return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("", response_model=list[StayRead], dependencies=[operational_user])
async def list_stays(
	stay_status: StayStatus | None = Query(default=None, alias="status"),
	session: AsyncSession = Depends(get_db),
) -> list[Stay]:
	return await StayRepository(session).list(status=stay_status.value if stay_status else None)


@router.get("/{stay_id}", response_model=StayRead, dependencies=[operational_user])
async def get_stay_endpoint(stay_id: int, session: AsyncSession = Depends(get_db)) -> Stay:
	try:
		return await get_stay(session, stay_id)
	except ResourceNotFoundError as exc:
		raise stay_error(exc) from exc


@router.post("/{stay_id}/check-out", response_model=StayRead, dependencies=[operational_user])
async def check_out_stay(
	stay_id: int,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> Stay:
	try:
		stay = await get_stay(session, stay_id)
		return await check_out(session, stay, user_id=current_user.id, now=datetime.now(timezone.utc))
	except (ResourceNotFoundError, InvalidTransitionError) as exc:
		raise stay_error(exc) from exc


@router.patch("/{stay_id}/extend", response_model=StayRead, dependencies=[operational_user])
async def extend_stay_endpoint(
	stay_id: int,
	payload: StayExtend,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> Stay:
	try:
		stay = await get_stay(session, stay_id)
		return await extend_stay(
			session,
			stay,
			user_id=current_user.id,
			new_expected_checkout=payload.new_expected_checkout,
		)
	except (ResourceNotFoundError, InvalidTransitionError) as exc:
		raise stay_error(exc) from exc