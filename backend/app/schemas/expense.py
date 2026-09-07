from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.expense import ExpenseCategory, ExpensePaymentMethod


class ExpenseBase(BaseModel):
	category: ExpenseCategory
	description: str = Field(min_length=1)
	amount: Decimal = Field(gt=Decimal("0.00"), decimal_places=2)
	payment_method: ExpensePaymentMethod = ExpensePaymentMethod.CASH
	expense_date: datetime | None = None


class ExpenseCreate(ExpenseBase):
	pass


class ExpenseRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	category: str
	description: str
	amount: Decimal
	payment_method: str
	expense_date: datetime
	recorded_by: int | None
	created_at: datetime


class ExpenseCategoryBreakdown(BaseModel):
	category: str
	total: Decimal
	percentage: float = 0.0
