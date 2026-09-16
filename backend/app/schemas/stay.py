from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from decimal import Decimal

from app.models.stay import StayStatus


class StayExtend(BaseModel):
	new_expected_checkout: datetime
	payment_option: str | None = None
	payment_method: str | None = None


class StayCheckOut(BaseModel):
	penalty_amount: Decimal | None = None
	actual_checkout_at: datetime | None = None


class VoidCheckInRequest(BaseModel):
	reason: str = Field(..., min_length=2, description="Reason for voiding check-in")
	notes: str | None = None
	room_condition: str = Field(default="AVAILABLE", description="'AVAILABLE' or 'CLEANING'")
	refund_amount: Decimal | None = None
	refund_method: str | None = None
	refund_bank_name: str | None = None


class StayRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	reservation_id: int
	guest_id: int
	room_id: int
	check_in_at: datetime
	expected_checkout: datetime
	actual_checkout_at: datetime | None
	status: StayStatus
	notes: str | None
	created_at: datetime
	updated_at: datetime
