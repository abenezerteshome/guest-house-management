import { useState, useEffect } from 'react'
import { CalendarPlus, Clock, AlertCircle, CircleDollarSign, CreditCard, Banknote, Check } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { extendStay } from '../../api/stays'
import { recordManualPayment } from '../../api/payments'
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
  const [selectedQuickDays, setSelectedQuickDays] = useState<number | null>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Payment Settlement Choice
  const [paymentOption, setPaymentOption] = useState<'PAY_NOW' | 'CREDIT'>('PAY_NOW')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER'>('CASH')

  useEffect(() => {
    if (stay) {
      const current = new Date(stay.expected_checkout)
      current.setDate(current.getDate() + 1)
      setNewCheckout(current.toISOString().slice(0, 16))
      setSelectedQuickDays(1)
      setError('')
      setPaymentOption('PAY_NOW')
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

  const selectedCheckoutDate = newCheckout ? new Date(newCheckout) : currentCheckoutDate
  const diffDays = Math.round((selectedCheckoutDate.getTime() - currentCheckoutDate.getTime()) / (1000 * 60 * 60 * 24))
  const extensionNights = Math.max(1, isNaN(diffDays) ? 1 : diffDays)
  const unitPrice = Number(roomPrice || 0)
  const totalExtensionFee = extensionNights * unitPrice

  function handleQuickAddDays(days: number) {
    setSelectedQuickDays(days)
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
      // 1. Extend the stay (appends room charge for the extra nights to stay ledger)
      await extendStay(stay.id, selected.toISOString())

      // 2. If guest chooses to pay right away, immediately record the manual payment
      if (paymentOption === 'PAY_NOW' && totalExtensionFee > 0) {
        try {
          await recordManualPayment({
            stay_id: stay.id,
            amount: totalExtensionFee,
            payment_method: paymentMethod,
            reference: `Stay extension (${extensionNights} night${extensionNights > 1 ? 's' : ''}) - ${paymentMethod}`,
          })
        } catch (payErr: unknown) {
          console.error('Stay was extended but payment recording failed:', payErr)
        }
      }

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

  const displayRoom = (roomNumber || '').trim().toLowerCase().startsWith('room')
    ? roomNumber
    : `Room ${roomNumber || stay.room_id}`

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
                {displayRoom}
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
              className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedQuickDays === 1
                  ? 'border-[#FF385C] bg-[#FF385C] text-white shadow-sm ring-2 ring-[#FF385C]/25'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 font-medium'
              }`}
            >
              {selectedQuickDays === 1 && <Check size={14} className="shrink-0 stroke-[2.5]" />}
              <span>+1 Day (24 hrs)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickAddDays(2)}
              className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedQuickDays === 2
                  ? 'border-[#FF385C] bg-[#FF385C] text-white shadow-sm ring-2 ring-[#FF385C]/25'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 font-medium'
              }`}
            >
              {selectedQuickDays === 2 && <Check size={14} className="shrink-0 stroke-[2.5]" />}
              <span>+2 Days</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickAddDays(3)}
              className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedQuickDays === 3
                  ? 'border-[#FF385C] bg-[#FF385C] text-white shadow-sm ring-2 ring-[#FF385C]/25'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 font-medium'
              }`}
            >
              {selectedQuickDays === 3 && <Check size={14} className="shrink-0 stroke-[2.5]" />}
              <span>+3 Days</span>
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
            onChange={(e) => {
              const val = e.target.value
              setNewCheckout(val)
              if (val) {
                const manualDate = new Date(val)
                const diff = Math.round((manualDate.getTime() - currentCheckoutDate.getTime()) / (1000 * 60 * 60 * 24))
                setSelectedQuickDays(diff === 1 || diff === 2 || diff === 3 ? diff : null)
              } else {
                setSelectedQuickDays(null)
              }
            }}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent transition"
          />
        </div>

        {/* Payment / Credit Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
            Payment Method for Extension
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentOption('PAY_NOW')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                paymentOption === 'PAY_NOW'
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Banknote className={`w-4 h-4 ${paymentOption === 'PAY_NOW' ? 'text-emerald-600' : 'text-neutral-400'}`} />
                <span className="text-xs font-bold">Paid Right Away</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-tight">
                Guest pays {totalExtensionFee.toLocaleString()} ETB now. Leaves zero credit.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPaymentOption('CREDIT')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                paymentOption === 'CREDIT'
                  ? 'border-amber-500 bg-amber-50/50 text-amber-950 ring-2 ring-amber-500/20'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <CreditCard className={`w-4 h-4 ${paymentOption === 'CREDIT' ? 'text-amber-600' : 'text-neutral-400'}`} />
                <span className="text-xs font-bold">On Credit (Pay Later)</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-tight">
                Add {totalExtensionFee.toLocaleString()} ETB to unpaid balance. Verified at checkout.
              </p>
            </button>
          </div>

          {/* If Pay Right Away, choose method */}
          {paymentOption === 'PAY_NOW' && (
            <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-900 mb-1">
                  Received Via
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  className="w-full h-9 px-3 rounded-lg border border-emerald-300 bg-white text-xs font-medium text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="TELEBIRR">Telebirr</option>
                  <option value="CBE_BIRR">CBE Birr</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
            </div>
          )}

          {/* If Credit, display notice (single-line) */}
          {paymentOption === 'CREDIT' && (
            <div className="px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center gap-2 text-xs text-amber-900">
              <CircleDollarSign className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">
                Credit: <strong>{totalExtensionFee.toLocaleString()} ETB</strong> added to guest folio (settled at checkout).
              </span>
            </div>
          )}
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
            {loading
              ? 'Extending stay...'
              : paymentOption === 'PAY_NOW'
              ? 'Confirm Extension & Payment'
              : 'Confirm Extension on Credit'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
