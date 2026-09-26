from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
	def __init__(self, session: AsyncSession) -> None:
		self.session = session

	async def get_by_id(self, user_id: int) -> User | None:
		return await self.session.get(User, user_id)

	async def get_by_username(self, username: str) -> User | None:
		from sqlalchemy import func
		result = await self.session.execute(
			select(User).where(func.lower(User.username) == username.strip().lower())
		)
		return result.scalar_one_or_none()

	async def get_by_email(self, email: str) -> User | None:
		from sqlalchemy import func
		result = await self.session.execute(
			select(User).where(func.lower(User.email) == email.strip().lower())
		)
		return result.scalar_one_or_none()

	async def get_by_google_sub(self, google_sub: str) -> User | None:
		result = await self.session.execute(
			select(User).where(User.google_sub == google_sub.strip())
		)
		return result.scalar_one_or_none()

	async def list(self, *, property_id: int | None = None) -> list[User]:
		query = select(User)
		if property_id is not None:
			query = query.where(User.property_id == property_id)
		result = await self.session.execute(query.order_by(User.id))
		return list(result.scalars().all())

	async def add(self, user: User) -> User:
		self.session.add(user)
		await self.session.flush()
		return user
