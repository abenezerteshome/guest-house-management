from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.guest import Guest
from app.repositories.guest import GuestRepository


async def create_guest(session: AsyncSession, *, user_id: int, property_id: int | None = None, **values: object) -> Guest:
	val = dict(values)
	if property_id is not None:
		val["property_id"] = property_id
	guest = Guest(**val)
	await GuestRepository(session, property_id=property_id).add(guest)
	await session.flush()
	session.add(AuditLog(property_id=property_id, user_id=user_id, action="GUEST_CREATED", entity_type="Guest", entity_id=guest.id))
	await session.commit()
	await session.refresh(guest)
	return guest


async def update_guest(session: AsyncSession, guest: Guest, *, user_id: int, **values: object) -> Guest:
	for field, value in values.items():
		setattr(guest, field, value)
	session.add(AuditLog(property_id=guest.property_id, user_id=user_id, action="GUEST_UPDATED", entity_type="Guest", entity_id=guest.id))
	await session.commit()
	await session.refresh(guest)
	return guest


async def delete_guest(session: AsyncSession, guest: Guest, *, user_id: int) -> None:
	session.add(AuditLog(property_id=guest.property_id, user_id=user_id, action="GUEST_DELETED", entity_type="Guest", entity_id=guest.id))
	await GuestRepository(session, property_id=guest.property_id).delete(guest)
	await session.commit()