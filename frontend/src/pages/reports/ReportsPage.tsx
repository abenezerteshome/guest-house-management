import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  Calendar,
  CircleDollarSign,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Wallet,
  Building,
  Layers,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { KpiCard } from '../../components/common/KpiCard'
import {
  getDailyReport,
  getIncomeAnalysis,
  getExpensesAnalysis,
  getWeeklyReport,
  getMonthlyReport,
} from '../../api/reports'
import type {
  DailyReport,
  IncomeAnalysisReport,
  ExpenseAnalysisReport,
  WeeklyReport,
  MonthlyReport,
} from '../../types/api'

type StatementMetric =
  | 'GROSS_INCOME'
  | 'DAILY_REVENUE'
  | 'NET_INCOME'
  | 'EXPENSE'
  | 'NET_CASHFLOW'
  | 'ALL'

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'income' | 'expenses' | 'weekly' | 'monthly'>('monthly')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [_loading, setLoading] = useState(true)

  // Total Statement states
  const [statementPeriod, setStatementPeriod] = useState<'month' | 'all'>('month')
  const [statementMonth, setStatementMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [statementMetric, setStatementMetric] = useState<StatementMetric>('GROSS_INCOME')

  // Report states
  const [dailyData, setDailyData] = useState<DailyReport | null>(null)
  const [incomeData, setIncomeData] = useState<IncomeAnalysisReport | null>(null)
  const [expenseData, setExpenseData] = useState<ExpenseAnalysisReport | null>(null)
  const [weeklyData, setWeeklyData] = useState<WeeklyReport | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyReport | null>(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'daily') {
        const data = await getDailyReport(selectedDate)
        setDailyData(data)
      } else if (activeTab === 'income') {
        const data = await getIncomeAnalysis({ period: 'all' })
        setIncomeData(data)
      } else if (activeTab === 'expenses') {
        const data = await getExpensesAnalysis({ period: 'all' })
        setExpenseData(data)
      } else if (activeTab === 'weekly') {
        const data = await getWeeklyReport(selectedDate)
        setWeeklyData(data)
      } else if (activeTab === 'monthly') {
        if (statementPeriod === 'all') {
          const data = await getMonthlyReport(0, 0)
          setMonthlyData(data)
        } else {
          const [y, m] = statementMonth.split('-').map(Number)
          const data = await getMonthlyReport(y, m)
          setMonthlyData(data)
        }
      }
    } catch (err) {
      console.error('Failed to load report:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedDate, statementPeriod, statementMonth])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'Cash',
    TELEBIRR: 'Telebirr',
    CBE_BIRR: 'CBE Birr',
    BANK_TRANSFER: 'Bank Transfer',
    OTHER: 'Other (Banks)',
    CREDIT: 'Credit / Ledger',
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial & Operations Intelligence"
        subtitle="Daily performance, revenue breakdown by payment channel, operational expense audits, and occupancy reports."
        action={
          activeTab === 'daily' ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
            />
          ) : activeTab === 'monthly' ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setStatementPeriod('month')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    statementPeriod === 'month'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  By Month
                </button>
                <button
                  type="button"
                  onClick={() => setStatementPeriod('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    statementPeriod === 'all'
                      ? 'bg-white text-[#FF385C] shadow-xs font-bold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  All-Time Total
                </button>
              </div>

              {statementPeriod === 'month' && (
                <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl px-3 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="month"
                    value={statementMonth}
                    onChange={(e) => setStatementMonth(e.target.value)}
                    className="text-xs text-neutral-800 bg-transparent focus:outline-none font-medium cursor-pointer"
                  />
                </div>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 space-x-1">
        {[
          { id: 'monthly', label: 'Total Statement', icon: FileSpreadsheet },
          { id: 'daily', label: 'Daily Flash Report', icon: Calendar },
          { id: 'weekly', label: 'Weekly Summary', icon: BarChart3 },
          { id: 'income', label: 'Income by Payment Method', icon: CircleDollarSign },
          { id: 'expenses', label: 'Expense Distribution', icon: TrendingDown },
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
                active
                  ? 'border-[#FF385C] text-[#FF385C]'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB 1: DAILY FLASH REPORT */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {dailyData && (
            <>
              {/* Daily KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  title="Net Cashflow"
                  value={`${Number(dailyData.net_income).toLocaleString()} ETB`}
                  subtitle="Revenue minus operational expenses"
                  icon={<Wallet className="w-5 h-5" />}
                  tone={Number(dailyData.net_income) >= 0 ? 'success' : 'danger'}
                />
                <KpiCard
                  title="Daily Revenue"
                  value={`${Number(dailyData.todays_income).toLocaleString()} ETB`}
                  subtitle="Guest settlements collected"
                  icon={<TrendingUp className="w-5 h-5" />}
                  tone="success"
                />
                <KpiCard
                  title="Daily Expenses"
                  value={`${Number(dailyData.todays_expenses).toLocaleString()} ETB`}
                  subtitle="Operational costs logged today"
                  icon={<TrendingDown className="w-5 h-5" />}
                  tone="neutral"
                />
                <KpiCard
                  title="Occupied Rooms"
                  value={`${dailyData.occupied_rooms} Rooms`}
                  subtitle={`${dailyData.available_rooms} available for check-in`}
                  icon={<Building className="w-5 h-5" />}
                  tone="accent"
                />
              </div>

              {/* Operational Activity Glance */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      Check-Ins Today
                    </span>
                    <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      {dailyData.check_ins_count}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-neutral-900 mt-2">
                    {dailyData.check_ins_count} Guests
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">Checked in during this date</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      Check-Outs Completed
                    </span>
                    <span className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs">
                      {dailyData.check_outs_count}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-neutral-900 mt-2">
                    {dailyData.check_outs_count} Rooms
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">Vacated & ready for housekeeping</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      Late Checkout Penalties
                    </span>
                    <span className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                      ETB
                    </span>
                  </div>
                  <p className="text-xl font-bold text-rose-600 mt-2">
                    {Number(dailyData.penalties_total).toLocaleString()} ETB
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">Automated 4:00 AM penalty charges</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: INCOME BY PAYMENT METHOD */}
      {activeTab === 'income' && incomeData && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-neutral-900 text-white flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Total Gross Collections
              </p>
              <h2 className="text-3xl font-extrabold mt-1">
                {Number(incomeData.total_income).toLocaleString()} ETB
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-400">Payment Channels Active</span>
              <p className="text-lg font-bold">{incomeData.by_method.length} Methods</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incomeData.by_method.map((item) => {
              const numAmt = Number(item.amount)
              const total = Number(incomeData.total_income) || 1
              const pct = Math.round((numAmt / total) * 100)

              return (
                <div
                  key={item.method}
                  className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-neutral-900">
                        {paymentMethodLabels[item.method] || item.method}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FF385C]/10 text-[#FF385C]">
                        {pct}%
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900">
                      {numAmt.toLocaleString()} ETB
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      {item.count} successful transactions
                    </p>
                  </div>

                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden mt-4">
                    <div
                      className="bg-[#FF385C] h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSE DISTRIBUTION */}
      {activeTab === 'expenses' && expenseData && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Total Operational Expenses
              </p>
              <h2 className="text-3xl font-extrabold text-neutral-900 mt-1">
                {Number(expenseData.total_expenses).toLocaleString()} ETB
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-500">Cost Centers</span>
              <p className="text-lg font-bold text-neutral-900">{expenseData.by_category.length} Categories</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expenseData.by_category.map((item) => (
              <div
                key={item.category}
                className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-neutral-900">{item.category}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      {item.percentage}%
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900">
                    {Number(item.amount).toLocaleString()} ETB
                  </h3>
                </div>

                <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden mt-4">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: WEEKLY SUMMARY */}
      {activeTab === 'weekly' && weeklyData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              title="7-Day Net Cashflow"
              value={`${Number(weeklyData.net_income).toLocaleString()} ETB`}
              subtitle={`${weeklyData.start_date} to ${weeklyData.end_date}`}
              icon={<Wallet className="w-5 h-5" />}
              tone={Number(weeklyData.net_income) >= 0 ? 'success' : 'danger'}
            />
            <KpiCard
              title="7-Day Revenue"
              value={`${Number(weeklyData.total_income).toLocaleString()} ETB`}
              subtitle="Gross income collected"
              icon={<TrendingUp className="w-5 h-5" />}
              tone="success"
            />
            <KpiCard
              title="7-Day Expenses"
              value={`${Number(weeklyData.total_expense).toLocaleString()} ETB`}
              subtitle="Operational disbursements"
              icon={<TrendingDown className="w-5 h-5" />}
              tone="neutral"
            />
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-neutral-900 mb-4">Daily Breakdown This Week</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Day / Date</th>
                    <th className="py-2.5 px-3">Revenue (ETB)</th>
                    <th className="py-2.5 px-3">Expenses (ETB)</th>
                    <th className="py-2.5 px-3">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {weeklyData.days.map((d) => (
                    <tr key={d.date} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3 font-semibold text-neutral-800">
                        {d.day} ({d.date})
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600">
                        {Number(d.income).toLocaleString()} ETB
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700">
                        {Number(d.expense).toLocaleString()} ETB
                      </td>
                      <td className="py-2.5 px-3 font-bold text-neutral-900">
                        {Number(d.net).toLocaleString()} ETB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TOTAL STATEMENT */}
      {activeTab === 'monthly' && monthlyData && (
        <div className="space-y-6">
          {/* Metric Filter Toolbar */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Filter Statement by Financial Metric
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                    Default: Gross Income
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Isolate key financial dimensions to audit revenue, expenses, and cashflow for{' '}
                  <span className="font-semibold text-neutral-800">{monthlyData.month}</span>.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'GROSS_INCOME', label: 'Gross Income', badge: 'Default', icon: TrendingUp },
                  { id: 'DAILY_REVENUE', label: 'Daily Revenue', icon: CircleDollarSign },
                  { id: 'NET_INCOME', label: 'Net Income', icon: Wallet },
                  { id: 'EXPENSE', label: 'Expense', icon: TrendingDown },
                  { id: 'NET_CASHFLOW', label: 'Net Cashflow', icon: Building },
                  { id: 'ALL', label: 'All Metrics', icon: Layers },
                ].map((item) => {
                  const isSelected = statementMetric === item.id
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatementMetric(item.id as StatementMetric)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-[#FF385C] text-white shadow-xs'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                      {item.badge && !isSelected && (
                        <span className="text-[9px] font-bold bg-neutral-200 text-neutral-600 px-1.5 py-0.2 rounded">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Active Metric Spotlight Banner */}
          <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-2xl p-5 text-white shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-400/30">
                    {statementMetric === 'GROSS_INCOME' && 'Default Metric: Gross Income'}
                    {statementMetric === 'DAILY_REVENUE' && 'Metric: Daily Revenue'}
                    {statementMetric === 'NET_INCOME' && 'Metric: Net Income'}
                    {statementMetric === 'EXPENSE' && 'Metric: Operational Expenses'}
                    {statementMetric === 'NET_CASHFLOW' && 'Metric: Net Cashflow'}
                    {statementMetric === 'ALL' && 'Metric: All Financial Dimensions'}
                  </span>
                  <span className="text-xs text-neutral-400">Statement: {monthlyData.month}</span>
                </div>

                <div className="mt-2">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {statementMetric === 'GROSS_INCOME' && `${Number(monthlyData.total_income).toLocaleString()} ETB`}
                    {statementMetric === 'DAILY_REVENUE' && `${Number(monthlyData.average_daily_income).toLocaleString()} ETB / day`}
                    {statementMetric === 'NET_INCOME' && `${Number(monthlyData.net_income).toLocaleString()} ETB`}
                    {statementMetric === 'EXPENSE' && `${Number(monthlyData.total_expenses).toLocaleString()} ETB`}
                    {statementMetric === 'NET_CASHFLOW' && `${Number(monthlyData.net_income).toLocaleString()} ETB`}
                    {statementMetric === 'ALL' && `${Number(monthlyData.total_income).toLocaleString()} ETB Gross`}
                  </h2>
                  <p className="text-xs text-neutral-300 mt-1 max-w-2xl">
                    {statementMetric === 'GROSS_INCOME' &&
                      'Total gross earnings accumulated from all guest reservations, stay extensions, and front-desk settlements before operational deductions.'}
                    {statementMetric === 'DAILY_REVENUE' &&
                      'Average daily revenue yield generated across all rooms and guest collections within this statement period.'}
                    {statementMetric === 'NET_INCOME' &&
                      'Net profit remaining after deducting total operational costs from gross revenues.'}
                    {statementMetric === 'EXPENSE' &&
                      'Cumulative operational expenses incurred for guest supplies, food & beverages, utilities, and facility upkeep.'}
                    {statementMetric === 'NET_CASHFLOW' &&
                      'Net liquid cash retained from guest payments collected minus all logged operational expenditures.'}
                    {statementMetric === 'ALL' &&
                      'Consolidated statement overview auditing gross income, daily revenue velocity, operating expenses, and cashflow.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 text-xs border-t md:border-t-0 md:border-l border-neutral-700 pt-3 md:pt-0 md:pl-5">
                <div className="text-neutral-300">
                  <span className="text-neutral-400">Occupancy: </span>
                  <span className="font-bold text-white">{monthlyData.occupancy_rate}%</span>
                </div>
                <div className="text-neutral-300">
                  <span className="text-neutral-400">Guests Hosted: </span>
                  <span className="font-bold text-white">{monthlyData.total_guests}</span>
                </div>
                <div className="text-neutral-300">
                  <span className="text-neutral-400">Avg Daily: </span>
                  <span className="font-bold text-emerald-400">
                    {Number(monthlyData.average_daily_income).toLocaleString()} ETB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Statement KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className={`rounded-2xl transition ${
                statementMetric === 'GROSS_INCOME' ? 'ring-2 ring-[#FF385C] rounded-2xl' : ''
              }`}
            >
              <KpiCard
                title="Gross Income"
                value={`${Number(monthlyData.total_income).toLocaleString()} ETB`}
                subtitle={statementMetric === 'GROSS_INCOME' ? '★ Active Filter (Default)' : 'All room charges & extensions'}
                icon={<TrendingUp className="w-5 h-5" />}
                tone="success"
              />
            </div>

            <div
              className={`rounded-2xl transition ${
                statementMetric === 'DAILY_REVENUE' ? 'ring-2 ring-[#FF385C] rounded-2xl' : ''
              }`}
            >
              <KpiCard
                title="Daily Revenue Pace"
                value={`${Number(monthlyData.average_daily_income).toLocaleString()} ETB`}
                subtitle={statementMetric === 'DAILY_REVENUE' ? '★ Active Filter' : 'Average daily income'}
                icon={<CircleDollarSign className="w-5 h-5" />}
                tone="accent"
              />
            </div>

            <div
              className={`rounded-2xl transition ${
                statementMetric === 'EXPENSE' ? 'ring-2 ring-[#FF385C] rounded-2xl' : ''
              }`}
            >
              <KpiCard
                title="Total Expenses"
                value={`${Number(monthlyData.total_expenses).toLocaleString()} ETB`}
                subtitle={statementMetric === 'EXPENSE' ? '★ Active Filter' : 'Operations, supplies & maintenance'}
                icon={<TrendingDown className="w-5 h-5" />}
                tone="neutral"
              />
            </div>

            <div
              className={`rounded-2xl transition ${
                statementMetric === 'NET_INCOME' || statementMetric === 'NET_CASHFLOW'
                  ? 'ring-2 ring-[#FF385C] rounded-2xl'
                  : ''
              }`}
            >
              <KpiCard
                title={statementMetric === 'NET_CASHFLOW' ? 'Net Cashflow' : 'Net Income'}
                value={`${Number(monthlyData.net_income).toLocaleString()} ETB`}
                subtitle={
                  statementMetric === 'NET_INCOME' || statementMetric === 'NET_CASHFLOW'
                    ? '★ Active Filter'
                    : 'Gross income minus expenses'
                }
                icon={<Wallet className="w-5 h-5" />}
                tone={Number(monthlyData.net_income) >= 0 ? 'success' : 'danger'}
              />
            </div>
          </div>

          {/* Secondary Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Average Occupancy Rate
              </span>
              <p className="text-2xl font-bold text-neutral-900 mt-1">
                {monthlyData.occupancy_rate}%
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">Room capacity utilization in period</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Outstanding Guest Balances
              </span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {Number(monthlyData.total_credit).toLocaleString()} ETB
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">Unsettled folio credit / ledger</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Late Checkout Penalties Levied
              </span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {Number(monthlyData.total_penalties).toLocaleString()} ETB
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">Automated penalty fees</p>
            </div>
          </div>

          {/* Statement Ledger Breakdown Table */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Statement Ledger Breakdown
                </h3>
                <p className="text-xs text-neutral-500">
                  Daily journal of financial inflows and outflows for {monthlyData.month}.
                </p>
              </div>
              <div className="text-xs text-neutral-500">
                Filtered Column:{' '}
                <span className="font-bold text-[#FF385C]">
                  {statementMetric === 'GROSS_INCOME' && 'Gross Income'}
                  {statementMetric === 'DAILY_REVENUE' && 'Daily Revenue'}
                  {statementMetric === 'NET_INCOME' && 'Net Income'}
                  {statementMetric === 'EXPENSE' && 'Expense'}
                  {statementMetric === 'NET_CASHFLOW' && 'Net Cashflow'}
                  {statementMetric === 'ALL' && 'All Metrics'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-neutral-200 text-neutral-500 uppercase font-semibold bg-neutral-50/50">
                  <tr>
                    <th className="py-2.5 px-3">Date / Day</th>
                    <th
                      className={`py-2.5 px-3 ${
                        statementMetric === 'GROSS_INCOME'
                          ? 'bg-rose-50 text-[#FF385C] font-black'
                          : ''
                      }`}
                    >
                      Gross Income (ETB)
                    </th>
                    <th
                      className={`py-2.5 px-3 ${
                        statementMetric === 'DAILY_REVENUE'
                          ? 'bg-rose-50 text-[#FF385C] font-black'
                          : ''
                      }`}
                    >
                      Daily Revenue (ETB)
                    </th>
                    <th
                      className={`py-2.5 px-3 ${
                        statementMetric === 'EXPENSE'
                          ? 'bg-rose-50 text-[#FF385C] font-black'
                          : ''
                      }`}
                    >
                      Expenses (ETB)
                    </th>
                    <th
                      className={`py-2.5 px-3 ${
                        statementMetric === 'NET_INCOME'
                          ? 'bg-rose-50 text-[#FF385C] font-black'
                          : ''
                      }`}
                    >
                      Net Income (ETB)
                    </th>
                    <th
                      className={`py-2.5 px-3 ${
                        statementMetric === 'NET_CASHFLOW'
                          ? 'bg-rose-50 text-[#FF385C] font-black'
                          : ''
                      }`}
                    >
                      Net Cashflow (ETB)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {monthlyData.days && monthlyData.days.length > 0 ? (
                    monthlyData.days.map((d) => (
                      <tr key={d.date} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-neutral-800">
                          {d.day} ({d.date})
                        </td>
                        <td
                          className={`py-2.5 px-3 font-semibold ${
                            statementMetric === 'GROSS_INCOME'
                              ? 'bg-rose-50/50 text-[#FF385C] font-bold'
                              : 'text-emerald-600'
                          }`}
                        >
                          {Number(d.income).toLocaleString()} ETB
                        </td>
                        <td
                          className={`py-2.5 px-3 ${
                            statementMetric === 'DAILY_REVENUE'
                              ? 'bg-rose-50/50 text-[#FF385C] font-bold'
                              : 'text-neutral-700'
                          }`}
                        >
                          {Number(d.income).toLocaleString()} ETB
                        </td>
                        <td
                          className={`py-2.5 px-3 ${
                            statementMetric === 'EXPENSE'
                              ? 'bg-rose-50/50 text-[#FF385C] font-bold'
                              : 'text-rose-600'
                          }`}
                        >
                          {Number(d.expense).toLocaleString()} ETB
                        </td>
                        <td
                          className={`py-2.5 px-3 font-bold ${
                            statementMetric === 'NET_INCOME'
                              ? 'bg-rose-50/50 text-[#FF385C]'
                              : Number(d.net) >= 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {Number(d.net).toLocaleString()} ETB
                        </td>
                        <td
                          className={`py-2.5 px-3 font-bold ${
                            statementMetric === 'NET_CASHFLOW'
                              ? 'bg-rose-50/50 text-[#FF385C]'
                              : Number(d.net) >= 0
                              ? 'text-neutral-900'
                              : 'text-rose-600'
                          }`}
                        >
                          {Number(d.net).toLocaleString()} ETB
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                        No financial activity recorded for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="border-t-2 border-neutral-200 font-bold text-neutral-900 bg-neutral-50/80">
                  <tr>
                    <td className="py-3 px-3 uppercase text-neutral-600">Period Total</td>
                    <td
                      className={`py-3 px-3 ${
                        statementMetric === 'GROSS_INCOME' ? 'text-[#FF385C]' : 'text-emerald-600'
                      }`}
                    >
                      {Number(monthlyData.total_income).toLocaleString()} ETB
                    </td>
                    <td
                      className={`py-3 px-3 ${
                        statementMetric === 'DAILY_REVENUE' ? 'text-[#FF385C]' : 'text-neutral-800'
                      }`}
                    >
                      Avg {Number(monthlyData.average_daily_income).toLocaleString()} ETB/day
                    </td>
                    <td
                      className={`py-3 px-3 ${
                        statementMetric === 'EXPENSE' ? 'text-[#FF385C]' : 'text-rose-600'
                      }`}
                    >
                      {Number(monthlyData.total_expenses).toLocaleString()} ETB
                    </td>
                    <td
                      className={`py-3 px-3 ${
                        statementMetric === 'NET_INCOME'
                          ? 'text-[#FF385C]'
                          : Number(monthlyData.net_income) >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {Number(monthlyData.net_income).toLocaleString()} ETB
                    </td>
                    <td
                      className={`py-3 px-3 ${
                        statementMetric === 'NET_CASHFLOW' ? 'text-[#FF385C]' : 'text-neutral-900'
                      }`}
                    >
                      {Number(monthlyData.net_income).toLocaleString()} ETB
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
