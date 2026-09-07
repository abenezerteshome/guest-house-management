from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.user import DuplicateUsernameError, create_user, update_user


router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[UserRead])
async def list_users(session: AsyncSession = Depends(get_db)) -> list[User]:
    return await UserRepository(session).list()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user_endpoint(
    payload: UserCreate, session: AsyncSession = Depends(get_db)
) -> User:
    try:
        return await create_user(session, **payload.model_dump())
    except DuplicateUsernameError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


async def get_user_or_404(user_id: int, session: AsyncSession) -> User:
    user = await UserRepository(session).get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: int, session: AsyncSession = Depends(get_db)) -> User:
    return await get_user_or_404(user_id, session)


@router.patch("/{user_id}", response_model=UserRead)
async def patch_user(
    user_id: int, payload: UserUpdate, session: AsyncSession = Depends(get_db)
) -> User:
    user = await get_user_or_404(user_id, session)
    return await update_user(session, user, **payload.model_dump(exclude_unset=True))


@router.post("/{user_id}/activate", response_model=UserRead)
async def activate_user(user_id: int, session: AsyncSession = Depends(get_db)) -> User:
    user = await get_user_or_404(user_id, session)
    return await update_user(session, user, is_active=True)


@router.post("/{user_id}/deactivate", response_model=UserRead)
async def deactivate_user(user_id: int, session: AsyncSession = Depends(get_db)) -> User:
    user = await get_user_or_404(user_id, session)
    return await update_user(session, user, is_active=False)