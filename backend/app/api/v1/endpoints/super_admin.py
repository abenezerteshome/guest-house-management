from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_super_admin
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.expense import Expense
from app.models.payment import Payment, PaymentStatus
from app.models.property import Property
from app.models.room import Room
from app.models.stay import Stay, StayStatus
from app.models.user import User, UserRole
from app.schemas.property import PropertyCreate, PropertyRead, PropertyUpdate, SuperAdminStats
from app.services.user import DuplicateUsernameError, create_user

router = APIRouter(
	prefix="/super-admin",
	tags=["super-admin"],
	dependencies=[Depends(require_super_admin)],
)


@router.get("/stats", response_model=SuperAdminStats)
async def get_super_admin_stats(session: AsyncSession = Depends(get_db)) -> SuperAdminStats:
	total_props = (await session.execute(select(func.count(Property.id)))).scalar_one() or 0
	active_props = (
		await session.execute(select(func.count(Property.id)).where(Property.is_active.is_(True)))
	).scalar_one() or 0
	suspended_props = total_props - active_props
	total_rooms = (await session.execute(select(func.count(Room.id)))).scalar_one() or 0
	total_stays = (await session.execute(select(func.count(Stay.id)))).scalar_one() or 0

	total_rev = (
		await session.execute(
			select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
				Payment.status == PaymentStatus.SUCCESS.value
			)
		)
	).scalar_one() or Decimal("0.00")

	total_exp = (
		await session.execute(
			select(func.coalesce(func.sum(Expense.amount), Decimal("0.00")))
		)
	).scalar_one() or Decimal("0.00")

	return SuperAdminStats(
		total_properties=total_props,
		active_properties=active_props,
		suspended_properties=suspended_props,
		total_rooms=total_rooms,
		total_stays=total_stays,
		total_revenue=Decimal(str(total_rev)),
		total_expenses=Decimal(str(total_exp)),
		total_net_income=Decimal(str(total_rev - total_exp)),
	)


@router.get("/properties", response_model=list[PropertyRead])
async def list_properties(session: AsyncSession = Depends(get_db)) -> list[PropertyRead]:
	result = await session.execute(select(Property).order_by(Property.id.desc()))
	properties = list(result.scalars().all())

	output: list[PropertyRead] = []
	for p in properties:
		room_count = (
			await session.execute(select(func.count(Room.id)).where(Room.property_id == p.id))
		).scalar_one() or 0
		stay_count = (
			await session.execute(
				select(func.count(Stay.id)).where(
					Stay.property_id == p.id, Stay.status == StayStatus.CHECKED_IN.value
				)
			)
		).scalar_one() or 0
		staff_count = (
			await session.execute(select(func.count(User.id)).where(User.property_id == p.id))
		).scalar_one() or 0

		rev = (
			await session.execute(
				select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
					Payment.property_id == p.id,
					Payment.status == PaymentStatus.SUCCESS.value,
				)
			)
		).scalar_one() or Decimal("0.00")

		exp = (
			await session.execute(
				select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
					Expense.property_id == p.id
				)
			)
		).scalar_one() or Decimal("0.00")

		data = PropertyRead.model_validate(p)
		data.total_rooms = room_count
		data.active_stays = stay_count
		data.staff_count = staff_count
		data.total_revenue = Decimal(str(rev))
		data.total_expenses = Decimal(str(exp))
		data.net_income = Decimal(str(rev - exp))
		output.append(data)

	return output


@router.post("/properties", response_model=PropertyRead, status_code=status.HTTP_201_CREATED)
async def create_property(
	payload: PropertyCreate, session: AsyncSession = Depends(get_db)
) -> PropertyRead:
	# Check code uniqueness
	existing = (
		await session.execute(select(Property).where(Property.code == payload.code.strip().upper()))
	).scalar_one_or_none()
	if existing:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT, detail="Property code already exists"
		)

	# Create property
	prop = Property(
		name=payload.name.strip(),
		code=payload.code.strip().upper(),
		contact_phone=payload.contact_phone,
		contact_email=payload.contact_email,
		address=payload.address,
		currency=payload.currency.strip().upper(),
		checkout_deadline_hour=payload.checkout_deadline_hour,
		checkout_deadline_minute=payload.checkout_deadline_minute,
		late_checkout_penalty=payload.late_checkout_penalty,
		notes=payload.notes,
		is_active=True,
	)
	session.add(prop)
	try:
		await session.flush()
	except IntegrityError as exc:
		await session.rollback()
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT, detail="Could not create property"
		) from exc

	# Create initial admin user for this property
	try:
		await create_user(
			session,
			full_name=payload.admin_full_name.strip(),
			username=payload.admin_username.strip(),
			password=payload.admin_password,
			role=UserRole.ADMIN,
			email=payload.admin_email,
			property_id=prop.id,
		)
	except DuplicateUsernameError as exc:
		await session.rollback()
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail=f"Admin username or email already in use: {exc}",
		) from exc

	session.add(
		AuditLog(
			property_id=prop.id,
			user_id=None,
			action="PROPERTY_ONBOARDED",
			entity_type="Property",
			entity_id=prop.id,
			details=f"Property {prop.name} ({prop.code}) created with admin {payload.admin_username}",
		)
	)
	await session.commit()
	await session.refresh(prop)

	res = PropertyRead.model_validate(prop)
	res.staff_count = 1
	return res


@router.get("/properties/{property_id}", response_model=PropertyRead)
async def get_property(property_id: int, session: AsyncSession = Depends(get_db)) -> PropertyRead:
	prop = await session.get(Property, property_id)
	if not prop:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

	room_count = (
		await session.execute(select(func.count(Room.id)).where(Room.property_id == prop.id))
	).scalar_one() or 0
	stay_count = (
		await session.execute(
			select(func.count(Stay.id)).where(
				Stay.property_id == prop.id, Stay.status == StayStatus.CHECKED_IN.value
			)
		)
	).scalar_one() or 0
	staff_count = (
		await session.execute(select(func.count(User.id)).where(User.property_id == prop.id))
	).scalar_one() or 0

	data = PropertyRead.model_validate(prop)
	data.total_rooms = room_count
	data.active_stays = stay_count
	data.staff_count = staff_count
	return data


@router.put("/properties/{property_id}", response_model=PropertyRead)
async def update_property_endpoint(
	property_id: int, payload: PropertyUpdate, session: AsyncSession = Depends(get_db)
) -> PropertyRead:
	prop = await session.get(Property, property_id)
	if not prop:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

	for field, val in payload.model_dump(exclude_unset=True).items():
		setattr(prop, field, val)

	await session.commit()
	await session.refresh(prop)
	return PropertyRead.model_validate(prop)


@router.patch("/properties/{property_id}/status", response_model=PropertyRead)
async def toggle_property_status(
	property_id: int, session: AsyncSession = Depends(get_db)
) -> PropertyRead:
	prop = await session.get(Property, property_id)
	if not prop:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

	prop.is_active = not prop.is_active
	session.add(
		AuditLog(
			property_id=prop.id,
			user_id=None,
			action="PROPERTY_STATUS_CHANGED",
			entity_type="Property",
			entity_id=prop.id,
			details=f"Property status set to {'ACTIVE' if prop.is_active else 'SUSPENDED'}",
		)
	)
	await session.commit()
	await session.refresh(prop)
	return PropertyRead.model_validate(prop)
