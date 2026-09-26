from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.expense import ExpenseCreate, ExpenseRead, ExpenseUpdate
from app.services.expense import (
	ExpenseNotFoundError,
	create_expense,
	delete_expense,
	list_expenses,
	update_expense,
)

router = APIRouter(prefix="/expenses", tags=["expenses"])
operational_user = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION))


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
async def record_expense(
	data: ExpenseCreate,
	session: AsyncSession = Depends(get_db),
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)),
) -> ExpenseRead:
	expense = await create_expense(session, data, user_id=current_user.id, property_id=current_user.property_id)
	return ExpenseRead.model_validate(expense)


@router.get("", response_model=list[ExpenseRead])
async def get_expenses(
	category: str | None = Query(default=None),
	start_date: datetime | None = Query(default=None),
	end_date: datetime | None = Query(default=None),
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)),
	session: AsyncSession = Depends(get_db),
) -> list[ExpenseRead]:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	expenses = await list_expenses(
		session, property_id=prop_id, category=category, start_date=start_date, end_date=end_date
	)
	return [ExpenseRead.model_validate(e) for e in expenses]


@router.put("/{expense_id}", response_model=ExpenseRead)
async def edit_expense(
	expense_id: int,
	data: ExpenseUpdate,
	session: AsyncSession = Depends(get_db),
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)),
) -> ExpenseRead:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	try:
		expense = await update_expense(session, expense_id=expense_id, data=data, user_id=current_user.id, property_id=prop_id)
		return ExpenseRead.model_validate(expense)
	except ExpenseNotFoundError as exc:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_expense(
	expense_id: int,
	session: AsyncSession = Depends(get_db),
	current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)),
) -> None:
	prop_id = None if current_user.role == UserRole.SUPER_ADMIN else current_user.property_id
	try:
		await delete_expense(session, expense_id=expense_id, user_id=current_user.id, property_id=prop_id)
	except ExpenseNotFoundError as exc:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

