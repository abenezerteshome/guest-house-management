from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment, PaymentStatus


class PaymentRepository:
	def __init__(self, session: AsyncSession) -> None:
		self.session = session

	async def get_by_id(self, payment_id: int) -> Payment | None:
		return await self.session.get(Payment, payment_id)

	async def list_for_stay(self, stay_id: int) -> list[Payment]:
		result = await self.session.execute(
			select(Payment).where(Payment.stay_id == stay_id).order_by(Payment.created_at, Payment.id)
		)
		return list(result.scalars().all())

	async def successful_total_for_stay(self, stay_id: int) -> Decimal:
		result = await self.session.execute(
			select(func.coalesce(func.sum(Payment.amount), 0)).where(
				Payment.stay_id == stay_id, Payment.status == PaymentStatus.SUCCESS.value
			)
		)
		return Decimal(str(result.scalar_one())).quantize(Decimal("0.01"))

	async def add(self, payment: Payment) -> Payment:
		self.session.add(payment)
		await self.session.flush()
		return payment