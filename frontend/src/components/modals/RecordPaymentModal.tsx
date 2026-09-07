import { useState, useEffect } from 'react'
import {
  AlertCircle,
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  Receipt,
  Sparkles,
  Smartphone,
  Building2,
  Banknote,
} from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { recordManualPayment, initializeChapaPayment } from '../../api/payments'
import { getStayFinancialSummary } from '../../api/stays'
import type { FinancialSummary } from '../../types/api'

interface RecordPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  stayId: number | null
  guestName?: string
  roomNumber?: string
  onSuccess: () => void
}

type PaymentMethodType = 'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER' | 'CHAPA'

export function RecordPaymentModal({
  isOpen,
  onClose,
  stayId,
  guestName,
  roomNumber,
  onSuccess,
}: RecordPaymentModalProps) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [method, setMethod] = useState<PaymentMethodType>('CASH')
  const [amount, setAmount] = useState<string>('')
  const [reference, setReference] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [redirectStatus, setRedirectStatus] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && stayId) {
      setLoading(true)
      setError('')
      setRedirectStatus(null)
      getStayFinancialSummary(stayId)
        .then((res) => {
          setSummary(res)
          const bal = Number(res.balance || 0)
          if (bal > 0) {
            setAmount(bal.toFixed(2))
          } else {
            setAmount('0.00')
          }
        })
        .catch((err) => {
          console.error(err)
          setError('Failed to load stay financial summary.')
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen, stayId])

  const balance = Number(summary?.balance || 0)
  const totalCharges = Number(summary?.total_due || 0)
  const totalPayments = Number(summary?.total_paid || 0)

  // Keep amount locked to full balance when Chapa is selected
  const handleSelectMethod = (selectedMethod: PaymentMethodType) => {
    setMethod(selectedMethod)
    setError('')
    if (selectedMethod === 'CHAPA') {
      setAmount(balance > 0 ? balance.toFixed(2) : '0.00')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stayId) return

    if (method === 'CHAPA') {
      if (balance <= 0) {
        setError('Cannot initialize Chapa payment: Balance is already settled (0 ETB).')
        return
      }

      setLoading(true)
      setError('')
      setRedirectStatus('Preparing secure payment...')

      try {
        const chapaRes = await initializeChapaPayment({
          stay_id: stayId,
          amount: balance.toFixed(2),
        })

        // Persist fallback references for verification return flow
        sessionStorage.setItem('chapa_pending_tx_ref', chapaRes.tx_ref)
        sessionStorage.setItem('chapa_pending_stay_id', String(stayId))
        localStorage.setItem('chapa_pending_tx_ref', chapaRes.tx_ref)
        localStorage.setItem('chapa_pending_stay_id', String(stayId))

        setRedirectStatus('Redirecting to Chapa...')

        // Navigate via window.location.href (avoid popup blockers)
        setTimeout(() => {
          window.location.href = chapaRes.checkout_url
        }, 500)
      } catch (err: unknown) {
        setRedirectStatus(null)
        setLoading(false)
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to initialize Chapa gateway. Please verify network connection or provider settings.'
        setError(msg)
      }
      return
    }

    // Manual payment flow
    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive payment amount.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await recordManualPayment({
        stay_id: stayId,
        amount: numAmount.toFixed(2),
        payment_method: method,
        reference: reference.trim() || undefined,
      })

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Payment failed. Please verify the amount and payment method.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!stayId) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settle Folio Payment" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Prominent Amount Due Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white p-5 shadow-sm border border-neutral-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Authoritative Balance Due
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black tracking-tight text-white">
                  {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-[#FF385C]">ETB</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-neutral-300 block">
                {guestName || `Stay #${stayId}`}
              </span>
              {roomNumber && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-neutral-200 mt-1">
                  Room {roomNumber}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Total Incurred</span>
              <span className="font-bold text-neutral-200">{totalCharges.toLocaleString()} ETB</span>
            </div>
            <div className="text-right">
              <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Total Settled</span>
              <span className="font-bold text-emerald-400">{totalPayments.toLocaleString()} ETB</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
            Payment Method *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                id: 'CASH',
                label: 'Cash',
                desc: 'Direct cash settlement',
                icon: Banknote,
              },
              {
                id: 'TELEBIRR',
                label: 'Telebirr',
                desc: 'Manual reference recording',
                icon: Smartphone,
              },
              {
                id: 'CBE_BIRR',
                label: 'CBE Birr',
                desc: 'Commercial Bank of Ethiopia',
                icon: Building2,
              },
              {
                id: 'BANK_TRANSFER',
                label: 'Bank Transfer',
                desc: 'Direct deposit / wire slip',
                icon: Building2,
              },
              {
                id: 'CHAPA',
                label: 'Chapa Gateway',
                desc: 'Telebirr / Card via Chapa',
                icon: CreditCard,
                highlight: true,
              },
            ].map((m) => {
              const active = method === m.id
              const IconComp = m.icon
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectMethod(m.id as PaymentMethodType)}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                    m.highlight ? 'sm:col-span-2' : ''
                  } ${
                    active
                      ? 'border-[#FF385C] bg-[#FF385C]/5 ring-2 ring-[#FF385C]/30'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      active ? 'bg-[#FF385C] text-white' : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${active ? 'text-[#FF385C]' : 'text-neutral-900'}`}>
                        {m.label}
                      </span>
                      {m.highlight && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Instant Online
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-500 block truncate mt-0.5">{m.desc}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
              Payment Amount (ETB) *
            </label>
            {method !== 'CHAPA' && balance > 0 && (
              <button
                type="button"
                onClick={() => setAmount(balance.toFixed(2))}
                className="text-[11px] font-semibold text-[#FF385C] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Fill balance ({balance.toLocaleString()} ETB)
              </button>
            )}
          </div>

          {method === 'CHAPA' ? (
            <div className="relative">
              <Input
                type="text"
                readOnly
                disabled
                value={`${balance.toFixed(2)} ETB`}
                className="bg-neutral-100 text-neutral-900 font-bold cursor-not-allowed pr-10"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-neutral-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 1500.00"
              required
              disabled={loading}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}

          {method === 'CHAPA' && (
            <p className="text-[11px] text-neutral-500 mt-1.5 flex items-center gap-1">
              <Lock className="w-3 h-3 text-neutral-400" />
              Chapa gateway payments are locked to the authoritative balance due.
            </p>
          )}
        </div>

        {/* Dynamic method details */}
        {method === 'CHAPA' ? (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-900">
              <ExternalLink className="w-4 h-4 shrink-0 text-amber-700" />
              <p className="text-xs font-bold">Chapa Hosted Checkout Flow</p>
            </div>
            <p className="text-[12px] text-amber-800 leading-relaxed">
              Clicking <span className="font-bold">Pay with Chapa</span> will create a pending payment record on Haven House and securely redirect you to Chapa's payment checkout to complete via Telebirr or Card.
            </p>
            {redirectStatus && (
              <div className="mt-3 p-3 rounded-lg bg-amber-100/90 text-amber-900 border border-amber-300 flex items-center gap-2 text-xs font-semibold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-800" />
                <span>{redirectStatus}</span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <Input
              label="Transaction / Transfer Reference (Optional)"
              placeholder="e.g. TXN-789024, Telebirr Trans ID, or Bank Slip #"
              disabled={loading}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              Provide bank slip number or mobile money reference for reconciliation.
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          {method === 'CHAPA' ? (
            <Button
              variant="primary"
              type="submit"
              isLoading={loading}
              disabled={loading || balance <= 0}
              className="gap-2 bg-gradient-to-r from-[#FF385C] to-[#E00B41] hover:from-[#E00B41] hover:to-[#C00030]"
            >
              {loading ? (
                <span>{redirectStatus || 'Processing...'}</span>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay with Chapa</span>
                </>
              )}
            </Button>
          ) : (
            <Button variant="primary" type="submit" isLoading={loading} disabled={loading} className="gap-2">
              <Receipt className="w-4 h-4" />
              <span>Record Payment</span>
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}

