from decimal import Decimal
from pydantic import BaseModel, Field


class SettingsRead(BaseModel):
	checkout_deadline_hour: int
	checkout_deadline_minute: int
	late_checkout_penalty: Decimal
	property_name: str = "Family Guest House"
	currency: str = "ETB"
	contact_phone: str | None = None
	address: str | None = None


class SettingsUpdate(BaseModel):
	property_name: str | None = Field(default=None, min_length=1, max_length=200)
	currency: str | None = Field(default=None, min_length=1, max_length=10)
	contact_phone: str | None = Field(default=None, max_length=50)
	address: str | None = Field(default=None, max_length=300)
	checkout_deadline_hour: int | None = Field(default=None, ge=0, le=23)
	checkout_deadline_minute: int | None = Field(default=None, ge=0, le=59)
	late_checkout_penalty: Decimal | None = Field(default=None, ge=0, decimal_places=2)
