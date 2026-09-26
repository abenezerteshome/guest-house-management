from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Property(Base):
	__tablename__ = "properties"
	__table_args__ = (
		CheckConstraint("length(trim(name)) > 0", name="ck_properties_name_not_empty"),
		CheckConstraint("length(trim(code)) > 0", name="ck_properties_code_not_empty"),
		CheckConstraint("checkout_deadline_hour >= 0 AND checkout_deadline_hour <= 23", name="ck_properties_deadline_hour"),
		CheckConstraint("checkout_deadline_minute >= 0 AND checkout_deadline_minute <= 59", name="ck_properties_deadline_minute"),
		CheckConstraint("late_checkout_penalty >= 0", name="ck_properties_late_penalty_nonnegative"),
	)

	id: Mapped[int] = mapped_column(primary_key=True)
	name: Mapped[str] = mapped_column(String(200), nullable=False)
	code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
	contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
	contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
	address: Mapped[str | None] = mapped_column(String(300), nullable=True)
	currency: Mapped[str] = mapped_column(String(10), nullable=False, default="ETB")
	checkout_deadline_hour: Mapped[int] = mapped_column(nullable=False, default=4)
	checkout_deadline_minute: Mapped[int] = mapped_column(nullable=False, default=0)
	late_checkout_penalty: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("600.00"))
	is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
	notes: Mapped[str | None] = mapped_column(Text, nullable=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now()
	)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
	)
