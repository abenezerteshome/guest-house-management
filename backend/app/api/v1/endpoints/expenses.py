from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.expense import ExpenseCreate, ExpenseRead
from app.services.expense import create_expense, list_expenses

router = APIRouter(prefix="/expenses", tags=["expenses"])
operational_user = Depends(require_role(UserRole.ADMIN, UserRole.RECEPTION))


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED, dependencies=[operational_user])
async def record_expense(
	data: ExpenseCreate,
	session: AsyncSession = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> ExpenseRead:
	expense = await create_expense(session, data, user_id=current_user.id)
	return ExpenseRead.model_validate(expense)


@router.get("", response_model=list[ExpenseRead], dependencies=[operational_user])
async def get_expenses(
	category: str | None = Query(default=None),
	start_date: datetime | None = Query(default=None),
	end_date: datetime | None = Query(default=None),
	session: AsyncSession = Depends(get_db),
) -> list[ExpenseRead]:
	expenses = await list_expenses(
		session, category=category, start_date=start_date, end_date=end_date
	)
	return [ExpenseRead.model_validate(e) for e in expenses]
