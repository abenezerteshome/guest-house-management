from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.guest import Guest


class GuestRepository:
	def __init__(self, session: AsyncSession, property_id: int | None = None) -> None:
		self.session = session
		self.property_id = property_id

	async def get_by_id(self, guest_id: int) -> Guest | None:
		guest = await self.session.get(Guest, guest_id)
		if guest and self.property_id is not None and guest.property_id != self.property_id:
			return None
		return guest

	async def list(self, *, search: str | None = None) -> list[Guest]:
		query = select(Guest).order_by(Guest.id.asc())
		if self.property_id is not None:
			query = query.where(Guest.property_id == self.property_id)
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
		if self.property_id is not None and not guest.property_id:
			guest.property_id = self.property_id
		self.session.add(guest)
		await self.session.flush()
		return guest

	async def delete(self, guest: Guest) -> None:
		await self.session.delete(guest)