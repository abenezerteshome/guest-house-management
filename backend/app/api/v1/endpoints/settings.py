from fastapi import APIRouter, Depends
from app.core.config import get_settings
from app.core.dependencies import require_role
from app.models.user import UserRole
from app.schemas.settings import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])
admin_user = Depends(require_role(UserRole.ADMIN))
operational_user = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION))


@router.get("", response_model=SettingsRead, dependencies=[operational_user])
async def read_settings() -> SettingsRead:
	settings = get_settings()
	return SettingsRead(
		checkout_deadline_hour=settings.checkout_deadline_hour,
		checkout_deadline_minute=settings.checkout_deadline_minute,
		late_checkout_penalty=settings.late_checkout_penalty,
		chapa_configured=bool(settings.chapa_secret_key),
		chapa_public_key=settings.chapa_public_key,
		property_name="Haven House",
		currency="ETB",
	)


@router.patch("", response_model=SettingsRead, dependencies=[admin_user])
async def update_settings(data: SettingsUpdate) -> SettingsRead:
	settings = get_settings()
	settings.checkout_deadline_hour = data.checkout_deadline_hour
	settings.checkout_deadline_minute = data.checkout_deadline_minute
	settings.late_checkout_penalty = data.late_checkout_penalty
	return SettingsRead(
		checkout_deadline_hour=settings.checkout_deadline_hour,
		checkout_deadline_minute=settings.checkout_deadline_minute,
		late_checkout_penalty=settings.late_checkout_penalty,
		chapa_configured=bool(settings.chapa_secret_key),
		chapa_public_key=settings.chapa_public_key,
		property_name="Haven House",
		currency="ETB",
	)
