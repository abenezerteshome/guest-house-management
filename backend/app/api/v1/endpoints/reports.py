from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.reports import (
	DailyManifestReport,
	DailyReport,
	ExpenseAnalysisReport,
	IncomeAnalysisReport,
	MonthlyReport,
	WeeklyReport,
)
from app.services.reports import (
	get_daily_manifest,
	get_daily_report,
	get_expenses_analysis,
	get_income_analysis,
	get_monthly_report,
	get_weekly_report,
)

router = APIRouter(prefix="/reports", tags=["reports"])
admin_user = require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
operational_user = require_role(UserRole.ADMIN, UserRole.RECEPTION, UserRole.SUPER_ADMIN)


def _target_property_id(current_user: User, property_id: int | None) -> int | None:
	if current_user.role == UserRole.SUPER_ADMIN.value:
		return property_id
	return current_user.property_id


@router.get("/daily-manifest", response_model=DailyManifestReport)
async def daily_manifest(
	target_date: date | None = Query(default=None),
	property_id: int | None = Query(default=None),
	current_user: User = Depends(operational_user),
	session: AsyncSession = Depends(get_db),
) -> DailyManifestReport:
	prop_id = _target_property_id(current_user, property_id)
	return await get_daily_manifest(session, target_date=target_date, property_id=prop_id)


@router.get("/daily", response_model=DailyReport)
async def daily_report(
	target_date: date | None = Query(default=None),
	property_id: int | None = Query(default=None),
	current_user: User = Depends(admin_user),
	session: AsyncSession = Depends(get_db),
) -> DailyReport:
	prop_id = _target_property_id(current_user, property_id)
	return await get_daily_report(session, target_date=target_date, property_id=prop_id)


@router.get("/income-analysis", response_model=IncomeAnalysisReport)
async def income_analysis(
	period: str = Query(default="this_month"),
	start_date: datetime | None = Query(default=None),
	end_date: datetime | None = Query(default=None),
	property_id: int | None = Query(default=None),
	current_user: User = Depends(admin_user),
	session: AsyncSession = Depends(get_db),
) -> IncomeAnalysisReport:
	prop_id = _target_property_id(current_user, property_id)
	return await get_income_analysis(
		session, period=period, start_date=start_date, end_date=end_date, property_id=prop_id
	)


@router.get("/expenses-analysis", response_model=ExpenseAnalysisReport)
async def expenses_analysis(
	period: str = Query(default="this_month"),
	start_date: datetime | None = Query(default=None),
	end_date: datetime | None = Query(default=None),
	property_id: int | None = Query(default=None),
	current_user: User = Depends(admin_user),
	session: AsyncSession = Depends(get_db),
) -> ExpenseAnalysisReport:
	prop_id = _target_property_id(current_user, property_id)
	return await get_expenses_analysis(
		session, period=period, start_date=start_date, end_date=end_date, property_id=prop_id
	)


@router.get("/weekly", response_model=WeeklyReport)
async def weekly_report(
	target_date: date | None = Query(default=None),
	property_id: int | None = Query(default=None),
	current_user: User = Depends(admin_user),
	session: AsyncSession = Depends(get_db),
) -> WeeklyReport:
	prop_id = _target_property_id(current_user, property_id)
	return await get_weekly_report(session, target_date=target_date, property_id=prop_id)


@router.get("/monthly", response_model=MonthlyReport)
async def monthly_report(
	year: int | None = Query(default=None),
	month: int | None = Query(default=None),
	property_id: int | None = Query(default=None),
	current_user: User = Depends(admin_user),
	session: AsyncSession = Depends(get_db),
) -> MonthlyReport:
	prop_id = _target_property_id(current_user, property_id)
	return await get_monthly_report(session, year=year, month=month, property_id=prop_id)
