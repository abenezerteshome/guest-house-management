from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.core.dependencies import get_current_user, require_admin, require_authenticated_user
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.property import Property
from app.models.user import User
from app.schemas.settings import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsRead)
async def read_settings(
	current_user: User = Depends(require_authenticated_user),
	session: AsyncSession = Depends(get_db),
) -> SettingsRead:
	prop = None
	if current_user.property_id:
		prop = await session.get(Property, current_user.property_id)

	if prop is None:
		settings = get_settings()
		return SettingsRead(
			checkout_deadline_hour=settings.checkout_deadline_hour,
			checkout_deadline_minute=settings.checkout_deadline_minute,
			late_checkout_penalty=settings.late_checkout_penalty,
			property_name="Family Guest House",
			currency="ETB",
		)

	return SettingsRead(
		checkout_deadline_hour=prop.checkout_deadline_hour,
		checkout_deadline_minute=prop.checkout_deadline_minute,
		late_checkout_penalty=prop.late_checkout_penalty,
		property_name=prop.name,
		currency=prop.currency,
		contact_phone=prop.contact_phone,
		address=prop.address,
	)


@router.patch("", response_model=SettingsRead)
async def update_settings(
	data: SettingsUpdate,
	current_user: User = Depends(require_admin),
	session: AsyncSession = Depends(get_db),
) -> SettingsRead:
	if not current_user.property_id:
		raise HTTPException(status_code=400, detail="User is not associated with a property")

	prop = await session.get(Property, current_user.property_id)
	if not prop:
		raise HTTPException(status_code=404, detail="Property not found")

	if data.checkout_deadline_hour is not None:
		prop.checkout_deadline_hour = data.checkout_deadline_hour
	if data.checkout_deadline_minute is not None:
		prop.checkout_deadline_minute = data.checkout_deadline_minute
	if data.late_checkout_penalty is not None:
		prop.late_checkout_penalty = data.late_checkout_penalty
	if data.property_name is not None:
		prop.name = data.property_name
	if data.currency is not None:
		prop.currency = data.currency
	if data.contact_phone is not None:
		prop.contact_phone = data.contact_phone
	if data.address is not None:
		prop.address = data.address

	session.add(
		AuditLog(
			property_id=prop.id,
			user_id=current_user.id,
			action="SETTINGS_UPDATED",
			entity_type="Property",
			entity_id=prop.id,
		)
	)
	await session.commit()
	await session.refresh(prop)

	return SettingsRead(
		checkout_deadline_hour=prop.checkout_deadline_hour,
		checkout_deadline_minute=prop.checkout_deadline_minute,
		late_checkout_penalty=prop.late_checkout_penalty,
		property_name=prop.name,
		currency=prop.currency,
		contact_phone=prop.contact_phone,
		address=prop.address,
	)
