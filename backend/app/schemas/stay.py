from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from decimal import Decimal

from app.models.stay import StayStatus


class StayExtend(BaseModel):
	new_expected_checkout: datetime


class StayCheckOut(BaseModel):
	penalty_amount: Decimal | None = None
	actual_checkout_at: datetime | None = None


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
