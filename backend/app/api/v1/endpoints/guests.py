from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_admin, require_role
from app.db.session import get_db
from app.models.guest import Guest
from app.models.user import UserRole
from app.repositories.guest import GuestRepository
from app.schemas.guest import GuestCreate, GuestRead, GuestUpdate
from app.services.guest import create_guest, delete_guest, update_guest


router = APIRouter(prefix="/guests", tags=["guests"])


async def get_guest_or_404(guest_id: int, current_user: User, session: AsyncSession) -> Guest:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	guest = await GuestRepository(session, property_id=prop_id).get_by_id(guest_id)
	if guest is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found")
	return guest


@router.get("", response_model=list[GuestRead])
async def list_guests(
	search: str | None = Query(default=None, max_length=100),
	current_user: User = Depends(get_current_user),
	session: AsyncSession = Depends(get_db),
) -> list[Guest]:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	return await GuestRepository(session, property_id=prop_id).list(search=search.strip() if search else None)


@router.post("", response_model=GuestRead, status_code=status.HTTP_201_CREATED)
async def create_guest_endpoint(
	payload: GuestCreate,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)),
	session: AsyncSession = Depends(get_db),
) -> Guest:
	prop_id = current_user.property_id
	return await create_guest(session, user_id=current_user.id, property_id=prop_id, **payload.model_dump())


@router.get("/{guest_id}", response_model=GuestRead)
async def get_guest(
	guest_id: int,
	current_user: User = Depends(get_current_user),
	session: AsyncSession = Depends(get_db),
) -> Guest:
	return await get_guest_or_404(guest_id, current_user, session)


@router.patch("/{guest_id}", response_model=GuestRead)
async def patch_guest(
	guest_id: int,
	payload: GuestUpdate,
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)),
	session: AsyncSession = Depends(get_db),
) -> Guest:
	guest = await get_guest_or_404(guest_id, current_user, session)
	return await update_guest(session, guest, user_id=current_user.id, **payload.model_dump(exclude_unset=True))


@router.delete("/{guest_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_guest(
	guest_id: int,
	current_user: User = Depends(require_admin),
	session: AsyncSession = Depends(get_db),
) -> None:
	guest = await get_guest_or_404(guest_id, current_user, session)
	await delete_guest(session, guest, user_id=current_user.id)