from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.guest import Guest
from app.repositories.guest import GuestRepository


async def create_guest(session: AsyncSession, *, user_id: int, **values: object) -> Guest:
	guest = Guest(**values)
	await GuestRepository(session).add(guest)
	await session.flush()
	session.add(AuditLog(user_id=user_id, action="GUEST_CREATED", entity_type="Guest", entity_id=guest.id))
	await session.commit()
	await session.refresh(guest)
	return guest


async def update_guest(session: AsyncSession, guest: Guest, *, user_id: int, **values: object) -> Guest:
	for field, value in values.items():
		setattr(guest, field, value)
	session.add(AuditLog(user_id=user_id, action="GUEST_UPDATED", entity_type="Guest", entity_id=guest.id))
	await session.commit()
	await session.refresh(guest)
	return guest


async def delete_guest(session: AsyncSession, guest: Guest, *, user_id: int) -> None:
	session.add(AuditLog(user_id=user_id, action="GUEST_DELETED", entity_type="Guest", entity_id=guest.id))
	await GuestRepository(session).delete(guest)
	await session.commit()