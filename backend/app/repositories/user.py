import re

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


def generate_phone_variants(raw: str) -> list[str]:
	cleaned = re.sub(r"[\s\-\.\(\)]", "", raw.strip())
	variants = set()
	if cleaned:
		variants.add(cleaned)
		variants.add(cleaned.lower())
	digits = re.sub(r"[^\d]", "", cleaned)
	if digits:
		variants.add(digits)
		if digits.startswith("251") and len(digits) == 12:
			nine = digits[3:]
			variants.add(f"+{digits}")
			variants.add(digits)
			variants.add(f"0{nine}")
			variants.add(nine)
		elif digits.startswith("0") and len(digits) == 10:
			nine = digits[1:]
			variants.add(f"+251{nine}")
			variants.add(f"251{nine}")
			variants.add(digits)
			variants.add(nine)
		elif len(digits) == 9 and (digits.startswith("9") or digits.startswith("7")):
			variants.add(f"+251{digits}")
			variants.add(f"251{digits}")
			variants.add(f"0{digits}")
			variants.add(digits)
	return list(variants)


class UserRepository:
	def __init__(self, session: AsyncSession) -> None:
		self.session = session

	async def get_by_id(self, user_id: int) -> User | None:
		return await self.session.get(User, user_id)

	async def get_by_username(self, username: str) -> User | None:
		result = await self.session.execute(
			select(User).where(func.lower(User.username) == username.strip().lower())
		)
		return result.scalar_one_or_none()

	async def get_by_phone(self, phone: str) -> User | None:
		cleaned = phone.strip()
		result = await self.session.execute(
			select(User).where(User.phone == cleaned)
		)
		return result.scalar_one_or_none()

	async def get_by_email(self, email: str) -> User | None:
		result = await self.session.execute(
			select(User).where(func.lower(User.email) == email.strip().lower())
		)
		return result.scalar_one_or_none()

	async def get_by_google_sub(self, google_sub: str) -> User | None:
		result = await self.session.execute(
			select(User).where(User.google_sub == google_sub.strip())
		)
		return result.scalar_one_or_none()

	async def find_by_identifier(self, identifier: str) -> User | None:
		raw = identifier.strip()
		clean_lower = raw.lower()

		# 1. Exact username match
		user = await self.get_by_username(clean_lower)
		if user:
			return user

		# 2. Exact phone match
		user = await self.get_by_phone(raw)
		if user:
			return user

		# 3. Email match (if '@' in identifier)
		if "@" in clean_lower:
			user = await self.get_by_email(clean_lower)
			if user:
				return user

		# 4. Phone variants resolution against both phone column and username column
		variants = generate_phone_variants(raw)
		if variants:
			result = await self.session.execute(
				select(User).where(
					or_(
						User.phone.in_(variants),
						func.lower(User.username).in_([v.lower() for v in variants])
					)
				)
			)
			user = result.scalar_one_or_none()
			if user:
				return user

		# 5. Fallback for legacy domain usernames
		if "@" not in clean_lower:
			user = await self.get_by_username(f"{clean_lower}@guesthousemail.com")
		elif clean_lower.endswith("@guesthousemail.com"):
			user = await self.get_by_username(clean_lower.split("@")[0])

		return user

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
