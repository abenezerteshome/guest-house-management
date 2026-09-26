from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reservation import Reservation, ReservationStatus


ACTIVE_RESERVATION_STATUSES = (ReservationStatus.RESERVED.value, ReservationStatus.CHECKED_IN.value)


class ReservationRepository:
	def __init__(self, session: AsyncSession, property_id: int | None = None) -> None:
		self.session = session
		self.property_id = property_id

	async def get_by_id(self, reservation_id: int) -> Reservation | None:
		res = await self.session.get(Reservation, reservation_id)
		if res and self.property_id is not None and res.property_id != self.property_id:
			return None
		return res

	async def list(
		self,
		*,
		status: str | None = None,
		room_id: int | None = None,
		guest_id: int | None = None,
		from_date: datetime | None = None,
		to_date: datetime | None = None,
	) -> list[Reservation]:
		query = select(Reservation).order_by(Reservation.expected_arrival, Reservation.id)
		if self.property_id is not None:
			query = query.where(Reservation.property_id == self.property_id)
		if status is not None:
			query = query.where(Reservation.status == status)
		if room_id is not None:
			query = query.where(Reservation.room_id == room_id)
		if guest_id is not None:
			query = query.where(Reservation.guest_id == guest_id)
		if from_date is not None:
			query = query.where(Reservation.expected_checkout >= from_date)
		if to_date is not None:
			query = query.where(Reservation.expected_arrival <= to_date)
		result = await self.session.execute(query)
		return list(result.scalars().all())

	async def has_conflict(
		self,
		*,
		room_id: int,
		arrival: datetime,
		checkout: datetime,
		exclude_id: int | None = None,
	) -> bool:
		query = select(Reservation.id).where(
			and_(
				Reservation.room_id == room_id,
				Reservation.status.in_(ACTIVE_RESERVATION_STATUSES),
				Reservation.expected_arrival < checkout,
				Reservation.expected_checkout > arrival,
			)
		)
		if self.property_id is not None:
			query = query.where(Reservation.property_id == self.property_id)
		if exclude_id is not None:
			query = query.where(Reservation.id != exclude_id)
		return (await self.session.execute(query)).scalar_one_or_none() is not None

	async def add(self, reservation: Reservation) -> Reservation:
		if self.property_id is not None and not reservation.property_id:
			reservation.property_id = self.property_id
		self.session.add(reservation)
		await self.session.flush()
		return reservation
