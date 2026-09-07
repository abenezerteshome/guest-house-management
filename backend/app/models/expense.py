from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ExpenseCategory(StrEnum):
	CLEANING = "CLEANING"
	ELECTRICITY = "ELECTRICITY"
	WATER = "WATER"
	MAINTENANCE = "MAINTENANCE"
	FOOD = "FOOD"
	SALARY = "SALARY"
	TRANSPORTATION = "TRANSPORTATION"
	SUPPLIES = "SUPPLIES"
	OTHER = "OTHER"


class ExpensePaymentMethod(StrEnum):
	CASH = "CASH"
	TELEBIRR = "TELEBIRR"
	CBE_BIRR = "CBE_BIRR"
	BANK_TRANSFER = "BANK_TRANSFER"
	OTHER = "OTHER"


class Expense(Base):
	__tablename__ = "expenses"
	__table_args__ = (
		CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
		CheckConstraint(
			"category IN ('CLEANING', 'ELECTRICITY', 'WATER', 'MAINTENANCE', 'FOOD', 'SALARY', 'TRANSPORTATION', 'SUPPLIES', 'OTHER')",
			name="ck_expenses_category",
		),
		CheckConstraint(
			"payment_method IN ('CASH', 'TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'OTHER')",
			name="ck_expenses_payment_method",
		),
	)

	id: Mapped[int] = mapped_column(primary_key=True)
	category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
	description: Mapped[str] = mapped_column(Text, nullable=False)
	amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
	payment_method: Mapped[str] = mapped_column(
		String(30), nullable=False, default=ExpensePaymentMethod.CASH.value
	)
	expense_date: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
	)
	recorded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now()
	)
