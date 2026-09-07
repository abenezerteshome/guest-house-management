from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.expense import Expense, ExpenseCategory, ExpensePaymentMethod
from app.repositories.expense import ExpenseRepository
from app.schemas.expense import ExpenseCreate


async def create_expense(
	session: AsyncSession,
	data: ExpenseCreate,
	*,
	user_id: int,
) -> Expense:
	expense_date = data.expense_date or datetime.now(timezone.utc)
	expense = Expense(
		category=data.category.value,
		description=data.description,
		amount=data.amount,
		payment_method=data.payment_method.value,
		expense_date=expense_date,
		recorded_by=user_id,
	)
	repo = ExpenseRepository(session)
	await repo.add(expense)

	session.add(
		AuditLog(
			user_id=user_id,
			action="EXPENSE_CREATED",
			entity_type="Expense",
			entity_id=expense.id,
			details=f'{{"amount": "{expense.amount}", "category": "{expense.category}"}}',
		)
	)
	await session.commit()
	await session.refresh(expense)
	return expense


async def list_expenses(
	session: AsyncSession,
	*,
	category: str | None = None,
	start_date: datetime | None = None,
	end_date: datetime | None = None,
) -> list[Expense]:
	return await ExpenseRepository(session).list(
		category=category, start_date=start_date, end_date=end_date
	)
