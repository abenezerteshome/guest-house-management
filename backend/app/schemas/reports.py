from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class DailyReport(BaseModel):
	date: str
	todays_income: Decimal
	todays_expenses: Decimal
	net_income: Decimal
	occupied_rooms: int
	available_rooms: int
	expected_rooms: int
	cleaning_rooms: int
	maintenance_rooms: int
	check_ins_count: int
	check_outs_count: int
	penalties_total: Decimal
	outstanding_credit: Decimal


class PaymentMethodIncome(BaseModel):
	method: str
	amount: Decimal
	count: int


class IncomeAnalysisReport(BaseModel):
	period: str
	start_date: datetime
	end_date: datetime
	by_method: list[PaymentMethodIncome]
	total_income: Decimal


class ExpenseCategoryItem(BaseModel):
	category: str
	amount: Decimal
	percentage: float


class ExpenseAnalysisReport(BaseModel):
	period: str
	start_date: datetime
	end_date: datetime
	by_category: list[ExpenseCategoryItem]
	total_expenses: Decimal


class DaySummary(BaseModel):
	day: str
	date: str
	income: Decimal
	expense: Decimal
	net: Decimal


class WeeklyReport(BaseModel):
	start_date: str
	end_date: str
	days: list[DaySummary]
	total_income: Decimal
	total_expense: Decimal
	net_income: Decimal


class MonthlyReport(BaseModel):
	month: str
	total_income: Decimal
	total_expenses: Decimal
	net_income: Decimal
	total_guests: int
	average_daily_income: Decimal
	total_credit: Decimal
	total_penalties: Decimal
	occupancy_rate: float
