from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.charge import ChargeType


class ChargeCreate(BaseModel):
	charge_type: ChargeType
	description: str = Field(min_length=1, max_length=300)
	amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
	quantity: int = Field(default=1, gt=0)

	@field_validator("description", mode="before")
	@classmethod
	def trim_description(cls, value: str) -> str:
		value = value.strip()
		if not value:
			raise ValueError("description must not be empty")
		return value


class ChargeRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	stay_id: int
	charge_type: ChargeType
	description: str
	amount: Decimal
	quantity: int
	charged_at: datetime
	created_by: int | None
	created_at: datetime


class FinancialSummary(BaseModel):
	stay_id: int
	total_due: Decimal
	total_paid: Decimal
	balance: Decimal