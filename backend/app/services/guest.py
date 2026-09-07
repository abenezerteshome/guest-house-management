from sqlalchemy.ext.asyncio import AsyncSession

from app.models.guest import Guest
from app.repositories.guest import GuestRepository


async def create_guest(session: AsyncSession, **values: object) -> Guest:
	guest = Guest(**values)
	await GuestRepository(session).add(guest)
	await session.commit()
	await session.refresh(guest)
	return guest


async def update_guest(session: AsyncSession, guest: Guest, **values: object) -> Guest:
	for field, value in values.items():
		setattr(guest, field, value)
	await session.commit()
	await session.refresh(guest)
	return guest


async def delete_guest(session: AsyncSession, guest: Guest) -> None:
	await GuestRepository(session).delete(guest)
	await session.commit()