from functools import lru_cache
from decimal import Decimal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	database_url: str
	secret_key: str
	access_token_expire_minutes: int = 30
	cors_origins: list[str] = Field(default_factory=list)
	checkout_deadline_hour: int = Field(default=4, ge=0, le=23)
	checkout_deadline_minute: int = Field(default=0, ge=0, le=59)
	late_checkout_penalty: Decimal = Field(default=Decimal("600.00"), ge=0, decimal_places=2)

	model_config = SettingsConfigDict(
		env_file=".env",
		env_file_encoding="utf-8",
		case_sensitive=False,
		extra="ignore",
	)

	@field_validator("cors_origins", mode="before")
	@classmethod
	def parse_cors_origins(cls, value: object) -> object:
		if isinstance(value, str):
			return [origin.strip() for origin in value.split(",") if origin.strip()]
		return value

	@field_validator("database_url")
	@classmethod
	def require_postgresql(cls, value: str) -> str:
		if not value.startswith(("postgresql://", "postgresql+asyncpg://")):
			raise ValueError("DATABASE_URL must use PostgreSQL")
		return value

	@property
	def async_database_url(self) -> str:
		if self.database_url.startswith("postgresql+asyncpg://"):
			return self.database_url
		if self.database_url.startswith("postgresql://"):
			return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
		raise ValueError("DATABASE_URL must use PostgreSQL")


@lru_cache
def get_settings() -> Settings:
	return Settings()
