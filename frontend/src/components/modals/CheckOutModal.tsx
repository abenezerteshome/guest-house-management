import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  CreditCard,
  Clock,
  Check,
} from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import type { Stay } from '../../types/api'
import { checkOutStay, getStayCharges, getStayPayments } from '../../api/stays'
import { getSettings } from '../../api/settings'
import { getApiError } from '../../api/client'

interface CheckOutModalProps {
  isOpen: boolean
  onClose: () => void
  stay: Stay | null
  guestName?: string
  roomNumber?: string
  onSuccess: (checkedOutStay?: Stay | null) => void
}

export function CheckOutModal({
  isOpen,
  onClose,
  stay,
  guestName,
  roomNumber,
  onSuccess,
}: CheckOutModalProps) {
  const [extensionCredit, setExtensionCredit] = useState<number>(0)
  const [extensionDays, setExtensionDays] = useState<number>(0)
  const [deadlineHour, setDeadlineHour] = useState<number>(4)
  const [deadlineMinute, setDeadlineMinute] = useState<number>(0)
  const [penaltyRate, setPenaltyRate] = useState<number>(600)
  const [applyPenalty, setApplyPenalty] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Clean room number to prevent duplicate "Room Room 101"
  const cleanRoom = (roomNumber || '').replace(/^Room\s+/i, '').trim()

  // Determine current time vs checkout deadline
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const isLate = currentHour > deadlineHour || (currentHour === deadlineHour && currentMinute > deadlineMinute)

  useEffect(() => {
    if (!stay || !isOpen) return
    setLoading(true)
    setError('')
    setApplyPenalty(false)

    Promise.all([
      getStayCharges(stay.id),
      getStayPayments(stay.id),
      getSettings().catch(() => null),
    ])
      .then(([charges, payments, settings]) => {
        let rate = 600
        let dHour = 4
        let dMinute = 0
        if (settings) {
          dHour = settings.checkout_deadline_hour
          dMinute = settings.checkout_deadline_minute
          rate = Number(settings.late_checkout_penalty)
          setDeadlineHour(dHour)
          setDeadlineMinute(dMinute)
          setPenaltyRate(rate)
        }

        // Extension credit calculation
        const extCharges = charges.filter((c) =>
          (c.description || '').toLowerCase().includes('extension')
        )
        const totalExtDue = extCharges.reduce(
          (sum, c) => sum + Number(c.amount || 0) * (c.quantity || 1),
          0
        )

        let totalNights = 0
        extCharges.forEach((c) => {
          const match = (c.description || '').match(/(\d+)\s*night/)
          if (match) {
            totalNights += parseInt(match[1], 10)
          } else {
            totalNights += c.quantity || 1
          }
        })
        setExtensionDays(totalNights)

        // Payments recorded for extension
        const extPayments = payments.filter(
          (p) => p.status === 'SUCCESS' && (p.reference || '').toLowerCase().includes('extension')
        )
        const directExtPaid = extPayments.reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0
        )

        const initialRoomCharges = charges
          .filter(
            (c) =>
              !(c.description || '').toLowerCase().includes('extension') &&
              c.charge_type !== 'LATE_CHECKOUT_PENALTY'
          )
          .reduce((sum, c) => sum + Number(c.amount || 0) * (c.quantity || 1), 0)

        const totalSuccessfulPayments = payments
          .filter((p) => p.status === 'SUCCESS')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0)

        const excessPaid = Math.max(0, totalSuccessfulPayments - initialRoomCharges)
        const totalCreditedExtension = Math.max(
          0,
          totalExtDue - Math.max(directExtPaid, excessPaid)
        )

        setExtensionCredit(totalCreditedExtension)
      })
      .catch((err) => {
        setError(getApiError(err, 'Failed to load stay details.'))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [stay, isOpen, currentHour, currentMinute])

  const activePenalty = (isLate && applyPenalty) ? penaltyRate : 0
  const totalToCollect = extensionCredit + activePenalty

  async function handleConfirmCheckout() {
    if (!stay) return
    setError('')
    setSubmitting(true)
    try {
      const customPenalty = isLate ? (applyPenalty ? Number(penaltyRate) : 0) : 0
      await checkOutStay(stay.id, customPenalty)
      onSuccess(stay)
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Unable to complete checkout.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cleanRoom ? `Check Out — Room ${cleanRoom}` : 'Guest Check Out'}
      description={guestName ? `Guest: ${guestName}` : 'Finalize checkout and free room immediately.'}
      maxWidth="md"
    >
      <div className="space-y-4 text-sm text-[#222222]">
        {error && (
          <div className="p-3.5 rounded-xl bg-[#FFF7F5] border border-[#F2D1CA] text-xs text-[#C13515] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center p-4 text-sm text-[#717171] gap-2">
            <Loader2 size={18} className="animate-spin text-[#FF385C]" />
            <span>Checking stay balance & checkout status...</span>
          </div>
        )}

        {/* 1. Unpaid Stay Extension (if any) */}
        {!loading && extensionCredit > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-amber-900">
                <CreditCard size={15} className="text-amber-700" />
                Unpaid Extension:
              </span>
              <span className="font-extrabold text-sm text-amber-950">
                ETB {extensionCredit.toLocaleString()}
              </span>
            </div>
            <p className="text-amber-800">
              Guest stayed {extensionDays > 0 ? `${extensionDays} extra night${extensionDays > 1 ? 's' : ''}` : 'an extended stay'} on credit.
            </p>
          </div>
        )}

        {/* 2. Optional Late Checkout Penalty Question (Receptionist decides) */}
        {!loading && isLate && (
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                <Clock size={15} className="text-neutral-500" />
                Apply Late Checkout Penalty?
              </span>
              <span className="text-[11px] font-semibold text-neutral-500">
                Rate: ETB {penaltyRate.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setApplyPenalty(false)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  !applyPenalty
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                {!applyPenalty && <Check size={14} className="stroke-[3]" />}
                <span>No Penalty (0 ETB)</span>
              </button>

              <button
                type="button"
                onClick={() => setApplyPenalty(true)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  applyPenalty
                    ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                {applyPenalty && <Check size={14} className="stroke-[3]" />}
                <span>Yes (+ETB {penaltyRate.toLocaleString()})</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Total to Collect Box (Eliminates mental math) */}
        {!loading && totalToCollect > 0 && (
          <div className="p-4 rounded-2xl bg-rose-50/90 border-2 border-rose-300 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Total to Collect from Guest:
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-rose-600">
                ETB {totalToCollect.toLocaleString()}
              </span>
              <span className="text-xs text-rose-700 font-medium">
                {extensionCredit > 0 && activePenalty > 0
                  ? `(${extensionCredit.toLocaleString()} ext + ${activePenalty.toLocaleString()} penalty)`
                  : extensionCredit > 0
                  ? '(unpaid extension)'
                  : '(late penalty)'}
              </span>
            </div>
          </div>
        )}

        {/* 4. All Clear Status Banner (when 0 to collect) */}
        {!loading && totalToCollect === 0 && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-950">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-emerald-900">Ready for Checkout</p>
              <p className="text-emerald-700 text-xs">
                All charges settled (0 ETB to collect). Room will be freed immediately.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0F0F0]">
          <Button variant="ghost" size="md" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={totalToCollect > 0 ? 'danger' : 'primary'}
            size="md"
            onClick={handleConfirmCheckout}
            loading={submitting}
          >
            {totalToCollect > 0
              ? `Collect ETB ${totalToCollect.toLocaleString()} & Check Out`
              : 'Check Out & Free Room'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
