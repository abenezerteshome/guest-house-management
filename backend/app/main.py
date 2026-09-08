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
			users = await repo.list()
			if not users:
				await create_user(
					session,
					full_name="System Administrator",
					username="admin@guesthousemail.com",
					password="admin-password-123",
					role=UserRole.ADMIN,
				)
				await create_user(
					session,
					full_name="Reception Staff",
					username="reception@guesthousemail.com",
					password="reception-password-123",
					role=UserRole.RECEPTION,
				)
	except Exception:
		pass
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
