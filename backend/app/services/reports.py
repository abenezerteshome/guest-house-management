from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.charge import Charge, ChargeType
from app.models.expense import Expense
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.room import Room, RoomStatus
from app.models.stay import Stay, StayStatus
from app.schemas.reports import (
	DailyReport,
	DaySummary,
	ExpenseAnalysisReport,
	ExpenseCategoryItem,
	IncomeAnalysisReport,
	MonthlyReport,
	PaymentMethodIncome,
	WeeklyReport,
)


def _to_utc_range(d: date) -> tuple[datetime, datetime]:
	start = datetime.combine(d, time.min, tzinfo=timezone.utc)
	end = datetime.combine(d, time.max, tzinfo=timezone.utc)
	return start, end


async def get_daily_report(session: AsyncSession, target_date: date | None = None) -> DailyReport:
	if target_date is None:
		target_date = datetime.now(timezone.utc).date()
	start_dt, end_dt = _to_utc_range(target_date)

	# 1. Income
	income_stmt = select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
		Payment.status == PaymentStatus.SUCCESS.value,
		Payment.created_at >= start_dt,
		Payment.created_at <= end_dt,
	)
	income_res = await session.execute(income_stmt)
	todays_income = Decimal(str(income_res.scalar() or "0.00"))

	# 2. Expenses
	expense_stmt = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
		Expense.expense_date >= start_dt,
		Expense.expense_date <= end_dt,
	)
	expense_res = await session.execute(expense_stmt)
	todays_expenses = Decimal(str(expense_res.scalar() or "0.00"))

	# 3. Room Status Counts
	rooms_stmt = select(Room.status, func.count(Room.id)).where(Room.is_active.is_(True)).group_by(Room.status)
	rooms_res = await session.execute(rooms_stmt)
	room_counts = {r[0]: r[1] for r in rooms_res.all()}

	# 4. Check-ins and Check-outs
	checkin_stmt = select(func.count(Stay.id)).where(
		Stay.check_in_at >= start_dt,
		Stay.check_in_at <= end_dt,
	)
	checkins = (await session.execute(checkin_stmt)).scalar() or 0

	checkout_stmt = select(func.count(Stay.id)).where(
		Stay.actual_checkout_at.is_not(None),
		Stay.actual_checkout_at >= start_dt,
		Stay.actual_checkout_at <= end_dt,
	)
	checkouts = (await session.execute(checkout_stmt)).scalar() or 0

	# 5. Penalties Total
	penalties_stmt = select(
		func.coalesce(func.sum(Charge.amount * Charge.quantity), Decimal("0.00"))
	).where(
		Charge.charge_type == ChargeType.LATE_CHECKOUT_PENALTY.value,
		Charge.charged_at >= start_dt,
		Charge.charged_at <= end_dt,
	)
	penalties_total = Decimal(str((await session.execute(penalties_stmt)).scalar() or "0.00"))

	# 6. Outstanding Credit (Total due - Total paid for active stays)
	active_stays_stmt = select(Stay.id).where(Stay.status == StayStatus.CHECKED_IN.value)
	active_stay_ids = (await session.execute(active_stays_stmt)).scalars().all()

	outstanding_credit = Decimal("0.00")
	for stay_id in active_stay_ids:
		charges_sum_stmt = select(func.coalesce(func.sum(Charge.amount * Charge.quantity), Decimal("0.00"))).where(Charge.stay_id == stay_id)
		paid_sum_stmt = select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(Payment.stay_id == stay_id, Payment.status == PaymentStatus.SUCCESS.value)
		stay_due = Decimal(str((await session.execute(charges_sum_stmt)).scalar() or "0.00"))
		stay_paid = Decimal(str((await session.execute(paid_sum_stmt)).scalar() or "0.00"))
		bal = stay_due - stay_paid
		if bal > 0:
			outstanding_credit += bal

	return DailyReport(
		date=target_date.isoformat(),
		todays_income=todays_income,
		todays_expenses=todays_expenses,
		net_income=todays_income - todays_expenses,
		occupied_rooms=room_counts.get(RoomStatus.OCCUPIED.value, 0),
		available_rooms=room_counts.get(RoomStatus.AVAILABLE.value, 0),
		expected_rooms=room_counts.get(RoomStatus.EXPECTED.value, 0),
		cleaning_rooms=room_counts.get(RoomStatus.CLEANING.value, 0),
		maintenance_rooms=room_counts.get(RoomStatus.MAINTENANCE.value, 0),
		check_ins_count=checkins,
		check_outs_count=checkouts,
		penalties_total=penalties_total,
		outstanding_credit=outstanding_credit,
	)


async def get_income_analysis(
	session: AsyncSession,
	*,
	period: str = "this_month",
	start_date: datetime | None = None,
	end_date: datetime | None = None,
) -> IncomeAnalysisReport:
	now = datetime.now(timezone.utc)
	if start_date is None or end_date is None:
		if period == "today":
			start_date, end_date = _to_utc_range(now.date())
		elif period == "this_week":
			monday = now.date() - timedelta(days=now.date().weekday())
			start_date = datetime.combine(monday, time.min, tzinfo=timezone.utc)
			end_date = datetime.combine(now.date(), time.max, tzinfo=timezone.utc)
		else:  # this_month
			first_day = now.date().replace(day=1)
			start_date = datetime.combine(first_day, time.min, tzinfo=timezone.utc)
			end_date = datetime.combine(now.date(), time.max, tzinfo=timezone.utc)

	stmt = (
		select(Payment.payment_method, func.coalesce(func.sum(Payment.amount), Decimal("0.00")), func.count(Payment.id))
		.where(
			Payment.status == PaymentStatus.SUCCESS.value,
			Payment.created_at >= start_date,
			Payment.created_at <= end_date,
		)
		.group_by(Payment.payment_method)
	)
	rows = (await session.execute(stmt)).all()
	amounts_by_method = {r[0]: (Decimal(str(r[1])), r[2]) for r in rows}

	all_methods = [
		PaymentMethod.CASH.value,
		PaymentMethod.TELEBIRR.value,
		PaymentMethod.CBE_BIRR.value,
		PaymentMethod.BANK_TRANSFER.value,
		PaymentMethod.CHAPA.value,
	]
	items = []
	total_income = Decimal("0.00")
	for m in all_methods:
		amt, cnt = amounts_by_method.get(m, (Decimal("0.00"), 0))
		items.append(PaymentMethodIncome(method=m, amount=amt, count=cnt))
		total_income += amt

	return IncomeAnalysisReport(
		period=period,
		start_date=start_date,
		end_date=end_date,
		by_method=items,
		total_income=total_income,
	)


async def get_expenses_analysis(
	session: AsyncSession,
	*,
	period: str = "this_month",
	start_date: datetime | None = None,
	end_date: datetime | None = None,
) -> ExpenseAnalysisReport:
	now = datetime.now(timezone.utc)
	if start_date is None or end_date is None:
		if period == "today":
			start_date, end_date = _to_utc_range(now.date())
		elif period == "this_week":
			monday = now.date() - timedelta(days=now.date().weekday())
			start_date = datetime.combine(monday, time.min, tzinfo=timezone.utc)
			end_date = datetime.combine(now.date(), time.max, tzinfo=timezone.utc)
		else:  # this_month
			first_day = now.date().replace(day=1)
			start_date = datetime.combine(first_day, time.min, tzinfo=timezone.utc)
			end_date = datetime.combine(now.date(), time.max, tzinfo=timezone.utc)

	stmt = (
		select(Expense.category, func.coalesce(func.sum(Expense.amount), Decimal("0.00")))
		.where(
			Expense.expense_date >= start_date,
			Expense.expense_date <= end_date,
		)
		.group_by(Expense.category)
		.order_by(func.sum(Expense.amount).desc())
	)
	rows = (await session.execute(stmt)).all()
	total_expenses = sum((Decimal(str(r[1])) for r in rows), Decimal("0.00"))

	items = []
	for r in rows:
		amt = Decimal(str(r[1]))
		pct = float((amt / total_expenses) * 100) if total_expenses > 0 else 0.0
		items.append(ExpenseCategoryItem(category=r[0], amount=amt, percentage=round(pct, 1)))

	return ExpenseAnalysisReport(
		period=period,
		start_date=start_date,
		end_date=end_date,
		by_category=items,
		total_expenses=total_expenses,
	)


async def get_weekly_report(session: AsyncSession, target_date: date | None = None) -> WeeklyReport:
	if target_date is None:
		target_date = datetime.now(timezone.utc).date()
	# Last 7 days including target_date
	start_date = target_date - timedelta(days=6)
	days: list[DaySummary] = []
	total_income = Decimal("0.00")
	total_expense = Decimal("0.00")

	for i in range(7):
		d = start_date + timedelta(days=i)
		s_dt, e_dt = _to_utc_range(d)
		inc_stmt = select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
			Payment.status == PaymentStatus.SUCCESS.value,
			Payment.created_at >= s_dt,
			Payment.created_at <= e_dt,
		)
		exp_stmt = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
			Expense.expense_date >= s_dt,
			Expense.expense_date <= e_dt,
		)
		inc = Decimal(str((await session.execute(inc_stmt)).scalar() or "0.00"))
		exp = Decimal(str((await session.execute(exp_stmt)).scalar() or "0.00"))
		total_income += inc
		total_expense += exp
		days.append(
			DaySummary(
				day=d.strftime("%a"),
				date=d.isoformat(),
				income=inc,
				expense=exp,
				net=inc - exp,
			)
		)

	return WeeklyReport(
		start_date=start_date.isoformat(),
		end_date=target_date.isoformat(),
		days=days,
		total_income=total_income,
		total_expense=total_expense,
		net_income=total_income - total_expense,
	)


async def get_monthly_report(session: AsyncSession, year: int | None = None, month: int | None = None) -> MonthlyReport:
	now = datetime.now(timezone.utc)
	if year is None:
		year = now.year
	if month is None:
		month = now.month

	first_day = date(year, month, 1)
	num_days = monthrange(year, month)[1]
	last_day = date(year, month, num_days)
	start_dt = datetime.combine(first_day, time.min, tzinfo=timezone.utc)
	end_dt = datetime.combine(last_day, time.max, tzinfo=timezone.utc)

	inc_stmt = select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
		Payment.status == PaymentStatus.SUCCESS.value,
		Payment.created_at >= start_dt,
		Payment.created_at <= end_dt,
	)
	exp_stmt = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
		Expense.expense_date >= start_dt,
		Expense.expense_date <= end_dt,
	)
	total_income = Decimal(str((await session.execute(inc_stmt)).scalar() or "0.00"))
	total_expenses = Decimal(str((await session.execute(exp_stmt)).scalar() or "0.00"))

	# Distinct guests
	guests_stmt = select(func.count(func.distinct(Stay.guest_id))).where(
		Stay.check_in_at <= end_dt,
		Stay.expected_checkout >= start_dt,
	)
	total_guests = (await session.execute(guests_stmt)).scalar() or 0

	# Penalties
	pen_stmt = select(func.coalesce(func.sum(Charge.amount * Charge.quantity), Decimal("0.00"))).where(
		Charge.charge_type == ChargeType.LATE_CHECKOUT_PENALTY.value,
		Charge.charged_at >= start_dt,
		Charge.charged_at <= end_dt,
	)
	total_penalties = Decimal(str((await session.execute(pen_stmt)).scalar() or "0.00"))

	# Total rooms
	total_rooms = (await session.execute(select(func.count(Room.id)).where(Room.is_active.is_(True)))).scalar() or 1
	occupied_nights_stmt = select(func.count(Stay.id)).where(
		Stay.check_in_at <= end_dt,
		Stay.expected_checkout >= start_dt,
	)
	occupied_stays = (await session.execute(occupied_nights_stmt)).scalar() or 0
	occupancy_rate = min(100.0, round(float(occupied_stays / (total_rooms * num_days)) * 100, 1))

	avg_daily_income = round(total_income / Decimal(num_days), 2)

	return MonthlyReport(
		month=first_day.strftime("%B %Y"),
		total_income=total_income,
		total_expenses=total_expenses,
		net_income=total_income - total_expenses,
		total_guests=total_guests,
		average_daily_income=avg_daily_income,
		total_credit=Decimal("0.00"),
		total_penalties=total_penalties,
		occupancy_rate=occupancy_rate,
	)
