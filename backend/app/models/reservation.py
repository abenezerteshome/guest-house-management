from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReservationStatus(StrEnum):
	RESERVED = "RESERVED"
	CHECKED_IN = "CHECKED_IN"
	CHECKED_OUT = "CHECKED_OUT"
	CANCELLED = "CANCELLED"
	NO_SHOW = "NO_SHOW"


class Reservation(Base):
	__tablename__ = "reservations"
	__table_args__ = (
		CheckConstraint(
			"status IN ('RESERVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW')",
			name="ck_reservations_status",
		),
		CheckConstraint("expected_checkout > expected_arrival", name="ck_reservations_dates"),
	)

	id: Mapped[int] = mapped_column(primary_key=True)
	guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False, index=True)
	room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False, index=True)
	status: Mapped[str] = mapped_column(
		String(20), nullable=False, default=ReservationStatus.RESERVED.value, index=True
	)
	expected_arrival: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
	expected_checkout: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
	expected_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, server_default="0.00")
	reason: Mapped[str | None] = mapped_column(Text, nullable=True)
	notes: Mapped[str | None] = mapped_column(Text, nullable=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now()
	)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
	)
