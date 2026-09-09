import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Table, type TableColumn } from '../../components/common/Table'
import { RecordExpenseModal } from '../../components/modals/RecordExpenseModal'
import { getExpenses } from '../../api/expenses'
import type { Expense } from '../../types/api'

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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

  const filteredExpenses = expenses.filter((e) => {
    const q = search.toLowerCase()
    return (
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.payment_method.toLowerCase().includes(q) ||
      String(e.id).includes(q)
    )
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
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Expense
          </Button>
        }
      />

      {/* Search */}
      <div className="w-full sm:w-80">
        <Input
          placeholder="Search description, category, or payment method..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
