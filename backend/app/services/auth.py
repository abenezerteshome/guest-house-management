from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.repositories.user import UserRepository


class AuthenticationError(Exception):
	pass


class ForbiddenAdminError(Exception):
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


async def authenticate_google_admin(
	session: AsyncSession, credential: str
) -> User:
	settings = get_settings()
	try:
		audience = settings.google_client_id if settings.google_client_id else None
		idinfo = id_token.verify_oauth2_token(
			credential,
			google_requests.Request(),
			audience=audience,
		)
	except Exception as exc:
		raise AuthenticationError(f"Invalid Google token: {exc}") from exc

	if not idinfo.get("email_verified", False):
		raise AuthenticationError("Google account email is not verified.")

	email = idinfo.get("email", "").strip().lower()
	google_sub = idinfo.get("sub", "").strip()

	if not email:
		raise AuthenticationError("No email address provided by Google account.")

	repo = UserRepository(session)
	user = None
	if google_sub:
		user = await repo.get_by_google_sub(google_sub)
	if user is None:
		user = await repo.get_by_email(email)
	if user is None:
		user = await repo.get_by_username(email)
	if user is None and "@" in email:
		user = await repo.get_by_username(email.split("@")[0])

	if user is None:
		raise AuthenticationError(
			"This Google account is not recognized. Administrator access is restricted to authorized accounts."
		)

	if user.role != UserRole.ADMIN.value:
		raise ForbiddenAdminError(
			"Access denied: Google Sign-In is authorized for Administrator accounts only."
		)

	if not user.is_active:
		raise AuthenticationError("Administrator account is inactive.")

	updated = False
	if not user.google_sub and google_sub:
		user.google_sub = google_sub
		updated = True
	if not user.email and email:
		user.email = email
		updated = True
	if updated:
		await session.commit()
		await session.refresh(user)

	return user


def issue_access_token(user: User) -> str:
	return create_access_token(
		user_id=user.id,
		username=user.username,
		role=user.role,
	)


def build_user(*, full_name: str, username: str, password: str, role: UserRole, email: str | None = None) -> User:
	return User(
		full_name=full_name,
		username=username,
		email=email,
		password_hash=hash_password(password),
		role=role.value,
		is_active=True,
	)
