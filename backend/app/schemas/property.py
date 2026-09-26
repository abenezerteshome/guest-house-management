from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class PropertyCreate(BaseModel):
	name: str = Field(min_length=1, max_length=200)
	code: str = Field(min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
	contact_phone: str | None = Field(default=None, max_length=50)
	contact_email: str | None = Field(default=None, max_length=255)
	address: str | None = Field(default=None, max_length=300)
	currency: str = Field(default="ETB", max_length=10)
	checkout_deadline_hour: int = Field(default=4, ge=0, le=23)
	checkout_deadline_minute: int = Field(default=0, ge=0, le=59)
	late_checkout_penalty: Decimal = Field(default=Decimal("600.00"), ge=0, decimal_places=2)
	notes: str | None = None

	# Initial Admin account for this property
	admin_full_name: str = Field(min_length=1, max_length=200)
	admin_username: str = Field(min_length=3, max_length=100, pattern=r"^[A-Za-z0-9_.@-]+$")
	admin_password: str = Field(min_length=6, max_length=128)
	admin_email: str | None = Field(default=None, max_length=255)


class PropertyUpdate(BaseModel):
	name: str | None = Field(default=None, min_length=1, max_length=200)
	contact_phone: str | None = Field(default=None, max_length=50)
	contact_email: str | None = Field(default=None, max_length=255)
	address: str | None = Field(default=None, max_length=300)
	currency: str | None = Field(default=None, max_length=10)
	checkout_deadline_hour: int | None = Field(default=None, ge=0, le=23)
	checkout_deadline_minute: int | None = Field(default=None, ge=0, le=59)
	late_checkout_penalty: Decimal | None = Field(default=None, ge=0, decimal_places=2)
	notes: str | None = None
	is_active: bool | None = None


class PropertyRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	name: str
	code: str
	contact_phone: str | None = None
	contact_email: str | None = None
	address: str | None = None
	currency: str
	checkout_deadline_hour: int
	checkout_deadline_minute: int
	late_checkout_penalty: Decimal
	is_active: bool
	notes: str | None = None
	total_rooms: int = 0
	active_stays: int = 0
	staff_count: int = 0
	created_at: datetime
	updated_at: datetime


class SuperAdminStats(BaseModel):
	total_properties: int
	active_properties: int
	suspended_properties: int
	total_rooms: int
	total_stays: int
