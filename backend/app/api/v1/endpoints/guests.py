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


async def get_guest_or_404(guest_id: int, session: AsyncSession) -> Guest:
	guest = await GuestRepository(session).get_by_id(guest_id)
	if guest is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found")
	return guest


@router.get("", response_model=list[GuestRead], dependencies=[Depends(get_current_user)])
async def list_guests(
	search: str | None = Query(default=None, max_length=100),
	session: AsyncSession = Depends(get_db),
) -> list[Guest]:
	return await GuestRepository(session).list(search=search.strip() if search else None)


@router.post("", response_model=GuestRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION))])
async def create_guest_endpoint(
	payload: GuestCreate,
	current_user=Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> Guest:
	return await create_guest(session, user_id=current_user.id, **payload.model_dump())


@router.get("/{guest_id}", response_model=GuestRead, dependencies=[Depends(get_current_user)])
async def get_guest(guest_id: int, session: AsyncSession = Depends(get_db)) -> Guest:
	return await get_guest_or_404(guest_id, session)


@router.patch("/{guest_id}", response_model=GuestRead, dependencies=[Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION))])
async def patch_guest(
	guest_id: int,
	payload: GuestUpdate,
	current_user=Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION)),
	session: AsyncSession = Depends(get_db),
) -> Guest:
	guest = await get_guest_or_404(guest_id, session)
	return await update_guest(session, guest, user_id=current_user.id, **payload.model_dump(exclude_unset=True))


@router.delete("/{guest_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def remove_guest(
	guest_id: int,
	current_user=Depends(require_admin),
	session: AsyncSession = Depends(get_db),
) -> None:
	guest = await get_guest_or_404(guest_id, session)
	await delete_guest(session, guest, user_id=current_user.id)