from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.core.security import hash_password, verify_password
from app.repositories.user import UserRepository
from app.services.auth import build_user


class DuplicateUsernameError(Exception):
    pass


class InvalidCurrentPasswordError(Exception):
    pass


async def create_user(
    session: AsyncSession,
    *,
    full_name: str,
    username: str,
    password: str,
    role: UserRole,
) -> User:
    repository = UserRepository(session)
    if await repository.get_by_username(username) is not None:
        raise DuplicateUsernameError("Username is already in use")
    user = build_user(full_name=full_name, username=username, password=password, role=role)
    try:
        await repository.add(user)
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise DuplicateUsernameError("Username is already in use") from exc
    await session.refresh(user)
    return user


async def update_user(
    session: AsyncSession,
    user: User,
    *,
    full_name: str | None = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
) -> User:
    if full_name is not None:
        user.full_name = full_name
    if role is not None:
        user.role = role.value
    if is_active is not None:
        user.is_active = is_active
    await session.commit()
    await session.refresh(user)
    return user


async def change_password(
    session: AsyncSession,
    user: User,
    *,
    current_password: str,
    new_password: str,
) -> User:
    if not verify_password(current_password, user.password_hash):
        raise InvalidCurrentPasswordError("Current password is incorrect")
    user.password_hash = hash_password(new_password)
    await session.commit()
    await session.refresh(user)
    return user


async def set_password(session: AsyncSession, user: User, *, new_password: str) -> User:
    user.password_hash = hash_password(new_password)
    await session.commit()
    await session.refresh(user)
    return user