from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.user import UserRole
from app.schemas.reports import (
	DailyReport,
	ExpenseAnalysisReport,
	IncomeAnalysisReport,
	MonthlyReport,
	WeeklyReport,
)
from app.services.reports import (
	get_daily_report,
	get_expenses_analysis,
	get_income_analysis,
	get_monthly_report,
	get_weekly_report,
)

router = APIRouter(prefix="/reports", tags=["reports"])
admin_user = Depends(require_role(UserRole.ADMIN))


@router.get("/daily", response_model=DailyReport, dependencies=[admin_user])
async def daily_report(
	target_date: date | None = Query(default=None),
	session: AsyncSession = Depends(get_db),
) -> DailyReport:
	return await get_daily_report(session, target_date=target_date)


@router.get("/income-analysis", response_model=IncomeAnalysisReport, dependencies=[admin_user])
async def income_analysis(
	period: str = Query(default="this_month"),
	start_date: datetime | None = Query(default=None),
	end_date: datetime | None = Query(default=None),
	session: AsyncSession = Depends(get_db),
) -> IncomeAnalysisReport:
	return await get_income_analysis(
		session, period=period, start_date=start_date, end_date=end_date
	)


@router.get("/expenses-analysis", response_model=ExpenseAnalysisReport, dependencies=[admin_user])
async def expenses_analysis(
	period: str = Query(default="this_month"),
	start_date: datetime | None = Query(default=None),
	end_date: datetime | None = Query(default=None),
	session: AsyncSession = Depends(get_db),
) -> ExpenseAnalysisReport:
	return await get_expenses_analysis(
		session, period=period, start_date=start_date, end_date=end_date
	)


@router.get("/weekly", response_model=WeeklyReport, dependencies=[admin_user])
async def weekly_report(
	target_date: date | None = Query(default=None),
	session: AsyncSession = Depends(get_db),
) -> WeeklyReport:
	return await get_weekly_report(session, target_date=target_date)


@router.get("/monthly", response_model=MonthlyReport, dependencies=[admin_user])
async def monthly_report(
	year: int | None = Query(default=None),
	month: int | None = Query(default=None),
	session: AsyncSession = Depends(get_db),
) -> MonthlyReport:
	return await get_monthly_report(session, year=year, month=month)
