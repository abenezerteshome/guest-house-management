from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.reservation import ReservationStatus


def validate_notes(value: str | None) -> str | None:
	if value is None:
		return None
	value = value.strip()
	return value or None


class ReservationCreate(BaseModel):
	guest_id: int = Field(gt=0)
	room_id: int = Field(gt=0)
	expected_arrival: datetime
	expected_checkout: datetime
	notes: str | None = None

	_notes_validator = field_validator("notes", mode="before")(validate_notes)

	@field_validator("expected_checkout")
	@classmethod
	def checkout_after_arrival(cls, value: datetime, info):
		arrival = info.data.get("expected_arrival")
		if arrival is not None and value <= arrival:
			raise ValueError("expected_checkout must be after expected_arrival")
		return value


class ReservationUpdate(BaseModel):
	guest_id: int | None = Field(default=None, gt=0)
	room_id: int | None = Field(default=None, gt=0)
	expected_arrival: datetime | None = None
	expected_checkout: datetime | None = None
	notes: str | None = None

	_notes_validator = field_validator("notes", mode="before")(validate_notes)


class ReservationRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	guest_id: int
	room_id: int
	status: ReservationStatus
	expected_arrival: datetime
	expected_checkout: datetime
	notes: str | None
	created_at: datetime
	updated_at: datetime
