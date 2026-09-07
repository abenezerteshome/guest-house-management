from datetime import datetime
from decimal import Decimal
from typing import Any
from pydantic import BaseModel, Field

class PublicRoomRead(BaseModel):
    id: int
    room_number: str
    room_type: str
    price: Decimal
    status: str
    capacity: int = 2
    amenities: list[str] = Field(default_factory=lambda: ["High-speed Wi-Fi", "En-suite Bathroom", "Balcony View", "Breakfast Included", "Smart TV"])
    image_url: str | None = None

class PublicBookingCreate(BaseModel):
    full_name: str
    email: str | None = None
    phone: str
    id_number: str | None = None
    nationality: str | None = "Ethiopian"
    room_id: int
    expected_arrival: datetime
    expected_checkout: datetime
    special_requests: str | None = None
    google_id_token: str | None = None

class PublicBookingConfirmation(BaseModel):
    reservation_id: int
    booking_reference: str
    guest_name: str
    phone: str
    room_id: int
    room_number: str
    room_type: str
    price_per_night: Decimal
    total_estimated: Decimal
    expected_arrival: datetime
    expected_checkout: datetime
    status: str
    checkout_deadline: str = "04:00 AM"
    notes: str | None = None

class GoogleAuthPayload(BaseModel):
    credential: str

class GoogleAuthResponse(BaseModel):
    email: str
    name: str
    picture: str | None = None
    sub: str

class GuestRegisterRequest(BaseModel):
    full_name: str
    email: str
    phone: str
    password: str

class GuestLoginRequest(BaseModel):
    identifier: str
    password: str

class GuestAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    id: int
    name: str
    email: str
    phone: str
    picture: str | None = None
