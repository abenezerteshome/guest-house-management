from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.schemas.auth import (
    AdminOverrideResetRequest,
    ChangePasswordRequest,
    LoginRequest,
    PasswordChangeResponse,
    PublicChangePasswordRequest,
    TokenResponse,
)
from app.schemas.user import UserRead
from app.services.auth import AuthenticationError, authenticate_user, issue_access_token
from app.services.user import (
    InvalidCurrentPasswordError,
    UnauthorizedAdminError,
    UserNotFoundError,
    admin_override_reset_password,
    change_password,
    public_change_password,
)


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


@router.post("/public-change-password", response_model=PasswordChangeResponse)
async def public_change_password_endpoint(
    payload: PublicChangePasswordRequest,
    session: AsyncSession = Depends(get_db),
) -> PasswordChangeResponse:
    try:
        user = await public_change_password(
            session,
            username=payload.username,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
    except InvalidCurrentPasswordError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return PasswordChangeResponse(
        message="Password updated successfully. You can now sign in with your new password.",
        username=user.username,
    )


@router.post("/admin-override-reset", response_model=PasswordChangeResponse)
async def admin_override_reset_endpoint(
    payload: AdminOverrideResetRequest,
    session: AsyncSession = Depends(get_db),
) -> PasswordChangeResponse:
    try:
        user = await admin_override_reset_password(
            session,
            target_username=payload.target_username,
            new_password=payload.new_password,
            admin_username=payload.admin_username,
            admin_password=payload.admin_password,
        )
    except UnauthorizedAdminError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return PasswordChangeResponse(
        message=f"Password for '{user.username}' has been successfully reset by admin authorization.",
        username=user.username,
    )