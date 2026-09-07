from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.guest import Guest


class GuestRepository:
	def __init__(self, session: AsyncSession) -> None:
		self.session = session

	async def get_by_id(self, guest_id: int) -> Guest | None:
		return await self.session.get(Guest, guest_id)

	async def list(self, *, search: str | None = None) -> list[Guest]:
		query = select(Guest).order_by(Guest.full_name, Guest.id)
		if search:
			pattern = f"%{search}%"
			query = query.where(
				or_(
					Guest.full_name.ilike(pattern),
					Guest.id_number.ilike(pattern),
					Guest.phone.ilike(pattern),
				)
			)
		result = await self.session.execute(query)
		return list(result.scalars().all())

	async def add(self, guest: Guest) -> Guest:
		self.session.add(guest)
		await self.session.flush()
		return guest

	async def delete(self, guest: Guest) -> None:
		await self.session.delete(guest)