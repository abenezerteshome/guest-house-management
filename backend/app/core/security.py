from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings


ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
	return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
	return pwd_context.verify(password, password_hash)


def create_access_token(*, user_id: int, username: str, role: str) -> str:
	settings = get_settings()
	expires_at = datetime.now(timezone.utc) + timedelta(
		minutes=settings.access_token_expire_minutes
	)
	payload: dict[str, Any] = {
		"sub": str(user_id),
		"username": username,
		"role": role,
		"exp": expires_at,
	}
	return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
	settings = get_settings()
	try:
		return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
	except JWTError as exc:
		raise ValueError("Invalid access token") from exc
