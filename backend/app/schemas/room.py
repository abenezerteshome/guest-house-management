from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.room import RoomStatus


def trim_required(value: str) -> str:
	value = value.strip()
	if not value:
		raise ValueError("must not be empty")
	return value


class RoomCreate(BaseModel):
	room_number: str = Field(min_length=1, max_length=30)
	room_type: str = Field(min_length=1, max_length=100)
	price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
	status: RoomStatus = RoomStatus.AVAILABLE
	is_active: bool = True

	_validator = field_validator("room_number", "room_type", mode="before")(trim_required)


class RoomUpdate(BaseModel):
	room_number: str | None = Field(default=None, min_length=1, max_length=30)
	room_type: str | None = Field(default=None, min_length=1, max_length=100)
	price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
	is_active: bool | None = None

	_validator = field_validator("room_number", "room_type", mode="before")(trim_required)


class RoomStatusUpdate(BaseModel):
	status: RoomStatus


class RoomRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	room_number: str
	room_type: str
	price: Decimal
	status: RoomStatus
	is_active: bool
	created_at: datetime
	updated_at: datetime