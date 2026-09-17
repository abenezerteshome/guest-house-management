import json

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.services.auth import build_user


class DuplicateUsernameError(Exception):
    pass


class InvalidCurrentPasswordError(Exception):
    pass


class UserNotFoundError(Exception):
    pass


class UnauthorizedAdminError(Exception):
    pass


async def create_user(
    session: AsyncSession,
    *,
    full_name: str,
    username: str,
    password: str,
    role: UserRole,
    email: str | None = None,
) -> User:
    repository = UserRepository(session)
    if await repository.get_by_username(username) is not None:
        raise DuplicateUsernameError("Username is already in use")
    user = build_user(full_name=full_name, username=username, password=password, role=role, email=email)
    try:
        await repository.add(user)
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise DuplicateUsernameError("Username or email is already in use") from exc
    await session.refresh(user)
    return user


async def update_user(
    session: AsyncSession,
    user: User,
    *,
    full_name: str | None = None,
    email: str | None = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
) -> User:
    if full_name is not None:
        user.full_name = full_name
    if email is not None:
        user.email = email
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


async def _find_user(repo: UserRepository, username: str) -> User | None:
    identifier = username.strip().lower()
    user = await repo.get_by_username(identifier)
    if user is None:
        if "@" not in identifier:
            user = await repo.get_by_username(f"{identifier}@guesthousemail.com")
        elif identifier.endswith("@guesthousemail.com"):
            user = await repo.get_by_username(identifier.split("@")[0])
    return user


async def public_change_password(
    session: AsyncSession,
    *,
    username: str,
    current_password: str,
    new_password: str,
) -> User:
    repository = UserRepository(session)
    user = await _find_user(repository, username)
    if user is None or not user.is_active:
        raise InvalidCurrentPasswordError("Invalid username or password")
    if not verify_password(current_password, user.password_hash):
        raise InvalidCurrentPasswordError("Invalid username or password")

    user.password_hash = hash_password(new_password)
    session.add(
        AuditLog(
            user_id=user.id,
            action="STAFF_PASSWORD_CHANGED",
            entity_type="User",
            entity_id=user.id,
            details=json.dumps({"username": user.username}),
        )
    )
    await session.commit()
    await session.refresh(user)
    return user


async def admin_override_reset_password(
    session: AsyncSession,
    *,
    target_username: str,
    new_password: str,
    admin_username: str,
    admin_password: str,
) -> User:
    repository = UserRepository(session)
    admin_user = await _find_user(repository, admin_username)
    if admin_user is None or not admin_user.is_active:
        raise UnauthorizedAdminError("Admin credentials are invalid")
    if admin_user.role != UserRole.ADMIN.value:
        raise UnauthorizedAdminError("Only administrators can authorize a password reset")
    if not verify_password(admin_password, admin_user.password_hash):
        raise UnauthorizedAdminError("Admin credentials are invalid")

    target_user = await _find_user(repository, target_username)
    if target_user is None:
        raise UserNotFoundError(f"User '{target_username}' not found")

    target_user.password_hash = hash_password(new_password)
    session.add(
        AuditLog(
            user_id=admin_user.id,
            action="STAFF_PASSWORD_RESET_BY_ADMIN",
            entity_type="User",
            entity_id=target_user.id,
            details=json.dumps({
                "target_username": target_user.username,
                "target_user_id": target_user.id,
                "authorized_by_admin": admin_user.username,
            }),
        )
    )
    await session.commit()
    await session.refresh(target_user)
    return target_user