import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Receipt,
  RotateCcw,
  Building,
  CreditCard,
  ShieldCheck,
} from 'lucide-react'
import { getChapaPaymentStatus } from '../../api/payments'
import type { Payment } from '../../types/api'

type VerificationState = 'CONFIRMING' | 'SUCCESS' | 'FAILED' | 'ERROR'

export function ChapaResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Retrieve tx_ref from query params (?tx_ref=... or ?trx_ref=...) or browser storage fallback
  const queryTxRef = searchParams.get('tx_ref') || searchParams.get('trx_ref')
  const [txRef, setTxRef] = useState<string | null>(queryTxRef)
  const [stayId, setStayId] = useState<number | null>(null)

  const [status, setStatus] = useState<VerificationState>('CONFIRMING')
  const [payment, setPayment] = useState<Payment | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Initialize references on mount
  useEffect(() => {
    let resolvedTxRef = queryTxRef
    if (!resolvedTxRef) {
      resolvedTxRef =
        sessionStorage.getItem('chapa_pending_tx_ref') ||
        localStorage.getItem('chapa_pending_tx_ref')
    }

    const storedStayId =
      sessionStorage.getItem('chapa_pending_stay_id') ||
      localStorage.getItem('chapa_pending_stay_id')
    if (storedStayId) {
      setStayId(Number(storedStayId))
    }

    if (resolvedTxRef) {
      setTxRef(resolvedTxRef)
    } else {
      setStatus('ERROR')
      setErrorMessage(
        'No transaction reference was provided in the return URL or browser session.'
      )
    }
  }, [queryTxRef])

  const [retryCount, setRetryCount] = useState<number>(0)

  const verifyPayment = useCallback(
    async (ref: string, attempt: number) => {
      setStatus('CONFIRMING')
      setErrorMessage(null)

      try {
        const paymentData = await getChapaPaymentStatus(ref)
        setPayment(paymentData)
        if (paymentData.stay_id) {
          setStayId(paymentData.stay_id)
        }

        if (paymentData.status === 'SUCCESS') {
          setStatus('SUCCESS')
          // Clear pending references from session storage once finalized
          sessionStorage.removeItem('chapa_pending_tx_ref')
          sessionStorage.removeItem('chapa_pending_stay_id')
          localStorage.removeItem('chapa_pending_tx_ref')
          localStorage.removeItem('chapa_pending_stay_id')
        } else if (paymentData.status === 'FAILED') {
          setStatus('FAILED')
        } else {
          // Status is still PENDING
          if (attempt < 2) {
            // Automatically retry after 2.5s for provider settlement
            setTimeout(() => {
              setRetryCount((c) => c + 1)
            }, 2500)
          } else {
            // Leave in CONFIRMING state with manual reload option
            setStatus('CONFIRMING')
          }
        }
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to verify payment with the server.'
        setStatus('ERROR')
        setErrorMessage(detail)
      }
    },
    []
  )

  useEffect(() => {
    if (txRef) {
      verifyPayment(txRef, retryCount)
    }
  }, [txRef, retryCount, verifyPayment])

  const handleManualRefresh = () => {
    if (txRef) {
      verifyPayment(txRef, 2)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-between items-center px-4 py-12">
      {/* Brand Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-8">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-[#FF385C] flex items-center justify-center text-white shadow-sm">
            <Building className="w-4 h-4" />
          </div>
          <span className="text-base font-black tracking-tight text-neutral-900 group-hover:text-[#FF385C] transition">
            Haven House
          </span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secure Checkout Verification</span>
        </div>
      </div>

      {/* Main Result Card */}
      <div className="w-full max-w-lg bg-white rounded-3xl border border-neutral-200 shadow-sm p-8 transition-all">
        {/* State 1: CONFIRMING / IN-PROGRESS */}
        {status === 'CONFIRMING' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight">
              Payment is being confirmed...
            </h1>
            <p className="text-sm text-neutral-500 mt-2 max-w-sm mx-auto leading-relaxed">
              We are actively verifying this transaction with Chapa. Please do not close or refresh this page.
            </p>

            {txRef && (
              <div className="mt-6 p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Reference ID
                </span>
                <span className="text-xs font-mono font-semibold text-neutral-800 break-all">
                  {txRef}
                </span>
              </div>
            )}

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleManualRefresh}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Check Status Again
              </button>
            </div>
          </div>
        )}

        {/* State 2: SUCCESS */}
        {status === 'SUCCESS' && payment && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-2">
              Verified Settlement
            </span>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Payment Successful!
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Your payment has been recorded and credited to the stay folio.
            </p>

            {/* Authoritative Receipt Breakdown */}
            <div className="mt-6 rounded-2xl bg-neutral-50 border border-neutral-200 p-4 text-left divide-y divide-neutral-200 text-xs">
              <div className="pb-3 flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Amount Paid</span>
                <span className="text-base font-black text-neutral-900">
                  {Number(payment.amount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  <span className="text-xs text-[#FF385C]">ETB</span>
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Method</span>
                <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#FF385C]" />
                  Chapa Gateway
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Transaction Ref</span>
                <span className="font-mono text-[11px] font-semibold text-neutral-800 break-all">
                  {payment.tx_ref || txRef}
                </span>
              </div>

              {payment.provider_transaction_id && (
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Provider Ref</span>
                  <span className="font-mono text-[11px] font-semibold text-neutral-800">
                    {payment.provider_transaction_id}
                  </span>
                </div>
              )}

              {payment.stay_id && (
                <div className="pt-2.5 flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Associated Stay</span>
                  <span className="font-bold text-[#FF385C]">Stay #{payment.stay_id}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/stays')}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#FF385C] hover:bg-[#E00B41] transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Receipt className="w-4 h-4" />
                Return to Folio
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition flex items-center justify-center gap-2"
              >
                Return to Front Desk
              </button>
            </div>
          </div>
        )}

        {/* State 3: FAILED */}
        {status === 'FAILED' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-9 h-9" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 uppercase tracking-wider mb-2">
              Transaction Incomplete
            </span>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Payment Failed
            </h1>
            <p className="text-sm text-neutral-500 mt-2 max-w-sm mx-auto leading-relaxed">
              No successful payment was confirmed for this transaction. If your account was charged, please retain the reference below and contact reception.
            </p>

            {txRef && (
              <div className="mt-6 p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-left text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Transaction Reference
                </span>
                <span className="font-mono text-xs font-semibold text-neutral-800 mt-1 block break-all">
                  {txRef}
                </span>
                {stayId && (
                  <span className="text-neutral-500 text-[11px] block mt-2">
                    Stay Folio: <span className="font-bold text-neutral-700">#{stayId}</span>
                  </span>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/stays')}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Return to Folio
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition flex items-center justify-center gap-2"
              >
                Return to Front Desk
              </button>
            </div>
          </div>
        )}

        {/* State 4: ERROR / MISSING REFERENCE */}
        {status === 'ERROR' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-9 h-9" />
            </div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight">
              Payment Status Unavailable
            </h1>
            <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
              {errorMessage || 'Unable to retrieve status for this transaction reference.'}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/stays')}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 transition flex items-center justify-center gap-2"
              >
                Return to Stays
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition flex items-center justify-center gap-2"
              >
                Guest Portal Home
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <p className="text-[11px] text-neutral-400 mt-8 text-center">
        Haven House Integrated Hospitality Management &copy; {new Date().getFullYear()}
      </p>
    </div>
  )
}
