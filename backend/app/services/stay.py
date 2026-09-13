from datetime import datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.audit_log import AuditLog
from app.models.charge import Charge, ChargeType
from app.models.reservation import Reservation, ReservationStatus
from app.models.room import Room, RoomStatus
from app.models.stay import Stay, StayStatus
from app.repositories.stay import StayRepository
from app.services.reservation import InvalidTransitionError, ResourceNotFoundError


def is_late_checkout(actual_checkout_at: datetime) -> bool:
	settings = get_settings()
	deadline = datetime.combine(
		actual_checkout_at.date(),
		time(settings.checkout_deadline_hour, settings.checkout_deadline_minute),
		tzinfo=actual_checkout_at.tzinfo,
	)
	return actual_checkout_at > deadline


async def check_out(
	session: AsyncSession,
	stay: Stay,
	*,
	user_id: int,
	now: datetime,
	penalty_amount: Decimal | None = None,
	actual_checkout_at: datetime | None = None,
) -> Stay:
	if stay.status != StayStatus.CHECKED_IN.value:
		raise InvalidTransitionError("Only CHECKED_IN stays can be checked out")
	reservation = await session.get(Reservation, stay.reservation_id)
	room = await session.get(Room, stay.room_id)
	if reservation is None:
		raise ResourceNotFoundError("Reservation not found")
	if room is None:
		raise ResourceNotFoundError("Room not found")
	checkout_at = actual_checkout_at or now
	if checkout_at.tzinfo is None:
		checkout_at = checkout_at.replace(tzinfo=timezone.utc)
	if checkout_at <= stay.check_in_at:
		raise InvalidTransitionError("Checkout time must be after check-in time")
	if checkout_at > now:
		raise InvalidTransitionError("Checkout time cannot be in the future")

	if actual_checkout_at and checkout_at.date() < stay.expected_checkout.date():
		room_charges = list(
			(await session.execute(
				select(Charge).where(
					Charge.stay_id == stay.id,
					Charge.charge_type == ChargeType.ROOM.value,
					~Charge.description.ilike("%extension%"),
				)
			)).scalars().all())
		if room_charges:
			original_nights = max(1, (stay.expected_checkout.date() - stay.check_in_at.date()).days)
			used_nights = max(1, (checkout_at.date() - stay.check_in_at.date()).days)
			used_nights = min(used_nights, original_nights)
			for charge in room_charges:
				charge.amount = (charge.amount * Decimal(used_nights) / Decimal(original_nights)).quantize(Decimal("0.01"))

	stay.status = StayStatus.CHECKED_OUT.value
	stay.actual_checkout_at = checkout_at
	reservation.status = ReservationStatus.CHECKED_OUT.value
	room.status = RoomStatus.CLEANING.value
	room.available_after = checkout_at + timedelta(hours=1)
	if penalty_amount is not None:
		if penalty_amount > 0:
			from app.services.payment import add_charge_record

			await add_charge_record(
				session,
				stay_id=stay.id,
				charge_type=ChargeType.LATE_CHECKOUT_PENALTY,
				description="Late checkout penalty",
				amount=penalty_amount,
				created_by=user_id,
			)
	elif is_late_checkout(now):
		from app.services.payment import add_charge_record

		await add_charge_record(
			session,
			stay_id=stay.id,
			charge_type=ChargeType.LATE_CHECKOUT_PENALTY,
			description="Late checkout penalty",
			amount=get_settings().late_checkout_penalty,
			created_by=user_id,
		)
	session.add(
		AuditLog(
			user_id=user_id,
			action="CHECK_OUT",
			entity_type="Stay",
			entity_id=stay.id,
			details=f'{{"is_late_checkout": {str(is_late_checkout(checkout_at)).lower()}}}',
		)
	)
	await session.commit()
	await session.refresh(stay)
	return stay


async def extend_stay(
	session: AsyncSession, stay: Stay, *, user_id: int, new_expected_checkout: datetime
) -> Stay:
	if stay.status != StayStatus.CHECKED_IN.value:
		raise InvalidTransitionError("Only CHECKED_IN stays can be extended")
	if new_expected_checkout <= stay.expected_checkout:
		raise InvalidTransitionError("New checkout must be later than current expected checkout")
	old_checkout = stay.expected_checkout
	stay.expected_checkout = new_expected_checkout
	room = await session.get(Room, stay.room_id)
	if room is None:
		raise ResourceNotFoundError("Room not found")
	from app.services.payment import add_charge_record

	extension_days = max(1, (new_expected_checkout.date() - old_checkout.date()).days)
	extension_charge = Decimal(extension_days) * Decimal(str(room.price))

	await add_charge_record(
		session,
		stay_id=stay.id,
		charge_type=ChargeType.ROOM,
		description=f"Stay extension ({extension_days} night{'s' if extension_days > 1 else ''} @ ETB {room.price:,.2f})",
		amount=extension_charge,
		created_by=user_id,
	)
	session.add(
		AuditLog(
			user_id=user_id,
			action="STAY_EXTENDED",
			entity_type="Stay",
			entity_id=stay.id,
		)
	)
	await session.commit()
	await session.refresh(stay)
	return stay


async def get_stay(session: AsyncSession, stay_id: int) -> Stay:
	stay = await StayRepository(session).get_by_id(stay_id)
	if stay is None:
		raise ResourceNotFoundError("Stay not found")
	return stay
