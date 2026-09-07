from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PaymentMethod(StrEnum):
	CASH = "CASH"
	TELEBIRR = "TELEBIRR"
	CBE_BIRR = "CBE_BIRR"
	BANK_TRANSFER = "BANK_TRANSFER"
	CREDIT = "CREDIT"


class PaymentStatus(StrEnum):
	SUCCESS = "SUCCESS"
	CANCELLED = "CANCELLED"
	REVERSED = "REVERSED"
	REFUNDED = "REFUNDED"


class Payment(Base):
	__tablename__ = "payments"
	__table_args__ = (
		CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
		CheckConstraint(
			"payment_method IN ('CASH', 'TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'CREDIT')",
			name="ck_payments_method",
		),
		CheckConstraint(
			"status IN ('SUCCESS', 'CANCELLED', 'REVERSED', 'REFUNDED')",
			name="ck_payments_status",
		),
	)

	id: Mapped[int] = mapped_column(primary_key=True)
	stay_id: Mapped[int] = mapped_column(ForeignKey("stays.id"), nullable=False, index=True)
	amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
	payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
	status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
	reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
	paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
	)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
	)