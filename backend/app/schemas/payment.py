from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.payment import PaymentMethod, PaymentStatus


class ManualPaymentCreate(BaseModel):
	amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
	payment_method: PaymentMethod
	reference: str | None = Field(default=None, max_length=200)


class PaymentRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	stay_id: int
	amount: Decimal
	payment_method: PaymentMethod
	status: PaymentStatus
	reference: str | None
	paid_at: datetime | None
	created_by: int | None
	created_at: datetime
	updated_at: datetime