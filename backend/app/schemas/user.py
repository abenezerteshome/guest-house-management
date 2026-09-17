from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    username: str = Field(min_length=3, max_length=100, pattern=r"^[A-Za-z0-9_.@-]+$")
    email: str | None = Field(default=None, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    role: UserRole


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    email: str | None = Field(default=None, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None


class UserPasswordUpdate(BaseModel):
    new_password: str = Field(min_length=6, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    username: str
    email: str | None = None
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime