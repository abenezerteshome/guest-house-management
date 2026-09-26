from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.user import UserRole
from app.repositories.user import UserRepository
from app.services.user import create_user


@asynccontextmanager
async def lifespan(app: FastAPI):
	try:
		async with AsyncSessionLocal() as session:
			repo = UserRepository(session)
			# Ensure Super Admin exists
			superadmin = await repo.get_by_username("superadmin")
			if not superadmin:
				await create_user(
					session,
					full_name="Platform Super Administrator",
					username="superadmin",
					password="super-password-123",
					role=UserRole.SUPER_ADMIN,
					email="superadmin@platform.local",
					property_id=None,
				)
			elif superadmin.role != UserRole.SUPER_ADMIN or not superadmin.is_active:
				superadmin.role = UserRole.SUPER_ADMIN
				superadmin.is_active = True
				await session.commit()

			# Ensure default property and admin exist
			from sqlalchemy import select, text
			from app.models.property import Property
			prop_res = await session.execute(select(Property).where(Property.code == "MAIN"))
			prop_main = prop_res.scalar_one_or_none()
			if not prop_main:
				prop_main = Property(
					name="Family Guest House",
					code="MAIN",
					currency="ETB",
					checkout_deadline_hour=4,
					checkout_deadline_minute=0,
					is_active=True,
				)
				session.add(prop_main)
				await session.flush()

			admin = await repo.get_by_username("admin")
			if not admin:
				await create_user(
					session,
					full_name="Family Guest House Admin",
					username="admin",
					password="admin-password-123",
					role=UserRole.ADMIN,
					email="admin@familyguesthouse.com",
					property_id=prop_main.id,
				)

			await session.execute(text("UPDATE rooms SET status = 'AVAILABLE' WHERE status = 'MAINTENANCE'"))
			await session.commit()
	except Exception as exc:
		import logging
		logging.getLogger("uvicorn.error").warning(f"Lifespan initialization warning: {exc}")
	yield


settings = get_settings()
app = FastAPI(title="Guest House Management System", version="0.1.0", lifespan=lifespan)
app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.cors_origins,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)
app.include_router(api_router)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
	return {"status": "ok"}
