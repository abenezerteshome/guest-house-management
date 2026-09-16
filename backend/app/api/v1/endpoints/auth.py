from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.schemas.auth import ChangePasswordRequest, LoginRequest, TokenResponse
from app.schemas.user import UserRead
from app.services.auth import AuthenticationError, authenticate_user, issue_access_token
from app.services.user import InvalidCurrentPasswordError, change_password


router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        user = await authenticate_user(session, payload.username, payload.password)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    return TokenResponse(access_token=issue_access_token(user), user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
async def me(user=Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(user)


@router.post("/change-password", response_model=UserRead)
async def change_password_endpoint(
    payload: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> UserRead:
    try:
        user = await change_password(
            session,
            current_user,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
    except InvalidCurrentPasswordError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return UserRead.model_validate(user)