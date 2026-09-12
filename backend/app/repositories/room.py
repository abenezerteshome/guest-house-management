from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.room import Room, RoomStatus


class RoomRepository:
	def __init__(self, session: AsyncSession) -> None:
		self.session = session

	async def get_by_id(self, room_id: int) -> Room | None:
		return await self.session.get(Room, room_id)

	async def get_by_number(self, room_number: str) -> Room | None:
		result = await self.session.execute(select(Room).where(Room.room_number == room_number))
		return result.scalar_one_or_none()

	async def list(self, *, status: str | None = None, is_active: bool | None = None) -> list[Room]:
		query = select(Room).order_by(Room.room_number)
		if status is not None:
			query = query.where(Room.status == status)
		if is_active is not None:
			query = query.where(Room.is_active == is_active)
		result = await self.session.execute(query)
		return list(result.scalars().all())

	async def add(self, room: Room) -> Room:
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
		result = await self.session.execute(stmt)
		await self.session.commit()
		return result.rowcount