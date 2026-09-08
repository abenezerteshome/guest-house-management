from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Boolean, CheckConstraint, DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RoomStatus(StrEnum):
	AVAILABLE = "AVAILABLE"
	OCCUPIED = "OCCUPIED"
	EXPECTED = "EXPECTED"
	CLEANING = "CLEANING"
	MAINTENANCE = "MAINTENANCE"


class Room(Base):
	__tablename__ = "rooms"
	__table_args__ = (
		CheckConstraint("length(trim(room_number)) > 0", name="ck_rooms_room_number_not_empty"),
		CheckConstraint("length(trim(room_type)) > 0", name="ck_rooms_room_type_not_empty"),
		CheckConstraint("price >= 0", name="ck_rooms_price_nonnegative"),
		CheckConstraint(
			"status IN ('AVAILABLE', 'OCCUPIED', 'EXPECTED', 'CLEANING', 'MAINTENANCE')",
			name="ck_rooms_status",
		),
	)

	id: Mapped[int] = mapped_column(primary_key=True)
	room_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
	room_type: Mapped[str] = mapped_column(String(100), nullable=False)
	price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
	hourly_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True, default=None)
	status: Mapped[str] = mapped_column(String(20), nullable=False, default=RoomStatus.AVAILABLE.value)
	is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now()
	)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
	)