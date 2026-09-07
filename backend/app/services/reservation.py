import json
from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.charge import ChargeType
from app.models.guest import Guest
from app.models.reservation import Reservation, ReservationStatus
from app.models.room import Room, RoomStatus
from app.models.stay import Stay, StayStatus
from app.repositories.reservation import ReservationRepository
from app.repositories.stay import StayRepository


class ReservationServiceError(Exception):
	pass


class ResourceNotFoundError(ReservationServiceError):
	pass


class ConflictError(ReservationServiceError):
	pass


class InvalidTransitionError(ReservationServiceError):
	pass


def _audit(
	session: AsyncSession,
	*,
	user_id: int,
	action: str,
	entity_type: str,
	entity_id: int,
	details: dict[str, object] | None = None,
) -> None:
	session.add(
		AuditLog(
			user_id=user_id,
			action=action,
			entity_type=entity_type,
			entity_id=entity_id,
			details=json.dumps(details or {}),
		)
	)


async def _get_guest_room(
	session: AsyncSession, guest_id: int, room_id: int
) -> tuple[Guest, Room]:
	guest = await session.get(Guest, guest_id)
	if guest is None:
		raise ResourceNotFoundError("Guest not found")
	room = await session.get(Room, room_id)
	if room is None:
		raise ResourceNotFoundError("Room not found")
	return guest, room


async def create_reservation(
	session: AsyncSession,
	*,
	user_id: int,
	guest_id: int,
	room_id: int,
	expected_arrival: datetime,
	expected_checkout: datetime,
	notes: str | None,
) -> Reservation:
	if expected_checkout <= expected_arrival:
		raise InvalidTransitionError("Expected checkout must be after expected arrival")
	_, room = await _get_guest_room(session, guest_id, room_id)
	if not room.is_active or room.status != RoomStatus.AVAILABLE.value:
		raise ConflictError("Room is not available for reservation")
	repository = ReservationRepository(session)
	if await repository.has_conflict(
		room_id=room_id, arrival=expected_arrival, checkout=expected_checkout
	):
		raise ConflictError("Room has a conflicting reservation")
	reservation = Reservation(
		guest_id=guest_id,
		room_id=room_id,
		expected_arrival=expected_arrival,
		expected_checkout=expected_checkout,
		notes=notes,
		status=ReservationStatus.RESERVED.value,
	)
	room.status = RoomStatus.EXPECTED.value
	try:
		await repository.add(reservation)
		await session.flush()
		_audit(
			session,
			user_id=user_id,
			action="RESERVATION_CREATED",
			entity_type="Reservation",
			entity_id=reservation.id,
		)
		await session.commit()
	except IntegrityError as exc:
		await session.rollback()
		raise ConflictError("Could not create reservation") from exc
	await session.refresh(reservation)
	return reservation


async def update_reservation(
	session: AsyncSession, reservation: Reservation, *, user_id: int, values: dict[str, object]
) -> Reservation:
	if reservation.status != ReservationStatus.RESERVED.value:
		raise InvalidTransitionError("Only RESERVED reservations can be updated")
	new_guest_id = int(values.get("guest_id", reservation.guest_id))
	new_room_id = int(values.get("room_id", reservation.room_id))
	old_room_id = reservation.room_id
	arrival = values.get("expected_arrival", reservation.expected_arrival)
	checkout = values.get("expected_checkout", reservation.expected_checkout)
	if not isinstance(arrival, datetime) or not isinstance(checkout, datetime) or checkout <= arrival:
		raise InvalidTransitionError("Expected checkout must be after expected arrival")
	_, new_room = await _get_guest_room(session, new_guest_id, new_room_id)
	if not new_room.is_active or new_room.status not in (
		RoomStatus.AVAILABLE.value,
		RoomStatus.EXPECTED.value,
	) or await ReservationRepository(session).has_conflict(
		room_id=new_room_id,
		arrival=arrival,
		checkout=checkout,
		exclude_id=reservation.id,
	):
		raise ConflictError("Room has a conflicting reservation or is unavailable")
	old_room = await session.get(Room, reservation.room_id)
	for field, value in values.items():
		setattr(reservation, field, value)
	if new_room_id != old_room_id and old_room is not None:
		old_room.status = RoomStatus.AVAILABLE.value
	new_room.status = RoomStatus.EXPECTED.value
	await session.flush()
	_audit(session, user_id=user_id, action="RESERVATION_UPDATED", entity_type="Reservation", entity_id=reservation.id)
	await session.commit()
	await session.refresh(reservation)
	return reservation


async def _release_reservation(
	session: AsyncSession, reservation: Reservation, *, user_id: int, status: ReservationStatus, action: str
) -> Reservation:
	if reservation.status != ReservationStatus.RESERVED.value:
		raise InvalidTransitionError(f"Only RESERVED reservations can become {status.value}")
	room = await session.get(Room, reservation.room_id)
	reservation.status = status.value
	if room is not None and room.status == RoomStatus.EXPECTED.value:
		room.status = RoomStatus.AVAILABLE.value
	_audit(session, user_id=user_id, action=action, entity_type="Reservation", entity_id=reservation.id)
	await session.commit()
	await session.refresh(reservation)
	return reservation


async def cancel_reservation(session: AsyncSession, reservation: Reservation, *, user_id: int) -> Reservation:
	return await _release_reservation(
		session, reservation, user_id=user_id, status=ReservationStatus.CANCELLED, action="RESERVATION_CANCELLED"
	)


async def mark_no_show(session: AsyncSession, reservation: Reservation, *, user_id: int) -> Reservation:
	return await _release_reservation(
		session, reservation, user_id=user_id, status=ReservationStatus.NO_SHOW, action="RESERVATION_NO_SHOW"
	)


async def check_in(
	session: AsyncSession, reservation: Reservation, *, user_id: int, now: datetime
) -> Stay:
	if reservation.status != ReservationStatus.RESERVED.value:
		raise InvalidTransitionError("Only RESERVED reservations can be checked in")
	room = await session.get(Room, reservation.room_id)
	guest = await session.get(Guest, reservation.guest_id)
	if guest is None:
		raise ResourceNotFoundError("Guest not found")
	if room is None:
		raise ResourceNotFoundError("Room not found")
	if room.status != RoomStatus.EXPECTED.value:
		raise ConflictError("Room is not in EXPECTED status")
	stay = Stay(
		reservation_id=reservation.id,
		guest_id=reservation.guest_id,
		room_id=reservation.room_id,
		check_in_at=now,
		expected_checkout=reservation.expected_checkout,
		status=StayStatus.CHECKED_IN.value,
	)
	reservation.status = ReservationStatus.CHECKED_IN.value
	room.status = RoomStatus.OCCUPIED.value
	try:
		await StayRepository(session).add(stay)
		await session.flush()
		from app.services.payment import add_charge_record

		await add_charge_record(
			session,
			stay_id=stay.id,
			charge_type=ChargeType.ROOM,
			description="Initial room charge",
			amount=room.price,
			created_by=user_id,
		)
		_audit(session, user_id=user_id, action="CHECK_IN", entity_type="Stay", entity_id=stay.id)
		await session.commit()
	except IntegrityError as exc:
		await session.rollback()
		raise ConflictError("Could not check in reservation") from exc
	await session.refresh(stay)
	await session.refresh(reservation)
	return stay
