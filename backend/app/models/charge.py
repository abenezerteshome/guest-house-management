from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ChargeType(StrEnum):
	ROOM = "ROOM"
	LATE_CHECKOUT_PENALTY = "LATE_CHECKOUT_PENALTY"
	OTHER = "OTHER"


class Charge(Base):
	__tablename__ = "charges"
	__table_args__ = (
		CheckConstraint("amount > 0", name="ck_charges_amount_positive"),
		CheckConstraint("quantity > 0", name="ck_charges_quantity_positive"),
		CheckConstraint(
			"charge_type IN ('ROOM', 'LATE_CHECKOUT_PENALTY', 'OTHER')",
			name="ck_charges_type",
		),
	)

	id: Mapped[int] = mapped_column(primary_key=True)
	stay_id: Mapped[int] = mapped_column(ForeignKey("stays.id"), nullable=False, index=True)
	charge_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
	amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
	quantity: Mapped[int] = mapped_column(nullable=False, default=1)
	charged_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
	)
	created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now()
	)
	description: Mapped[str] = mapped_column(Text, nullable=False)