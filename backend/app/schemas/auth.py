from pydantic import BaseModel, Field

from app.schemas.user import UserRead


class LoginRequest(BaseModel):
    username: str
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class PublicChangePasswordRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class AdminOverrideResetRequest(BaseModel):
    target_username: str = Field(min_length=1, max_length=100)
    new_password: str = Field(min_length=6, max_length=128)
    admin_username: str = Field(min_length=1, max_length=100)
    admin_password: str = Field(min_length=1, max_length=128)


class PasswordChangeResponse(BaseModel):
    message: str
    username: str