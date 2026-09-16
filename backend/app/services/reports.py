from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.charge import Charge, ChargeType
from app.models.expense import Expense
from app.models.guest import Guest
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.reservation import Reservation, ReservationStatus
from app.models.room import Room, RoomStatus
from app.models.stay import Stay, StayStatus
from app.schemas.reports import (
	DailyManifestItem,
	DailyManifestReport,
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
		maintenance_rooms=0,
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
		PaymentMethod.OTHER.value,
		PaymentMethod.CREDIT.value,
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
	is_all_time = (year == 0 or month == 0)

	if is_all_time:
		start_dt = datetime(2020, 1, 1, tzinfo=timezone.utc)
		end_dt = now
		month_title = "Total Statement (All Time)"
		num_days = max(1, (now.date() - date(2025, 1, 1)).days)
	else:
		if year is None:
			year = now.year
		if month is None:
			month = now.month
		first_day = date(year, month, 1)
		num_days = monthrange(year, month)[1]
		last_day = date(year, month, num_days)
		start_dt = datetime.combine(first_day, time.min, tzinfo=timezone.utc)
		end_dt = datetime.combine(last_day, time.max, tzinfo=timezone.utc)
		month_title = first_day.strftime("%B %Y")

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

	# Daily breakdown
	daily_inc_stmt = (
		select(func.date(Payment.created_at), func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
		.where(
			Payment.status == PaymentStatus.SUCCESS.value,
			Payment.created_at >= start_dt,
			Payment.created_at <= end_dt,
		)
		.group_by(func.date(Payment.created_at))
	)
	inc_rows = (await session.execute(daily_inc_stmt)).all()
	inc_by_date = {str(r[0]): Decimal(str(r[1])) for r in inc_rows}

	daily_exp_stmt = (
		select(func.date(Expense.expense_date), func.coalesce(func.sum(Expense.amount), Decimal("0.00")))
		.where(
			Expense.expense_date >= start_dt,
			Expense.expense_date <= end_dt,
		)
		.group_by(func.date(Expense.expense_date))
	)
	exp_rows = (await session.execute(daily_exp_stmt)).all()
	exp_by_date = {str(r[0]): Decimal(str(r[1])) for r in exp_rows}

	days: list[DaySummary] = []
	if is_all_time:
		all_dates = sorted(set(inc_by_date.keys()) | set(exp_by_date.keys()), reverse=True)
		for d_str in all_dates:
			inc = inc_by_date.get(d_str, Decimal("0.00"))
			exp = exp_by_date.get(d_str, Decimal("0.00"))
			d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
			days.append(
				DaySummary(
					day=d_obj.strftime("%a"),
					date=d_str,
					income=inc,
					expense=exp,
					net=inc - exp,
				)
			)
	else:
		for day_num in range(num_days, 0, -1):
			d = date(year, month, day_num)
			d_str = d.isoformat()
			inc = inc_by_date.get(d_str, Decimal("0.00"))
			exp = exp_by_date.get(d_str, Decimal("0.00"))
			days.append(
				DaySummary(
					day=d.strftime("%a"),
					date=d_str,
					income=inc,
					expense=exp,
					net=inc - exp,
				)
			)

	return MonthlyReport(
		month=month_title,
		total_income=total_income,
		total_expenses=total_expenses,
		net_income=total_income - total_expenses,
		total_guests=total_guests,
		average_daily_income=avg_daily_income,
		total_credit=Decimal("0.00"),
		total_penalties=total_penalties,
		occupancy_rate=occupancy_rate,
		days=days,
	)


async def get_daily_manifest(
	session: AsyncSession, target_date: date | None = None
) -> DailyManifestReport:
	if target_date is None:
		target_date = datetime.now(timezone.utc).date()
	start_dt, end_dt = _to_utc_range(target_date)

	items: list[DailyManifestItem] = []

	# 1. Stays that checked in today
	checkin_stmt = (
		select(Stay, Guest, Room)
		.join(Guest, Stay.guest_id == Guest.id)
		.join(Room, Stay.room_id == Room.id)
		.where(
			Stay.status != StayStatus.VOIDED.value,
			Stay.check_in_at >= start_dt,
			Stay.check_in_at <= end_dt,
		)
		.order_by(Stay.check_in_at.desc())
	)
	checkin_rows = (await session.execute(checkin_stmt)).all()

	# 2. Stays that checked out today
	checkout_stmt = (
		select(Stay, Guest, Room)
		.join(Guest, Stay.guest_id == Guest.id)
		.join(Room, Stay.room_id == Room.id)
		.where(
			Stay.status != StayStatus.VOIDED.value,
			Stay.actual_checkout_at.is_not(None),
			Stay.actual_checkout_at >= start_dt,
			Stay.actual_checkout_at <= end_dt,
		)
		.order_by(Stay.actual_checkout_at.desc())
	)
	checkout_rows = (await session.execute(checkout_stmt)).all()

	# Query payments and charges for all retrieved stays
	stay_ids = list({row[0].id for row in checkin_rows} | {row[0].id for row in checkout_rows})
	stay_payments: dict[int, Decimal] = {}
	stay_charges: dict[int, Decimal] = {}

	if stay_ids:
		pmt_stmt = (
			select(Payment.stay_id, func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
			.where(
				Payment.stay_id.in_(stay_ids),
				Payment.status == PaymentStatus.SUCCESS.value,
			)
			.group_by(Payment.stay_id)
		)
		pmt_res = await session.execute(pmt_stmt)
		stay_payments = {r[0]: Decimal(str(r[1])) for r in pmt_res.all()}

		chg_stmt = (
			select(
				Charge.stay_id,
				func.coalesce(func.sum(Charge.amount * Charge.quantity), Decimal("0.00")),
			)
			.where(Charge.stay_id.in_(stay_ids))
			.group_by(Charge.stay_id)
		)
		chg_res = await session.execute(chg_stmt)
		stay_charges = {r[0]: Decimal(str(r[1])) for r in chg_res.all()}

	for stay, guest, room in checkin_rows:
		checkout_target = stay.actual_checkout_at or stay.expected_checkout
		days = max(1, (checkout_target.date() - stay.check_in_at.date()).days) if checkout_target else 1
		paid = stay_payments.get(stay.id, Decimal("0.00"))
		expected = stay_charges.get(stay.id, Decimal("0.00"))
		if expected == Decimal("0.00"):
			expected = Decimal(str(room.price or 0)) * Decimal(days)

		items.append(
			DailyManifestItem(
				id=f"stay-in-{stay.id}",
				activity_type="CHECKED_IN",
				guest_id=guest.id,
				guest_name=guest.full_name,
				guest_phone=guest.phone,
				guest_id_number=guest.id_number,
				room_id=room.id,
				room_number=room.room_number,
				room_type=room.room_type,
				days_count=days,
				amount_paid=paid,
				expected_amount=expected,
				check_in_date=stay.check_in_at,
				checkout_date=stay.actual_checkout_at or stay.expected_checkout,
				status=stay.status,
				notes=stay.notes,
			)
		)

	for stay, guest, room in checkout_rows:
		checkout_target = stay.actual_checkout_at or stay.expected_checkout
		days = max(1, (checkout_target.date() - stay.check_in_at.date()).days) if checkout_target else 1
		paid = stay_payments.get(stay.id, Decimal("0.00"))
		expected = stay_charges.get(stay.id, Decimal("0.00"))
		if expected == Decimal("0.00"):
			expected = Decimal(str(room.price or 0)) * Decimal(days)

		items.append(
			DailyManifestItem(
				id=f"stay-out-{stay.id}",
				activity_type="CHECKED_OUT",
				guest_id=guest.id,
				guest_name=guest.full_name,
				guest_phone=guest.phone,
				guest_id_number=guest.id_number,
				room_id=room.id,
				room_number=room.room_number,
				room_type=room.room_type,
				days_count=days,
				amount_paid=paid,
				expected_amount=expected,
				check_in_date=stay.check_in_at,
				checkout_date=stay.actual_checkout_at,
				status=stay.status,
				notes=stay.notes,
			)
		)

	# 3. Reservations expected or active today that haven't checked in yet
	res_stmt = (
		select(Reservation, Guest, Room)
		.join(Guest, Reservation.guest_id == Guest.id)
		.join(Room, Reservation.room_id == Room.id)
		.where(
			Reservation.status == ReservationStatus.RESERVED.value,
			Reservation.expected_arrival <= end_dt,
		)
		.order_by(Reservation.expected_arrival.asc())
	)
	res_rows = (await session.execute(res_stmt)).all()

	for res, guest, room in res_rows:
		days = max(1, (res.expected_checkout.date() - res.expected_arrival.date()).days)
		expected = (
			res.expected_amount
			if res.expected_amount > 0
			else (Decimal(str(room.price or 0)) * Decimal(days))
		)

		items.append(
			DailyManifestItem(
				id=f"res-{res.id}",
				activity_type="RESERVED",
				guest_id=guest.id,
				guest_name=guest.full_name,
				guest_phone=guest.phone,
				guest_id_number=guest.id_number,
				room_id=room.id,
				room_number=room.room_number,
				room_type=room.room_type,
				days_count=days,
				amount_paid=Decimal("0.00"),
				expected_amount=expected,
				check_in_date=res.expected_arrival,
				checkout_date=res.expected_checkout,
				status=res.status,
				notes=res.notes or res.reason,
			)
		)

	checked_in_count = len(checkin_rows)
	checked_out_count = len(checkout_rows)
	reserved_count = len(res_rows)
	total_guests_count = len(items)
	total_amount_paid = sum(stay_payments.values(), Decimal("0.00"))

	return DailyManifestReport(
		target_date=target_date.isoformat(),
		total_guests_count=total_guests_count,
		checked_in_count=checked_in_count,
		checked_out_count=checked_out_count,
		reserved_count=reserved_count,
		total_amount_paid=total_amount_paid,
		items=items,
	)
