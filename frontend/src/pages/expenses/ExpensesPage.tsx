import { useState, useEffect, useCallback } from 'react'
import {
  ReceiptText,
  Plus,
  RefreshCw,
  Tag,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Table, type TableColumn } from '../../components/common/Table'
import { KpiCard } from '../../components/common/KpiCard'
import { RecordExpenseModal } from '../../components/modals/RecordExpenseModal'
import { getExpenses } from '../../api/expenses'
import type { Expense } from '../../types/api'

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [modalOpen, setModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getExpenses()
      setExpenses(data)
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  // Categories present in the data
  const categories = Array.from(new Set(expenses.map((e) => e.category)))

  // Category totals for top category
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
    return acc
  }, {})

  const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
  const topCategoryName = topCategoryEntry ? topCategoryEntry[0] : 'None'

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = selectedCategory === 'ALL' || e.category === selectedCategory
    const q = search.toLowerCase()
    const matchesSearch =
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.payment_method.toLowerCase().includes(q) ||
      String(e.id).includes(q)
    return matchesCat && matchesSearch
  })

  const columns: TableColumn<Expense>[] = [
    {
      key: 'id',
      header: 'Expense #',
      render: (e) => <span className="font-mono text-xs font-semibold text-neutral-500">#{e.id}</span>,
    },
    {
      key: 'expense_date',
      header: 'Date',
      render: (e) => {
        const d = new Date(e.expense_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        return <span className="text-xs text-neutral-700 font-medium">{d}</span>
      },
    },
    {
      key: 'category',
      header: 'Category',
      render: (e) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
          {e.category}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (e) => (
        <div>
          <p className="text-xs font-semibold text-neutral-900">{e.description}</p>
        </div>
      ),
    },
    {
      key: 'payment_method',
      header: 'Payment Method',
      render: (e) => (
        <span className="text-xs font-medium text-neutral-600">
          {e.payment_method.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Disbursed Amount',
      align: 'right',
      render: (e) => (
        <span className="font-bold text-sm text-neutral-900">
          {Number(e.amount).toLocaleString()} ETB
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Expenses"
        subtitle="Log operational costs, supplier bills, maintenance expenses, and utility settlements."
        action={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={() => fetchData()} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Expense
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Total Expenses"
          value={`${totalExpenseAmount.toLocaleString()} ETB`}
          subtitle="Lifetime operational outlay"
          icon={<Wallet className="w-5 h-5" />}
          tone="neutral"
        />
        <KpiCard
          title="Highest Cost Center"
          value={topCategoryName}
          subtitle={
            topCategoryEntry
              ? `${topCategoryEntry[1].toLocaleString()} ETB total spent`
              : 'No expenses yet'
          }
          icon={<Tag className="w-5 h-5" />}
          tone="warning"
        />
        <KpiCard
          title="Total Transactions"
          value={expenses.length}
          subtitle="Expense ledger entries"
          icon={<ReceiptText className="w-5 h-5" />}
          tone="neutral"
        />
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              selectedCategory === 'ALL'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            All Categories ({expenses.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search description or method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <Table
          columns={columns}
          data={filteredExpenses}
          keyExtractor={(e) => e.id}
          isLoading={loading}
          emptyMessage="No expense records found."
        />
      </div>

      <RecordExpenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  )
}
