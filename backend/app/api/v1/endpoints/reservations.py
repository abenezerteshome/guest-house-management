from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.user import User, UserRole
from app.repositories.reservation import ReservationRepository
from app.schemas.reservation import ReservationCreate, ReservationRead, ReservationUpdate
from app.services.reservation import (
	ConflictError,
	InvalidTransitionError,
	ResourceNotFoundError,
	cancel_reservation,
	check_in,
	create_reservation,
	mark_no_show,
	update_reservation,
)


router = APIRouter(prefix="/reservations", tags=["reservations"])
operational_user = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION))


async def get_reservation_or_404(reservation_id: int, session: AsyncSession) -> Reservation:
	reservation = await ReservationRepository(session).get_by_id(reservation_id)
	if reservation is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
	return reservation


def service_error(exc: Exception) -> HTTPException:
	if isinstance(exc, ResourceNotFoundError):
		return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
	if isinstance(exc, ConflictError):
		return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
	return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("", response_model=list[ReservationRead], dependencies=[Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION))])
async def list_reservations(
	reservation_status: ReservationStatus | None = Query(default=None, alias="status"),
	room_id: int | None = Query(default=None, gt=0),
	guest_id: int | None = Query(default=None, gt=0),
	from_date: datetime | None = None,
	to_date: datetime | None = None,
	session: AsyncSession = Depends(get_db),
) -> list[Reservation]:
	return await ReservationRepository(session).list(
		status=reservation_status.value if reservation_status else None,
		room_id=room_id,
		guest_id=guest_id,
		from_date=from_date,
		to_date=to_date,
	)


@router.post("", response_model=ReservationRead, status_code=status.HTTP_201_CREATED, dependencies=[operational_user])
async def create_reservation_endpoint(
	payload: ReservationCreate,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> Reservation:
	try:
		return await create_reservation(session, user_id=current_user.id, **payload.model_dump())
	except (ResourceNotFoundError, ConflictError, InvalidTransitionError) as exc:
		raise service_error(exc) from exc


@router.get("/{reservation_id}", response_model=ReservationRead, dependencies=[operational_user])
async def get_reservation(reservation_id: int, session: AsyncSession = Depends(get_db)) -> Reservation:
	return await get_reservation_or_404(reservation_id, session)


@router.patch("/{reservation_id}", response_model=ReservationRead, dependencies=[operational_user])
async def patch_reservation(
	reservation_id: int,
	payload: ReservationUpdate,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> Reservation:
	reservation = await get_reservation_or_404(reservation_id, session)
	try:
		return await update_reservation(
			session, reservation, user_id=current_user.id, values=payload.model_dump(exclude_unset=True)
		)
	except (ResourceNotFoundError, ConflictError, InvalidTransitionError) as exc:
		raise service_error(exc) from exc


@router.post("/{reservation_id}/check-in", response_model=ReservationRead, dependencies=[operational_user])
async def check_in_reservation(
	reservation_id: int,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> Reservation:
	reservation = await get_reservation_or_404(reservation_id, session)
	try:
		await check_in(session, reservation, user_id=current_user.id, now=datetime.now(timezone.utc))
	except (ResourceNotFoundError, ConflictError, InvalidTransitionError) as exc:
		raise service_error(exc) from exc
	return reservation


@router.post("/{reservation_id}/cancel", response_model=ReservationRead, dependencies=[operational_user])
async def cancel_reservation_endpoint(
	reservation_id: int,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> Reservation:
	reservation = await get_reservation_or_404(reservation_id, session)
	try:
		return await cancel_reservation(session, reservation, user_id=current_user.id)
	except InvalidTransitionError as exc:
		raise service_error(exc) from exc


@router.post("/{reservation_id}/no-show", response_model=ReservationRead, dependencies=[operational_user])
async def no_show_reservation(
	reservation_id: int,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> Reservation:
	reservation = await get_reservation_or_404(reservation_id, session)
	try:
		return await mark_no_show(session, reservation, user_id=current_user.id, now=datetime.now(timezone.utc))
	except InvalidTransitionError as exc:
		raise service_error(exc) from exc