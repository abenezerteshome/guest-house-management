import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  Calendar,
  CircleDollarSign,
  FileSpreadsheet,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  Building,
  Users,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
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

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'income' | 'expenses' | 'weekly' | 'monthly'>('daily')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [_loading, setLoading] = useState(true)

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
        const data = await getMonthlyReport()
        setMonthlyData(data)
      }
    } catch (err) {
      console.error('Failed to load report:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedDate])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'Cash',
    TELEBIRR: 'Telebirr',
    CBE_BIRR: 'CBE Birr',
    BANK_TRANSFER: 'Bank Transfer',
    CREDIT: 'Credit / Ledger',
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial & Operations Intelligence"
        subtitle="Daily performance, revenue breakdown by payment channel, operational expense audits, and occupancy reports."
        action={
          <div className="flex items-center gap-2.5">
            {activeTab === 'daily' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            )}
            <Button variant="outline" size="sm" onClick={() => fetchReports()} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 space-x-1">
        {[
          { id: 'daily', label: 'Daily Flash Report', icon: Calendar },
          { id: 'income', label: 'Income by Payment Method', icon: CircleDollarSign },
          { id: 'expenses', label: 'Expense Distribution', icon: TrendingDown },
          { id: 'weekly', label: 'Weekly Summary', icon: BarChart3 },
          { id: 'monthly', label: 'Monthly Statement', icon: FileSpreadsheet },
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

      {/* TAB 5: MONTHLY STATEMENT */}
      {activeTab === 'monthly' && monthlyData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <KpiCard
              title="Month Net Balance"
              value={`${Number(monthlyData.net_income).toLocaleString()} ETB`}
              subtitle={`Statement for ${monthlyData.month}`}
              icon={<Wallet className="w-5 h-5" />}
              tone={Number(monthlyData.net_income) >= 0 ? 'success' : 'danger'}
            />
            <KpiCard
              title="Month Gross Income"
              value={`${Number(monthlyData.total_income).toLocaleString()} ETB`}
              subtitle="All room charges & extensions"
              icon={<TrendingUp className="w-5 h-5" />}
              tone="success"
            />
            <KpiCard
              title="Month Total Expenses"
              value={`${Number(monthlyData.total_expenses).toLocaleString()} ETB`}
              subtitle="Operations & supplies"
              icon={<TrendingDown className="w-5 h-5" />}
              tone="neutral"
            />
            <KpiCard
              title="Guests Hosted"
              value={`${monthlyData.total_guests} Guests`}
              subtitle={`Avg ${Number(monthlyData.average_daily_income).toLocaleString()} ETB / day`}
              icon={<Users className="w-5 h-5" />}
              tone="accent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Monthly Average Occupancy
              </span>
              <p className="text-2xl font-bold text-neutral-900 mt-1">
                {monthlyData.occupancy_rate}%
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">Overall room utilization rate</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Outstanding Guest Balances
              </span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {Number(monthlyData.total_credit).toLocaleString()} ETB
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">Unsettled folio credit</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Late Checkout Penalties Levied
              </span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {Number(monthlyData.total_penalties).toLocaleString()} ETB
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">4:00 AM deadline penalty collections</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
