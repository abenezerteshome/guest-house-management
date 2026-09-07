from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.charge import Charge


class ChargeRepository:
	def __init__(self, session: AsyncSession) -> None:
		self.session = session

	async def list_for_stay(self, stay_id: int) -> list[Charge]:
		result = await self.session.execute(
			select(Charge).where(Charge.stay_id == stay_id).order_by(Charge.charged_at, Charge.id)
		)
		return list(result.scalars().all())

	async def total_for_stay(self, stay_id: int) -> Decimal:
		result = await self.session.execute(
			select(func.coalesce(func.sum(Charge.amount * Charge.quantity), 0)).where(Charge.stay_id == stay_id)
		)
		return Decimal(str(result.scalar_one())).quantize(Decimal("0.01"))

	async def add(self, charge: Charge) -> Charge:
		self.session.add(charge)
		await self.session.flush()
		return charge