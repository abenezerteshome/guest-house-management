import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  ShieldAlert,
  CreditCard,
  Banknote,
  Clock,
  Info,
} from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import type { FinancialSummary, Stay } from '../../types/api'
import { checkOutStay, getStayFinancialSummary } from '../../api/stays'
import { recordManualPayment } from '../../api/payments'
import { getSettings } from '../../api/settings'
import { getApiError } from '../../api/client'

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

  // Settlement Choice: Pay right away at checkout vs leave on credit
  const [settleChoice, setSettleChoice] = useState<'PAY_NOW' | 'CREDIT'>('PAY_NOW')
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
    setSettleChoice('PAY_NOW')

    Promise.all([
      getStayFinancialSummary(stay.id),
      getSettings().catch(() => null),
    ])
      .then(([fin, settings]) => {
        setSummary(fin)
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

        const late = currentHour > dHour || (currentHour === dHour && currentMinute > dMinute)
        const due = Number(fin.total_due || 0) + (late ? rate : 0)
        const paid = Number(fin.total_paid || 0)
        const netBal = Math.max(0, due - paid)
        setSettleAmount(String(netBal))
      })
      .catch((err) => {
        setError(getApiError(err, 'Failed to load stay financial summary.'))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [stay, isOpen, currentHour, currentMinute])

  const formattedDeadline = `${String(deadlineHour).padStart(2, '0')}:${String(deadlineMinute).padStart(2, '0')} AM`
  const formattedCurrentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Financial calculations
  const totalRoomAndCharges = Number(summary?.total_due || 0)
  const totalPaid = Number(summary?.total_paid || 0)
  const baseCreditBalance = Math.max(0, totalRoomAndCharges - totalPaid)
  const estimatedDue = totalRoomAndCharges + (isLate ? penaltyRate : 0)
  const estimatedBalance = Math.max(0, estimatedDue - totalPaid)

  async function handleConfirmCheckout() {
    if (!stay) return
    setError('')
    setSubmitting(true)
    try {
      // 1. Perform checkout in backend (which adds late penalty charge if past deadline)
      await checkOutStay(stay.id)

      // 2. If user chose to pay right away and amount > 0, record payment
      if (settleChoice === 'PAY_NOW') {
        const settleNum = Number(settleAmount)
        if (settleNum > 0) {
          try {
            await recordManualPayment({
              stay_id: stay.id,
              amount: settleNum,
              payment_method: settleMethod,
              reference: `Checkout final settlement (${settleMethod})`,
            })
          } catch (payErr) {
            console.error('Checkout succeeded but settlement payment error:', payErr)
          }
        }
      }

      onSuccess()
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
      title="Guest Checkout & Bill Verification"
      description={`Review stay credit, evaluate late penalty, and finalize checkout for ${guestName || 'Guest'} (Room ${roomNumber || ''}).`}
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
            <span>Verifying guest credit & checkout status...</span>
          </div>
        )}

        {/* 1. CREDIT / PAID RIGHT AWAY VERIFICATION (SINGLE-LINE ON MOBILE & DESKTOP) */}
        <div
          className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
            baseCreditBalance > 0
              ? 'bg-amber-50/90 border-amber-200 text-amber-950'
              : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {baseCreditBalance > 0 ? (
              <CreditCard size={15} className="text-amber-700 shrink-0" />
            ) : (
              <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
            )}
            <span className="font-bold shrink-0">
              {baseCreditBalance > 0 ? 'Credit Check:' : 'Payment:'}
            </span>
            <span className="truncate text-neutral-600 text-[11px] sm:text-xs">
              {baseCreditBalance > 0
                ? `Unpaid ETB ${baseCreditBalance.toLocaleString()} on credit`
                : 'Paid in full upfront (0 debt)'}
            </span>
          </div>
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase whitespace-nowrap ${
              baseCreditBalance > 0
                ? 'bg-amber-200 text-amber-900'
                : 'bg-emerald-200 text-emerald-900'
            }`}
          >
            {baseCreditBalance > 0
              ? `In Credit (${baseCreditBalance.toLocaleString()} ETB)`
              : '0 Credit'}
          </span>
        </div>

        {/* 2. LATE CHECKOUT PENALTY VERIFICATION (SINGLE-LINE ON MOBILE & DESKTOP) */}
        <div
          className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
            isLate
              ? 'bg-rose-50/90 border-rose-200 text-rose-950'
              : 'bg-neutral-50 border-neutral-200 text-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isLate ? (
              <AlertTriangle size={15} className="text-rose-700 shrink-0" />
            ) : (
              <Clock size={15} className="text-neutral-500 shrink-0" />
            )}
            <span className="font-bold shrink-0">
              {isLate ? 'Late Penalty:' : 'Time Check:'}
            </span>
            <span className="truncate text-neutral-600 text-[11px] sm:text-xs">
              {isLate
                ? `Past ${formattedDeadline} cutoff (${formattedCurrentTime})`
                : `On-time before ${formattedDeadline}`}
            </span>
          </div>
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase whitespace-nowrap ${
              isLate ? 'bg-rose-200 text-rose-900' : 'bg-neutral-200 text-neutral-700'
            }`}
          >
            {isLate ? `+ETB ${penaltyRate.toLocaleString()} Penalty` : '0 Penalty'}
          </span>
        </div>

        {/* 3. STATEMENT OF ACCOUNT BREAKDOWN */}
        <div className="p-4 rounded-2xl bg-[#F7F7F7] border border-[#DDDDDD] space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171] flex items-center gap-1.5">
            <CircleDollarSign size={14} className="text-[#FF385C]" />
            Statement of Account
          </span>

          <div className="space-y-2 text-xs divide-y divide-[#EEEEEE]">
            <div className="flex justify-between pt-1">
              <span className="text-[#717171]">Room & Extension Charges:</span>
              <strong className="text-[#222222]">
                ETB {totalRoomAndCharges.toLocaleString()}
              </strong>
            </div>

            {isLate && (
              <div className="flex justify-between pt-2 text-rose-700">
                <span className="font-semibold">Late Checkout Penalty (Past {formattedDeadline}):</span>
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
              <span className="font-bold text-[#222222]">Total Balance Due:</span>
              <strong className={estimatedBalance > 0 ? 'text-[#C13515]' : 'text-[#008A05]'}>
                ETB {estimatedBalance.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* 4. SETTLEMENT OPTIONS IF BALANCE IS DUE */}
        {estimatedBalance > 0 ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Settlement Method for Balance (ETB {estimatedBalance.toLocaleString()})
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSettleChoice('PAY_NOW')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  settleChoice === 'PAY_NOW'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className={`w-4 h-4 ${settleChoice === 'PAY_NOW' ? 'text-emerald-600' : 'text-neutral-400'}`} />
                  <span className="text-xs font-bold">Pay Right Away</span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-tight">
                  Guest pays full balance now. Check out with 0 debt.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSettleChoice('CREDIT')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  settleChoice === 'CREDIT'
                    ? 'border-amber-500 bg-amber-50/50 text-amber-950 ring-2 ring-amber-500/20'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className={`w-4 h-4 ${settleChoice === 'CREDIT' ? 'text-amber-600' : 'text-neutral-400'}`} />
                  <span className="text-xs font-bold">Leave on Credit</span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-tight">
                  Authorize departure with balance remaining on folio.
                </p>
              </button>
            </div>

            {settleChoice === 'PAY_NOW' ? (
              <div className="p-3.5 rounded-xl bg-white border border-[#DDDDDD] grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value as typeof settleMethod)}
                    className="w-full h-10 px-3 rounded-xl border border-[#DDDDDD] bg-white text-xs text-[#222222] focus:outline-none focus:border-[#222222]"
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
            ) : (
              <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <Info size={15} className="shrink-0 text-amber-600" />
                <span className="truncate">
                  Departing on credit: <strong>ETB {estimatedBalance.toLocaleString()}</strong> will remain on guest folio.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span className="truncate">Account balanced: No outstanding credit or penalty due.</span>
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
            {settleChoice === 'PAY_NOW' && estimatedBalance > 0
              ? `Settle ETB ${Number(settleAmount || 0).toLocaleString()} & Check Out`
              : 'Confirm Checkout & Free Room'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
