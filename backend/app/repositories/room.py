from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.room import Room, RoomStatus


class RoomRepository:
	def __init__(self, session: AsyncSession, property_id: int | None = None) -> None:
		self.session = session
		self.property_id = property_id

	async def get_by_id(self, room_id: int) -> Room | None:
		room = await self.session.get(Room, room_id)
		if room and self.property_id is not None and room.property_id != self.property_id:
			return None
		return room

	async def get_by_number(self, room_number: str) -> Room | None:
		query = select(Room).where(Room.room_number == room_number)
		if self.property_id is not None:
			query = query.where(Room.property_id == self.property_id)
		result = await self.session.execute(query)
		return result.scalar_one_or_none()

	async def list(self, *, status: str | None = None, is_active: bool | None = None) -> list[Room]:
		query = select(Room)
		if self.property_id is not None:
			query = query.where(Room.property_id == self.property_id)
		if status is not None:
			query = query.where(Room.status == status)
		if is_active is not None:
			query = query.where(Room.is_active == is_active)
		result = await self.session.execute(query)
		rooms = list(result.scalars().all())

		import re
		def room_sort_key(r: Room) -> tuple[int, str]:
			m = re.search(r'\d+', r.room_number or '')
			num = int(m.group(0)) if m else 999999
			return (num, r.room_number or '')

		rooms.sort(key=room_sort_key)
		return rooms

	async def add(self, room: Room) -> Room:
		if self.property_id is not None and not room.property_id:
			room.property_id = self.property_id
		self.session.add(room)
		await self.session.flush()
		return room

	async def delete(self, room: Room) -> None:
		await self.session.delete(room)

	async def release_expired_cleaning(self) -> int:
		"""Transition rooms from CLEANING → AVAILABLE when available_after has passed."""
		now = datetime.now(timezone.utc)
		stmt = (
			update(Room)
			.where(Room.status == RoomStatus.CLEANING.value)
			.where(Room.available_after <= now)
			.values(status=RoomStatus.AVAILABLE.value, available_after=None)
		)
		if self.property_id is not None:
			stmt = stmt.where(Room.property_id == self.property_id)
		result = await self.session.execute(stmt)
		await self.session.commit()
		return result.rowcount