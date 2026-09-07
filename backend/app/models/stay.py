from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StayStatus(StrEnum):
	CHECKED_IN = "CHECKED_IN"
	CHECKED_OUT = "CHECKED_OUT"


class Stay(Base):
	__tablename__ = "stays"
	__table_args__ = (
		CheckConstraint("status IN ('CHECKED_IN', 'CHECKED_OUT')", name="ck_stays_status"),
	)

	id: Mapped[int] = mapped_column(primary_key=True)
	reservation_id: Mapped[int] = mapped_column(
		ForeignKey("reservations.id"), nullable=False, unique=True, index=True
	)
	guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False, index=True)
	room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False, index=True)
	check_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
	expected_checkout: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
	actual_checkout_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	status: Mapped[str] = mapped_column(
		String(20), nullable=False, default=StayStatus.CHECKED_IN.value, index=True
	)
	notes: Mapped[str | None] = mapped_column(Text, nullable=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now()
	)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
	)
