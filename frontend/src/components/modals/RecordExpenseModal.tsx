import { useState } from 'react'
import { ReceiptText, AlertCircle } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { createExpense } from '../../api/expenses'

interface RecordExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const EXPENSE_CATEGORIES = [
  { id: 'CLEANING', label: 'Cleaning & Laundry' },
  { id: 'ELECTRICITY', label: 'Electricity & Utilities' },
  { id: 'WATER', label: 'Water & Sanitation' },
  { id: 'MAINTENANCE', label: 'Room Maintenance & Repairs' },
  { id: 'FOOD', label: 'Food & Beverages' },
  { id: 'SALARY', label: 'Staff & Salaries' },
  { id: 'TRANSPORTATION', label: 'Transportation & Logistics' },
  { id: 'SUPPLIES', label: 'Guest Amenities & Supplies' },
  { id: 'OTHER', label: 'Other Operational Expenses' },
]

export function RecordExpenseModal({ isOpen, onClose, onSuccess }: RecordExpenseModalProps) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].id)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER'>('CASH')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0.')
      return
    }

    if (!description.trim()) {
      setError('Please describe the purpose of this expense.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await createExpense({
        category,
        description: description.trim(),
        amount: numAmount,
        payment_method: paymentMethod,
        expense_date: new Date(expenseDate).toISOString(),
      })

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to record expense. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Operational Expense" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
            Expense Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount and Date */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (ETB) *"
            type="number"
            min="0.5"
            step="0.01"
            placeholder="1200.00"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
              Expense Date *
            </label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
            />
          </div>
        </div>

        {/* Payment Method Used */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
            Payment Method Disbursed *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'CASH', label: 'Cash' },
              { id: 'TELEBIRR', label: 'Telebirr' },
              { id: 'CBE_BIRR', label: 'CBE Birr' },
              { id: 'BANK_TRANSFER', label: 'Bank' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id as typeof paymentMethod)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  paymentMethod === m.id
                    ? 'border-[#FF385C] bg-[#FF385C]/10 text-[#FF385C]'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
            Description / Item Details *
          </label>
          <textarea
            rows={2}
            required
            placeholder="e.g., Monthly electricity bill settlement for Guest House premises"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={loading} className="gap-2">
            <ReceiptText className="w-4 h-4" />
            {loading ? 'Saving expense...' : 'Record Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
