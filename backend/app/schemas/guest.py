from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def trim_required(value: str) -> str:
	value = value.strip()
	if not value:
		raise ValueError("must not be empty")
	return value


def trim_optional(value: str | None) -> str | None:
	if value is None:
		return None
	value = value.strip()
	return value or None


class GuestCreate(BaseModel):
	full_name: str = Field(min_length=1, max_length=200)
	id_number: str = Field(min_length=1, max_length=100)
	phone: str = Field(min_length=1, max_length=50)
	address: str | None = Field(default=None, max_length=300)
	nationality: str | None = Field(default=None, max_length=100)
	notes: str | None = None

	_required_validator = field_validator("full_name", "id_number", "phone", mode="before")(
		trim_required
	)
	_optional_validator = field_validator("address", "nationality", "notes", mode="before")(
		trim_optional
	)


class GuestUpdate(BaseModel):
	full_name: str | None = Field(default=None, min_length=1, max_length=200)
	id_number: str | None = Field(default=None, min_length=1, max_length=100)
	phone: str | None = Field(default=None, min_length=1, max_length=50)
	address: str | None = Field(default=None, max_length=300)
	nationality: str | None = Field(default=None, max_length=100)
	notes: str | None = None

	_required_validator = field_validator("full_name", "id_number", "phone", mode="before")(
		trim_required
	)
	_optional_validator = field_validator("address", "nationality", "notes", mode="before")(
		trim_optional
	)


class GuestRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	full_name: str
	id_number: str
	phone: str
	address: str | None
	nationality: str | None
	notes: str | None
	created_at: datetime
	updated_at: datetime