from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stay import Stay


class StayRepository:
	def __init__(self, session: AsyncSession) -> None:
		self.session = session

	async def get_by_id(self, stay_id: int) -> Stay | None:
		return await self.session.get(Stay, stay_id)

	async def list(self, *, status: str | None = None) -> list[Stay]:
		query = select(Stay).order_by(Stay.check_in_at, Stay.id)
		if status is not None:
			query = query.where(Stay.status == status)
		result = await self.session.execute(query)
		return list(result.scalars().all())

	async def add(self, stay: Stay) -> Stay:
		self.session.add(stay)
		await self.session.flush()
		return stay
