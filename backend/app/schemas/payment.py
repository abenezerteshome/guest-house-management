from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.payment import PaymentMethod, PaymentProvider, PaymentStatus


class ManualPaymentCreate(BaseModel):
	amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
	payment_method: PaymentMethod
	reference: str | None = Field(default=None, max_length=200)


class ChapaInitializeRequest(BaseModel):
	amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class PaymentRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	stay_id: int
	amount: Decimal
	payment_method: PaymentMethod
	status: PaymentStatus
	reference: str | None
	provider: PaymentProvider
	provider_transaction_id: str | None
	tx_ref: str | None
	paid_at: datetime | None
	created_by: int | None
	created_at: datetime
	updated_at: datetime
	metadata_json: dict | None


class ChapaInitializeResponse(BaseModel):
	payment_id: int
	tx_ref: str
	checkout_url: str