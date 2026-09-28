from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.repositories.user import UserRepository


class AuthenticationError(Exception):
	pass


async def authenticate_user(
	session: AsyncSession, username: str, password: str
) -> User:
	repo = UserRepository(session)
	user = await repo.find_by_identifier(username)
	if user is None or not verify_password(password, user.password_hash):
		raise AuthenticationError("Invalid username, phone number, or password")
	if not user.is_active:
		raise AuthenticationError("User account is inactive")
	return user


def issue_access_token(user: User) -> str:
	return create_access_token(
		user_id=user.id,
		username=user.username,
		role=user.role,
		property_id=user.property_id,
	)


def build_user(
	*,
	full_name: str,
	username: str,
	password: str,
	role: UserRole,
	email: str | None = None,
	phone: str | None = None,
	property_id: int | None = None,
) -> User:
	return User(
		full_name=full_name,
		username=username,
		email=email,
		phone=phone,
		password_hash=hash_password(password),
		role=role.value,
		property_id=property_id,
		is_active=True,
	)
