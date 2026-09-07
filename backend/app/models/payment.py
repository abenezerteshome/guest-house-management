from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, JSON, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PaymentMethod(StrEnum):
	CASH = "CASH"
	TELEBIRR = "TELEBIRR"
	CBE_BIRR = "CBE_BIRR"
	BANK_TRANSFER = "BANK_TRANSFER"
	CHAPA = "CHAPA"


class PaymentStatus(StrEnum):
	PENDING = "PENDING"
	SUCCESS = "SUCCESS"
	FAILED = "FAILED"
	CANCELLED = "CANCELLED"
	REVERSED = "REVERSED"
	REFUNDED = "REFUNDED"


class PaymentProvider(StrEnum):
	MANUAL = "MANUAL"
	CHAPA = "CHAPA"


class Payment(Base):
	__tablename__ = "payments"
	__table_args__ = (
		CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
		CheckConstraint(
			"payment_method IN ('CASH', 'TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'CHAPA')",
			name="ck_payments_method",
		),
		CheckConstraint(
			"status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REVERSED', 'REFUNDED')",
			name="ck_payments_status",
		),
		CheckConstraint("provider IN ('MANUAL', 'CHAPA')", name="ck_payments_provider"),
	)

	id: Mapped[int] = mapped_column(primary_key=True)
	stay_id: Mapped[int] = mapped_column(ForeignKey("stays.id"), nullable=False, index=True)
	amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
	payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
	status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
	reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
	provider: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
	provider_transaction_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
	tx_ref: Mapped[str | None] = mapped_column(String(200), nullable=True, unique=True, index=True)
	paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
	)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
	)
	metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)