from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.repositories.user import UserRepository


class AuthenticationError(Exception):
	pass


async def authenticate_user(
	session: AsyncSession, username: str, password: str
) -> User:
	identifier = username.strip().lower()
	repo = UserRepository(session)
	user = await repo.get_by_username(identifier)
	if user is None:
		if "@" not in identifier:
			user = await repo.get_by_username(f"{identifier}@guesthousemail.com")
		elif identifier.endswith("@guesthousemail.com"):
			user = await repo.get_by_username(identifier.split("@")[0])
	if user is None or not verify_password(password, user.password_hash):
		raise AuthenticationError("Invalid username or password")
	if not user.is_active:
		raise AuthenticationError("User account is inactive")
	return user


def issue_access_token(user: User) -> str:
	return create_access_token(
		user_id=user.id,
		username=user.username,
		role=user.role,
	)


def build_user(*, full_name: str, username: str, password: str, role: UserRole) -> User:
	return User(
		full_name=full_name,
		username=username,
		password_hash=hash_password(password),
		role=role.value,
		is_active=True,
	)
