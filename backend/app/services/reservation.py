import json
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.charge import ChargeType
from app.models.guest import Guest
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.reservation import Reservation, ReservationStatus
from app.models.room import Room, RoomStatus
from app.models.stay import Stay, StayStatus
from app.repositories.payment import PaymentRepository
from app.repositories.reservation import ReservationRepository
from app.repositories.room import RoomRepository
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
	property_id: int | None = None,
	user_id: int,
	action: str,
	entity_type: str,
	entity_id: int,
	details: dict[str, object] | None = None,
) -> None:
	session.add(
		AuditLog(
			property_id=property_id,
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
	expected_amount: Decimal,
	deposit_amount: Decimal = Decimal("0.00"),
	deposit_method: str | None = None,
	deposit_reference: str | None = None,
	reason: str | None,
	notes: str | None,
) -> Reservation:
	if expected_checkout <= expected_arrival:
		raise InvalidTransitionError("Expected checkout must be after expected arrival")
	_, room = await _get_guest_room(session, guest_id, room_id)
	room_repo = RoomRepository(session, property_id=room.property_id)
	await room_repo.release_expired_cleaning()
	await room_repo.release_overdue_expected_rooms()
	await session.refresh(room)
	if not room.is_active or room.status not in (RoomStatus.AVAILABLE.value, RoomStatus.CLEANING.value):
		raise ConflictError("Room is not available for reservation")
	repository = ReservationRepository(session, property_id=room.property_id)
	if await repository.has_conflict(
		room_id=room_id, arrival=expected_arrival, checkout=expected_checkout
	):
		raise ConflictError("Room has a conflicting reservation")
	dep_amount = deposit_amount or Decimal("0.00")
	deposit_paid_at = datetime.now(timezone.utc) if dep_amount > Decimal("0.00") else None
	reservation = Reservation(
		property_id=room.property_id,
		guest_id=guest_id,
		room_id=room_id,
		expected_arrival=expected_arrival,
		expected_checkout=expected_checkout,
		expected_amount=expected_amount,
		deposit_amount=dep_amount,
		deposit_method=deposit_method if dep_amount > Decimal("0.00") else None,
		deposit_reference=deposit_reference if dep_amount > Decimal("0.00") else None,
		deposit_paid_at=deposit_paid_at,
		reason=reason,
		notes=notes,
		status=ReservationStatus.RESERVED.value,
	)
	room.status = RoomStatus.EXPECTED.value
	room.available_after = None
	try:
		await repository.add(reservation)
		await session.flush()
		_audit(
			session,
			property_id=room.property_id,
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
	if "deposit_amount" in values:
		dep_val = values.get("deposit_amount")
		if dep_val and Decimal(str(dep_val)) > 0:
			if not reservation.deposit_paid_at:
				reservation.deposit_paid_at = datetime.now(timezone.utc)
		else:
			reservation.deposit_paid_at = None
			values["deposit_method"] = None
			values["deposit_reference"] = None
	for field, value in values.items():
		setattr(reservation, field, value)
	if new_room_id != old_room_id and old_room is not None:
		old_room.status = RoomStatus.AVAILABLE.value
	new_room.status = RoomStatus.EXPECTED.value
	await session.flush()
	_audit(session, property_id=reservation.property_id, user_id=user_id, action="RESERVATION_UPDATED", entity_type="Reservation", entity_id=reservation.id)
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
	_audit(session, property_id=reservation.property_id, user_id=user_id, action=action, entity_type="Reservation", entity_id=reservation.id)
	await session.commit()
	await session.refresh(reservation)
	return reservation


async def cancel_reservation(session: AsyncSession, reservation: Reservation, *, user_id: int) -> Reservation:
	return await _release_reservation(
		session, reservation, user_id=user_id, status=ReservationStatus.CANCELLED, action="RESERVATION_CANCELLED"
	)



async def mark_no_show(
	session: AsyncSession, reservation: Reservation, *, user_id: int, now: datetime
) -> Reservation:
	if now < reservation.expected_arrival:
		raise InvalidTransitionError("Reservation cannot be marked no-show before expected arrival")
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
	if room.status not in (RoomStatus.EXPECTED.value, RoomStatus.AVAILABLE.value):
		raise ConflictError("Room is already occupied or unavailable")
	stay = Stay(
		property_id=reservation.property_id,
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

		currency_symbol = "ETB"
		if reservation.expected_amount and reservation.expected_amount > 0:
			total_charge = Decimal(str(reservation.expected_amount))
			description = f"Room charge ({currency_symbol} {total_charge:,.2f})"
		else:
			stay_duration_days = (reservation.expected_checkout.date() - now.date()).days
			nights = max(1, stay_duration_days)
			total_charge = Decimal(nights) * Decimal(str(room.price))
			description = f"Room charge ({nights} night{'s' if nights > 1 else ''} @ {currency_symbol} {room.price:,.2f})"

		await add_charge_record(
			session,
			stay_id=stay.id,
			charge_type=ChargeType.ROOM,
			description=description,
			amount=total_charge,
			created_by=user_id,
		)
		if reservation.deposit_amount and reservation.deposit_amount > Decimal("0.00"):
			dep_method = reservation.deposit_method or PaymentMethod.CASH.value
			deposit_payment = Payment(
				property_id=stay.property_id,
				stay_id=stay.id,
				amount=reservation.deposit_amount,
				payment_method=dep_method,
				status=PaymentStatus.SUCCESS.value,
				reference=reservation.deposit_reference or f"Advance deposit (Reservation #{reservation.id})",
				paid_at=reservation.deposit_paid_at or now,
				created_by=user_id,
			)
			await PaymentRepository(session).add(deposit_payment)
			_audit(
				session,
				property_id=stay.property_id,
				user_id=user_id,
				action="PAYMENT_CREATED",
				entity_type="Payment",
				entity_id=deposit_payment.id,
				details={"deposit_from_reservation": reservation.id, "amount": str(reservation.deposit_amount)},
			)
		_audit(session, property_id=reservation.property_id, user_id=user_id, action="CHECK_IN", entity_type="Stay", entity_id=stay.id)
		await session.commit()
	except IntegrityError as exc:
		await session.rollback()
		raise ConflictError("Could not check in reservation") from exc
	await session.refresh(stay)
	await session.refresh(reservation)
	return stay


async def delete_reservation(
	session: AsyncSession,
	reservation: Reservation,
	*,
	user_id: int,
) -> None:
	"""Permanently delete a reservation and clean up all related data."""
	from sqlalchemy import select, delete as sql_delete
	from app.models.stay import Stay
	from app.models.charge import Charge
	from app.models.payment import Payment

	# 1. Free the room if it was being held for this reservation
	room = await session.get(Room, reservation.room_id)
	if room is not None and room.status in (RoomStatus.EXPECTED.value, RoomStatus.OCCUPIED.value):
		# Only revert if this reservation is the one that set the status
		if reservation.status in (ReservationStatus.RESERVED.value, ReservationStatus.CHECKED_IN.value):
			room.status = RoomStatus.AVAILABLE.value

	# 2. Delete payments linked to stays of this reservation
	stays_result = await session.execute(
		select(Stay).where(Stay.reservation_id == reservation.id)
	)
	stays = stays_result.scalars().all()

	for stay in stays:
		# Delete payments for each stay
		await session.execute(
			sql_delete(Payment).where(Payment.stay_id == stay.id)
		)
		# Delete charges for each stay
		await session.execute(
			sql_delete(Charge).where(Charge.stay_id == stay.id)
		)

	# 3. Delete stays
	await session.execute(
		sql_delete(Stay).where(Stay.reservation_id == reservation.id)
	)

	# 4. Delete the reservation itself
	_audit(session, user_id=user_id, action="RESERVATION_DELETED", entity_type="Reservation", entity_id=reservation.id)
	await session.delete(reservation)
	await session.commit()
