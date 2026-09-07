from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
	def __init__(self, session: AsyncSession) -> None:
		self.session = session

	async def get_by_id(self, user_id: int) -> User | None:
		return await self.session.get(User, user_id)

	async def get_by_username(self, username: str) -> User | None:
		result = await self.session.execute(select(User).where(User.username == username))
		return result.scalar_one_or_none()

	async def list(self) -> list[User]:
		result = await self.session.execute(select(User).order_by(User.id))
		return list(result.scalars().all())

	async def add(self, user: User) -> User:
		self.session.add(user)
		await self.session.flush()
		return user
