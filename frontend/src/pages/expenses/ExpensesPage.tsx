import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Table, type TableColumn } from '../../components/common/Table'
import { RecordExpenseModal } from '../../components/modals/RecordExpenseModal'
import { ConfirmDeleteExpenseModal } from '../../components/modals/ConfirmDeleteExpenseModal'
import { getExpenses } from '../../api/expenses'
import type { Expense } from '../../types/api'

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)

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
      (e.reason || '').toLowerCase().includes(q) ||
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
      header: 'Expense Type',
      render: (e) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
          {e.category}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (e) => (
        <span className="text-xs font-semibold text-neutral-800">
          {(e.reason || 'Not specified')
            .toLowerCase()
            .replaceAll('_', ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase())}
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
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (e) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setEditingExpense(e)}
            title="Edit Expense"
            aria-label={`Edit Expense #${e.id}`}
            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition cursor-pointer"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => setDeletingExpense(e)}
            title="Delete Expense"
            aria-label={`Delete Expense #${e.id}`}
            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Expenses"
        subtitle="Track what was spent, why it was needed, and how it was paid."
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingExpense(null)
              setModalOpen(true)
            }}
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
          placeholder="Search type, reason, details, or payment method..."
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
          loadingLabel="Loading expenses..."
          emptyMessage="No expense records found."
        />
      </div>

      <RecordExpenseModal
        isOpen={modalOpen || editingExpense !== null}
        expense={editingExpense}
        onClose={() => {
          setModalOpen(false)
          setEditingExpense(null)
        }}
        onSuccess={() => fetchData()}
      />

      <ConfirmDeleteExpenseModal
        isOpen={deletingExpense !== null}
        expense={deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onSuccess={() => fetchData()}
      />
    </div>
  )
}

