from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.expense import Expense, ExpenseCategory, ExpensePaymentMethod
from app.repositories.expense import ExpenseRepository
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


class ExpenseNotFoundError(Exception):
	pass


async def get_expense(session: AsyncSession, expense_id: int, property_id: int | None = None) -> Expense:
	expense = await ExpenseRepository(session, property_id=property_id).get_by_id(expense_id)
	if expense is None:
		raise ExpenseNotFoundError("Expense not found")
	return expense


async def create_expense(
	session: AsyncSession,
	data: ExpenseCreate,
	*,
	user_id: int,
	property_id: int | None = None,
) -> Expense:
	expense_date = data.expense_date or datetime.now(timezone.utc)
	expense = Expense(
		property_id=property_id,
		category=data.category.value,
		reason=data.reason or data.description,
		description=data.description,
		amount=data.amount,
		payment_method=data.payment_method.value,
		expense_date=expense_date,
		recorded_by=user_id,
	)
	repo = ExpenseRepository(session, property_id=property_id)
	await repo.add(expense)

	session.add(
		AuditLog(
			property_id=property_id,
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


async def update_expense(
	session: AsyncSession,
	expense_id: int,
	data: ExpenseUpdate,
	*,
	user_id: int,
	property_id: int | None = None,
) -> Expense:
	expense = await get_expense(session, expense_id, property_id=property_id)

	if data.category is not None:
		expense.category = data.category.value
	if data.reason is not None:
		expense.reason = data.reason
	if data.description is not None:
		expense.description = data.description
	if data.amount is not None:
		expense.amount = data.amount
	if data.payment_method is not None:
		expense.payment_method = data.payment_method.value
	if data.expense_date is not None:
		expense.expense_date = data.expense_date

	session.add(
		AuditLog(
			property_id=expense.property_id,
			user_id=user_id,
			action="EXPENSE_UPDATED",
			entity_type="Expense",
			entity_id=expense.id,
			details=f'{{"amount": "{expense.amount}", "category": "{expense.category}"}}',
		)
	)
	await session.commit()
	await session.refresh(expense)
	return expense


async def delete_expense(
	session: AsyncSession,
	expense_id: int,
	*,
	user_id: int,
	property_id: int | None = None,
) -> None:
	expense = await get_expense(session, expense_id, property_id=property_id)
	repo = ExpenseRepository(session, property_id=property_id)

	session.add(
		AuditLog(
			property_id=expense.property_id,
			user_id=user_id,
			action="EXPENSE_DELETED",
			entity_type="Expense",
			entity_id=expense.id,
			details=f'{{"amount": "{expense.amount}", "category": "{expense.category}"}}',
		)
	)
	await repo.delete(expense)
	await session.commit()


async def list_expenses(
	session: AsyncSession,
	*,
	property_id: int | None = None,
	category: str | None = None,
	start_date: datetime | None = None,
	end_date: datetime | None = None,
) -> list[Expense]:
	return await ExpenseRepository(session, property_id=property_id).list(
		category=category, start_date=start_date, end_date=end_date
	)
