from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stay import Stay


class StayRepository:
	def __init__(self, session: AsyncSession, property_id: int | None = None) -> None:
		self.session = session
		self.property_id = property_id

	async def get_by_id(self, stay_id: int) -> Stay | None:
		stay = await self.session.get(Stay, stay_id)
		if stay and self.property_id is not None and stay.property_id != self.property_id:
			return None
		return stay

	async def list(self, *, status: str | None = None) -> list[Stay]:
		query = select(Stay).order_by(Stay.check_in_at, Stay.id)
		if self.property_id is not None:
			query = query.where(Stay.property_id == self.property_id)
		if status is not None:
			query = query.where(Stay.status == status)
		result = await self.session.execute(query)
		return list(result.scalars().all())

	async def add(self, stay: Stay) -> Stay:
		if self.property_id is not None and not stay.property_id:
			stay.property_id = self.property_id
		self.session.add(stay)
		await self.session.flush()
		return stay
