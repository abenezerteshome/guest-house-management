import { useState, useEffect } from 'react'
import { CalendarPlus, Clock, AlertCircle, Sparkles } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { extendStay } from '../../api/stays'
import type { Stay } from '../../types/api'

interface ExtendStayModalProps {
  isOpen: boolean
  onClose: () => void
  stay: Stay | null
  roomNumber?: string
  roomPrice?: number
  guestName?: string
  onSuccess: () => void
}

export function ExtendStayModal({
  isOpen,
  onClose,
  stay,
  roomNumber,
  roomPrice,
  guestName,
  onSuccess,
}: ExtendStayModalProps) {
  const [newCheckout, setNewCheckout] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (stay) {
      const current = new Date(stay.expected_checkout)
      current.setDate(current.getDate() + 1)
      setNewCheckout(current.toISOString().slice(0, 16))
      setError('')
    }
  }, [stay])

  if (!stay) return null

  const currentCheckoutDate = new Date(stay.expected_checkout)
  const formattedCurrent = currentCheckoutDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  function handleQuickAddDays(days: number) {
    const d = new Date(stay!.expected_checkout)
    d.setDate(d.getDate() + days)
    setNewCheckout(d.toISOString().slice(0, 16))
  }

  async function handleExtend(e: React.FormEvent) {
    e.preventDefault()
    if (!stay) return

    const selected = new Date(newCheckout)
    if (selected <= currentCheckoutDate) {
      setError('New checkout date must be later than the current checkout date.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await extendStay(stay.id, selected.toISOString())
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to extend stay. Please check the checkout date.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Extend Guest Stay" size="md">
      <form onSubmit={handleExtend} className="space-y-5">
        {/* Info card */}
        <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Guest</p>
              <p className="text-sm font-semibold text-neutral-900">{guestName || `Guest #${stay.guest_id}`}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Room</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FF385C]/10 text-[#FF385C]">
                {roomNumber ? `Room ${roomNumber}` : `Room #${stay.room_id}`}
              </span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-xs text-neutral-600">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4 text-neutral-400" /> Current Checkout:
            </span>
            <span className="font-semibold text-neutral-800">{formattedCurrent}</span>
          </div>
        </div>

        {/* Quick extension shortcuts */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
            Quick Extension
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickAddDays(1)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-800 transition"
            >
              +1 Day (24 hrs)
            </button>
            <button
              type="button"
              onClick={() => handleQuickAddDays(2)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-800 transition"
            >
              +2 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickAddDays(3)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-800 transition"
            >
              +3 Days
            </button>
          </div>
        </div>

        {/* Custom new checkout date */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
            New Expected Checkout Date & Time *
          </label>
          <input
            type="datetime-local"
            required
            value={newCheckout}
            onChange={(e) => setNewCheckout(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent transition"
          />
        </div>

        {/* Extension fee notice */}
        <div className="rounded-xl bg-amber-50/80 p-3.5 border border-amber-200/80 flex items-start gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold mb-0.5">Stay Extension Fee Applied Automatically</p>
            <p className="text-amber-800">
              Extending the stay automatically appends the nightly room rate{' '}
              {roomPrice ? `(${roomPrice.toLocaleString()} ETB)` : ''} to this stay's ledger as a room charge.
            </p>
          </div>
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
            <CalendarPlus className="w-4 h-4" />
            Confirm Extension
          </Button>
        </div>
      </form>
    </Modal>
  )
}
