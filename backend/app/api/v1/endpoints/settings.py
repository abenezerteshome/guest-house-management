from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.core.dependencies import require_admin, require_authenticated_user
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.user import UserRole
from app.schemas.settings import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])
admin_user = Depends(require_admin)
auth_user = Depends(require_authenticated_user)


@router.get("", response_model=SettingsRead, dependencies=[auth_user])
async def read_settings() -> SettingsRead:
	settings = get_settings()
	return SettingsRead(
		checkout_deadline_hour=settings.checkout_deadline_hour,
		checkout_deadline_minute=settings.checkout_deadline_minute,
		late_checkout_penalty=settings.late_checkout_penalty,
		property_name="Haven House",
		currency="ETB",
	)


@router.patch("", response_model=SettingsRead, dependencies=[admin_user])
async def update_settings(
	data: SettingsUpdate,
	current_user: User = Depends(require_admin),
	session: AsyncSession = Depends(get_db),
) -> SettingsRead:
	settings = get_settings()
	settings.checkout_deadline_hour = data.checkout_deadline_hour
	settings.checkout_deadline_minute = data.checkout_deadline_minute
	settings.late_checkout_penalty = data.late_checkout_penalty
	session.add(
		AuditLog(
			user_id=current_user.id,
			action="SETTINGS_UPDATED",
			entity_type="Settings",
			entity_id=1,
		)
	)
	await session.commit()
	return SettingsRead(
		checkout_deadline_hour=settings.checkout_deadline_hour,
		checkout_deadline_minute=settings.checkout_deadline_minute,
		late_checkout_penalty=settings.late_checkout_penalty,
		property_name="Haven House",
		currency="ETB",
	)
