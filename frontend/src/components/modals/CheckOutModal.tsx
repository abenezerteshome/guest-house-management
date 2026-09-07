import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleDollarSign, Loader2, ShieldAlert } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import type { FinancialSummary, Stay } from '../../types/api'
import { checkOutStay, getStayFinancialSummary } from '../../api/stays'
import { recordManualPayment } from '../../api/payments'
import { getSettings } from '../../api/settings'

interface CheckOutModalProps {
  isOpen: boolean
  onClose: () => void
  stay: Stay | null
  guestName?: string
  roomNumber?: string
  onSuccess: () => void
}

export function CheckOutModal({
  isOpen,
  onClose,
  stay,
  guestName,
  roomNumber,
  onSuccess,
}: CheckOutModalProps) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [deadlineHour, setDeadlineHour] = useState<number>(4)
  const [deadlineMinute, setDeadlineMinute] = useState<number>(0)
  const [penaltyRate, setPenaltyRate] = useState<number>(600)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Settlement payment states
  const [settleMethod, setSettleMethod] = useState<'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER'>('CASH')
  const [settleAmount, setSettleAmount] = useState<string>('')

  // Determine current time vs checkout deadline
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const isLate = currentHour > deadlineHour || (currentHour === deadlineHour && currentMinute > deadlineMinute)

  useEffect(() => {
    if (!stay || !isOpen) return
    setLoading(true)
    setError('')

    Promise.all([
      getStayFinancialSummary(stay.id),
      getSettings().catch(() => null),
    ])
      .then(([fin, settings]) => {
        setSummary(fin)
        if (settings) {
          setDeadlineHour(settings.checkout_deadline_hour)
          setDeadlineMinute(settings.checkout_deadline_minute)
          setPenaltyRate(Number(settings.late_checkout_penalty))
        }
        const bal = Number(fin.balance)
        if (bal > 0) {
          setSettleAmount(String(bal))
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load stay financial summary.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [stay, isOpen])

  const formattedDeadline = `${String(deadlineHour).padStart(2, '0')}:${String(deadlineMinute).padStart(2, '0')} AM`
  const formattedCurrentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // If late, backend will add penalty when checkOut is called
  const estimatedDue = Number(summary?.total_due || 0) + (isLate ? penaltyRate : 0)
  const totalPaid = Number(summary?.total_paid || 0)
  const estimatedBalance = Math.max(0, estimatedDue - totalPaid)

  async function handleConfirmCheckout() {
    if (!stay) return
    setError('')
    setSubmitting(true)
    try {
      // 1. If settlement payment is provided and > 0, record it
      const settleNum = Number(settleAmount)
      if (settleNum > 0) {
        await recordManualPayment({
          stay_id: stay.id,
          amount: settleNum,
          payment_method: settleMethod,
          reference: `Checkout final settlement (${settleMethod})`,
        })
      }

      // 2. Perform checkout (backend automatically applies penalty if late)
      await checkOutStay(stay.id)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete checkout.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guest Checkout & Bill Settlement"
      description={`Finalize bill and inspect room readiness for ${guestName || 'Guest'} in Room ${roomNumber || ''}.`}
      maxWidth="md"
    >
      <div className="space-y-5 text-sm text-[#222222]">
        {error && (
          <div className="p-3.5 rounded-xl bg-[#FFF7F5] border border-[#F2D1CA] text-xs text-[#C13515] flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center p-4 text-sm text-[#717171] gap-2">
            <Loader2 size={18} className="animate-spin text-[#FF385C]" />
            <span>Loading billing folio...</span>
          </div>
        )}
        {/* 4:00 AM Deadline & Late Checkout Rule Alert */}
        <div
          className={`p-4 rounded-2xl border ${
            isLate
              ? 'bg-[#FFF6EB] border-[#FAD9B5] text-[#C76A00]'
              : 'bg-[#EBF9EB] border-[#BFE4C1] text-[#008A05]'
          }`}
        >
          <div className="flex items-start gap-3">
            {isLate ? <AlertTriangle size={20} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={20} className="shrink-0 mt-0.5" />}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Checkout Deadline: {formattedDeadline}
                </span>
                <span className="text-xs font-normal">
                  (Current Time: {formattedCurrentTime})
                </span>
              </div>
              {isLate ? (
                <p className="text-xs leading-relaxed font-semibold">
                  ⚠ Late checkout detected past {formattedDeadline}! A late checkout penalty of{' '}
                  <span className="underline">ETB {penaltyRate.toLocaleString()}</span> will be added to the guest’s final bill.
                </p>
              ) : (
                <p className="text-xs leading-relaxed">
                  Regular on-time checkout. No penalty applies.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stay Financial Bill Breakdown */}
        <div className="p-4 rounded-2xl bg-[#F7F7F7] border border-[#DDDDDD] space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171] flex items-center gap-1.5">
            <CircleDollarSign size={14} className="text-[#FF385C]" />
            Statement of Account
          </span>

          <div className="space-y-2 text-xs divide-y divide-[#EEEEEE]">
            <div className="flex justify-between pt-1">
              <span className="text-[#717171]">Current Room & Service Charges:</span>
              <strong className="text-[#222222]">
                ETB {Number(summary?.total_due || 0).toLocaleString()}
              </strong>
            </div>

            {isLate && (
              <div className="flex justify-between pt-2 text-[#C76A00]">
                <span>Late Checkout Penalty (Past {formattedDeadline}):</span>
                <strong>+ ETB {penaltyRate.toLocaleString()}</strong>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <span className="text-[#717171]">Total Payments Received:</span>
              <strong className="text-[#008A05]">
                - ETB {totalPaid.toLocaleString()}
              </strong>
            </div>

            <div className="flex justify-between pt-2 text-sm">
              <span className="font-bold text-[#222222]">Outstanding Balance Due:</span>
              <strong className={estimatedBalance > 0 ? 'text-[#C13515]' : 'text-[#008A05]'}>
                ETB {estimatedBalance.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Balance Settlement Form if balance is due */}
        {estimatedBalance > 0 && (
          <div className="p-4 rounded-2xl bg-white border border-[#DDDDDD] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171]">
              Settle Outstanding Balance
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Payment Method
                </label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value as typeof settleMethod)}
                  className="w-full h-11 px-3 rounded-xl border border-[#DDDDDD] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#222222]"
                >
                  <option value="CASH">Cash</option>
                  <option value="TELEBIRR">Telebirr</option>
                  <option value="CBE_BIRR">CBE Birr</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <Input
                label="Settlement Amount (ETB)"
                type="number"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder={String(estimatedBalance)}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0F0F0]">
          <Button variant="ghost" size="md" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={handleConfirmCheckout}
            loading={submitting}
          >
            Confirm Checkout & Free Room
          </Button>
        </div>
      </div>
    </Modal>
  )
}
