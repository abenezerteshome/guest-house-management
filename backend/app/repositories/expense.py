from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense


class ExpenseRepository:
	def __init__(self, session: AsyncSession, property_id: int | None = None) -> None:
		self.session = session
		self.property_id = property_id

	async def add(self, expense: Expense) -> Expense:
		if self.property_id is not None and not expense.property_id:
			expense.property_id = self.property_id
		self.session.add(expense)
		await self.session.flush()
		return expense

	async def get_by_id(self, expense_id: int) -> Expense | None:
		expense = await self.session.get(Expense, expense_id)
		if expense and self.property_id is not None and expense.property_id != self.property_id:
			return None
		return expense

	async def delete(self, expense: Expense) -> None:
		await self.session.delete(expense)
		await self.session.flush()

	async def list(
		self,
		category: str | None = None,
		start_date: datetime | None = None,
		end_date: datetime | None = None,
	) -> list[Expense]:
		stmt = select(Expense)
		if self.property_id is not None:
			stmt = stmt.where(Expense.property_id == self.property_id)
		if category:
			stmt = stmt.where(Expense.category == category)
		if start_date:
			stmt = stmt.where(Expense.expense_date >= start_date)
		if end_date:
			stmt = stmt.where(Expense.expense_date <= end_date)
		stmt = stmt.order_by(Expense.expense_date.desc(), Expense.id.desc())
		result = await self.session.execute(stmt)
		return list(result.scalars().all())

	async def total_for_range(
		self, start_date: datetime | None = None, end_date: datetime | None = None
	) -> Decimal:
		stmt = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00")))
		if self.property_id is not None:
			stmt = stmt.where(Expense.property_id == self.property_id)
		if start_date:
			stmt = stmt.where(Expense.expense_date >= start_date)
		if end_date:
			stmt = stmt.where(Expense.expense_date <= end_date)
		result = await self.session.execute(stmt)
		return Decimal(str(result.scalar() or "0.00"))

	async def category_breakdown(
		self, start_date: datetime | None = None, end_date: datetime | None = None
	) -> list[tuple[str, Decimal]]:
		stmt = (
			select(Expense.category, func.coalesce(func.sum(Expense.amount), Decimal("0.00")))
			.group_by(Expense.category)
			.order_by(func.sum(Expense.amount).desc())
		)
		if self.property_id is not None:
			stmt = stmt.where(Expense.property_id == self.property_id)
		if start_date:
			stmt = stmt.where(Expense.expense_date >= start_date)
		if end_date:
			stmt = stmt.where(Expense.expense_date <= end_date)
		result = await self.session.execute(stmt)
		return [(r[0], Decimal(str(r[1]))) for r in result.all()]
