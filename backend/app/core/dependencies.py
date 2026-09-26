from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.repositories.user import UserRepository


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
	credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
	session: AsyncSession = Depends(get_db),
) -> User:
	if credentials is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Authentication required",
			headers={"WWW-Authenticate": "Bearer"},
		)
	try:
		payload = decode_access_token(credentials.credentials)
		user_id = int(payload["sub"])
	except (ValueError, KeyError, TypeError, JWTError) as exc:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid credentials",
			headers={"WWW-Authenticate": "Bearer"},
		) from exc
	user = await UserRepository(session).get_by_id(user_id)
	if user is None or not user.is_active:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid credentials",
			headers={"WWW-Authenticate": "Bearer"},
		)
	if user.property_id is not None and user.property is not None and not user.property.is_active:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="This property account is deactivated or suspended. Please contact platform support.",
		)
	return user


def require_role(*roles: UserRole) -> Callable:
	async def dependency(user: User = Depends(get_current_user)) -> User:
		if user.role not in {role.value for role in roles}:
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Insufficient permissions",
			)
		return user

	return dependency


require_authenticated_user = get_current_user
require_super_admin = require_role(UserRole.SUPER_ADMIN)
require_admin = require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
require_reception = require_role(UserRole.RECEPTION, UserRole.ADMIN, UserRole.SUPER_ADMIN)


async def get_current_property(user: User = Depends(get_current_user)):
	return user.property
