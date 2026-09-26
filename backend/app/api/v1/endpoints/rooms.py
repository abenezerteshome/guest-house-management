from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_admin, require_role
from app.db.session import get_db
from app.models.room import Room, RoomStatus
from app.models.user import User, UserRole
from app.repositories.room import RoomRepository
from app.schemas.room import RoomCreate, RoomRead, RoomStatusUpdate, RoomUpdate
from app.services.room import DuplicateRoomNumberError, create_room, delete_room, update_room


router = APIRouter(prefix="/rooms", tags=["rooms"])


async def get_room_or_404(room_id: int, current_user: User, session: AsyncSession) -> Room:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	room = await RoomRepository(session, property_id=prop_id).get_by_id(room_id)
	if room is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
	return room


@router.get("", response_model=list[RoomRead])
async def list_rooms(
	room_status: RoomStatus | None = Query(default=None, alias="status"),
	is_active: bool | None = None,
	current_user: User = Depends(get_current_user),
	session: AsyncSession = Depends(get_db),
) -> list[Room]:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	repo = RoomRepository(session, property_id=prop_id)
	await repo.release_expired_cleaning()
	return await repo.list(
		status=room_status.value if room_status is not None else None,
		is_active=is_active,
	)


@router.post("", response_model=RoomRead, status_code=status.HTTP_201_CREATED)
async def create_room_endpoint(
	payload: RoomCreate,
	current_user: User = Depends(require_admin),
	session: AsyncSession = Depends(get_db),
) -> Room:
	prop_id = current_user.property_id
	try:
		return await create_room(session, property_id=prop_id, **payload.model_dump())
	except DuplicateRoomNumberError as exc:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/{room_id}", response_model=RoomRead)
async def get_room(
	room_id: int,
	current_user: User = Depends(get_current_user),
	session: AsyncSession = Depends(get_db),
) -> Room:
	return await get_room_or_404(room_id, current_user, session)


@router.patch("/{room_id}", response_model=RoomRead)
async def patch_room(
	room_id: int,
	payload: RoomUpdate,
	current_user: User = Depends(require_admin),
	session: AsyncSession = Depends(get_db),
) -> Room:
	room = await get_room_or_404(room_id, current_user, session)
	try:
		return await update_room(session, room, **payload.model_dump(exclude_unset=True))
	except DuplicateRoomNumberError as exc:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.patch("/{room_id}/status", response_model=RoomRead)
async def patch_room_status(
	room_id: int,
	payload: RoomStatusUpdate,
	current_user: User = Depends(require_admin),
	session: AsyncSession = Depends(get_db),
) -> Room:
	room = await get_room_or_404(room_id, current_user, session)
	return await update_room(session, room, user_id=current_user.id, status=payload.status.value)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_room(
	room_id: int,
	current_user: User = Depends(require_admin),
	session: AsyncSession = Depends(get_db),
) -> None:
	room = await get_room_or_404(room_id, current_user, session)
	await delete_room(session, room)