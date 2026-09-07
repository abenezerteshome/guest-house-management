from decimal import Decimal
from pydantic import BaseModel, Field


class SettingsRead(BaseModel):
	checkout_deadline_hour: int
	checkout_deadline_minute: int
	late_checkout_penalty: Decimal
	property_name: str = "Haven House"
	currency: str = "ETB"


class SettingsUpdate(BaseModel):
	checkout_deadline_hour: int = Field(default=4, ge=0, le=23)
	checkout_deadline_minute: int = Field(default=0, ge=0, le=59)
	late_checkout_penalty: Decimal = Field(default=Decimal("600.00"), ge=0, decimal_places=2)
