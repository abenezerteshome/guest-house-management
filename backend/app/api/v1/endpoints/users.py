from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_admin
from app.db.session import get_db
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserPasswordUpdate, UserRead, UserUpdate
from app.services.user import DuplicateUsernameError, create_user, set_password, update_user


router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[UserRead])
async def list_users(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> list[User]:
    prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
    return await UserRepository(session).list(property_id=prop_id)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user_endpoint(
    payload: UserCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> User:
    data = payload.model_dump()
    if current_user.role != UserRole.SUPER_ADMIN:
        if payload.role == UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create super admin")
        data["property_id"] = current_user.property_id
    elif data.get("property_id") is None and payload.role != UserRole.SUPER_ADMIN:
        data["property_id"] = current_user.property_id

    try:
        return await create_user(session, **data)
    except DuplicateUsernameError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


async def get_user_or_404(user_id: int, current_user: User, session: AsyncSession) -> User:
    user = await UserRepository(session).get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if current_user.role != UserRole.SUPER_ADMIN and user.property_id != current_user.property_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> User:
    return await get_user_or_404(user_id, current_user, session)


@router.patch("/{user_id}", response_model=UserRead)
async def patch_user(
    user_id: int,
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> User:
    user = await get_user_or_404(user_id, current_user, session)
    try:
        return await update_user(session, user, **payload.model_dump(exclude_unset=True))
    except DuplicateUsernameError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/{user_id}/activate", response_model=UserRead)
async def activate_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> User:
    user = await get_user_or_404(user_id, current_user, session)
    return await update_user(session, user, is_active=True)


@router.post("/{user_id}/deactivate", response_model=UserRead)
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> User:
    user = await get_user_or_404(user_id, current_user, session)
    return await update_user(session, user, is_active=False)


@router.post("/{user_id}/password", response_model=UserRead)
async def reset_user_password(
    user_id: int,
    payload: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> User:
    user = await get_user_or_404(user_id, current_user, session)
    return await set_password(session, user, new_password=payload.new_password)