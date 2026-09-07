import json

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.room import Room, RoomStatus
from app.repositories.room import RoomRepository


class DuplicateRoomNumberError(Exception):
	pass


async def create_room(session: AsyncSession, **values: object) -> Room:
	repository = RoomRepository(session)
	room_number = str(values["room_number"])
	if await repository.get_by_number(room_number) is not None:
		raise DuplicateRoomNumberError("Room number is already in use")
	room_values = dict(values)
	room_values["status"] = RoomStatus(
		room_values.get("status", RoomStatus.AVAILABLE)
	).value
	room = Room(
		**room_values,
	)
	try:
		await repository.add(room)
		await session.commit()
	except IntegrityError as exc:
		await session.rollback()
		raise DuplicateRoomNumberError("Room number is already in use") from exc
	await session.refresh(room)
	return room


async def update_room(
	session: AsyncSession, room: Room, *, user_id: int | None = None, **values: object
) -> Room:
	old_status = room.status
	if "room_number" in values and values["room_number"] != room.room_number:
		if await RoomRepository(session).get_by_number(str(values["room_number"])) is not None:
			raise DuplicateRoomNumberError("Room number is already in use")
	for field, value in values.items():
		setattr(room, field, value)
	if user_id is not None and "status" in values and values["status"] != old_status:
		session.add(
			AuditLog(
				user_id=user_id,
				action="ROOM_STATUS_CHANGED",
				entity_type="Room",
				entity_id=room.id,
				details=json.dumps({"from": old_status, "to": values["status"]}),
			)
		)
	try:
		await session.commit()
	except IntegrityError as exc:
		await session.rollback()
		raise DuplicateRoomNumberError("Room number is already in use") from exc
	await session.refresh(room)
	return room


async def delete_room(session: AsyncSession, room: Room) -> None:
	await RoomRepository(session).delete(room)
	await session.commit()