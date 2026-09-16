import { useState } from 'react'
import { Trash2, AlertTriangle, AlertCircle } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { deleteExpense } from '../../api/expenses'
import type { Expense } from '../../types/api'

interface ConfirmDeleteExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  expense: Expense | null
}

export function ConfirmDeleteExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  expense,
}: ConfirmDeleteExpenseModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!expense) return null

  async function handleDelete() {
    if (!expense) return
    setLoading(true)
    setError('')

    try {
      await deleteExpense(expense.id)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to delete expense record. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const formattedDate = expense.expense_date
    ? new Date(expense.expense_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Operational Expense" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
          <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-rose-950">
              Permanently delete Expense #{expense.id}?
            </h4>
            <p className="text-xs text-rose-700 mt-1">
              Are you sure you want to delete this expense of{' '}
              <strong className="font-semibold text-rose-900">
                {Number(expense.amount).toLocaleString()} ETB
              </strong>
              ? This action removes the entry from the operational log.
            </p>
          </div>
        </div>

        {/* Expense Quick Summary */}
        <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 font-medium">Category</span>
            <span className="font-semibold text-neutral-800">{expense.category}</span>
          </div>
          {expense.reason && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Reason</span>
              <span className="font-semibold text-neutral-800">
                {expense.reason
                  .toLowerCase()
                  .replaceAll('_', ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 font-medium">Description</span>
            <span className="font-semibold text-neutral-800 truncate max-w-[180px]">
              {expense.description}
            </span>
          </div>
          {formattedDate && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Date</span>
              <span className="font-semibold text-neutral-700">{formattedDate}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-medium">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            type="button"
            isLoading={loading}
            onClick={handleDelete}
            className="gap-1.5"
          >
            <Trash2 size={13} />
            Confirm Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}
