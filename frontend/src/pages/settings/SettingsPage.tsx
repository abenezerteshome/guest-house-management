import { useState, useEffect } from 'react'
import {
  Clock,
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { getSettings, updateSettings } from '../../api/settings'
import { useAuth } from '../../hooks/useAuth'
import type { SettingsData } from '../../types/api'

export function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [_settings, setSettings] = useState<SettingsData | null>(null)
  const [deadlineHour, setDeadlineHour] = useState<number>(4)
  const [deadlineMinute, setDeadlineMinute] = useState<number>(0)
  const [penalty, setPenalty] = useState<string>('600')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    getSettings()
      .then((data) => {
        setSettings(data)
        setDeadlineHour(data.checkout_deadline_hour)
        setDeadlineMinute(data.checkout_deadline_minute)
        setPenalty(String(data.late_checkout_penalty))
      })
      .catch((err) => {
        console.error('Failed to load settings:', err)
        setErrorMsg('Could not fetch server settings.')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) return

    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      const updated = await updateSettings({
        checkout_deadline_hour: Number(deadlineHour),
        checkout_deadline_minute: Number(deadlineMinute),
        late_checkout_penalty: Number(penalty),
      })
      setSettings(updated)
      setSuccessMsg('Settings updated successfully!')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to save settings.'
      setErrorMsg(msg)
    } finally {
      setSaving(false)
    }
  }

  const formatDeadline = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h % 12 === 0 ? 12 : h % 12
    const displayMin = m.toString().padStart(2, '0')
    return `${displayHour}:${displayMin} ${period}`
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Property Settings & Policies"
        subtitle="Manage checkout cutoff deadlines, late check-out penalties, and manual payment channels."
      />

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Checkout Deadline Policy Card */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Late Checkout Penalty Rule</h3>
              <p className="text-xs text-neutral-500">
                Automated guest folio charge if check-out occurs after the deadline.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FF385C]/10 text-[#FF385C]">
            Active Rule: {formatDeadline(deadlineHour, deadlineMinute)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
              Checkout Deadline Hour (0-23) *
            </label>
            <input
              type="number"
              min="0"
              max="23"
              required
              disabled={!isAdmin || loading}
              value={deadlineHour}
              onChange={(e) => setDeadlineHour(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C] disabled:bg-neutral-100"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Set to 4 for 04:00 AM (Yonas standard specification)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
              Checkout Deadline Minute (0-59) *
            </label>
            <input
              type="number"
              min="0"
              max="59"
              required
              disabled={!isAdmin || loading}
              value={deadlineMinute}
              onChange={(e) => setDeadlineMinute(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C] disabled:bg-neutral-100"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Default 0 (04:00 AM sharp)</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
            Late Checkout Penalty Charge (ETB) *
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="1"
              required
              disabled={!isAdmin || loading}
              value={penalty}
              onChange={(e) => setPenalty(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C] disabled:bg-neutral-100"
            />
            <span className="absolute right-3.5 top-2.5 text-xs font-bold text-neutral-400">ETB</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Yonas specification: 600 ETB automatically added to folio upon late checkout.
          </p>
        </div>

        {isAdmin ? (
          <div className="flex justify-end pt-2">
            <Button variant="primary" type="submit" isLoading={saving} className="gap-2">
              <Save className="w-4 h-4" />
              Save Configuration
            </Button>
          </div>
        ) : (
          <p className="text-xs text-neutral-500 italic">
            * Administrator role is required to modify policy parameters.
          </p>
        )}
      </form>

      {/* Manual Payment Channels & Policy Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Manual Payment Recording Channels</h3>
              <p className="text-xs text-neutral-500">
                Authorized front-desk cashier logging channels for guest settlements.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-800">Physical Cash & Currency</span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                Front Desk Drawer
              </span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Standard cash receipts in Ethiopian Birr (ETB) verified and recorded immediately upon guest check-in or check-out.
            </p>
            <div className="mt-3 pt-3 border-t border-neutral-200 flex items-center justify-between text-xs">
              <span className="text-neutral-500">Receipt Logging</span>
              <span className="font-medium text-neutral-800">Direct Folio Settlement</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-800">Local Mobile Money & Bank</span>
              <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-200 px-2 py-0.5 rounded-full">
                Cashier Assisted
              </span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Manual transaction logging for Telebirr QR/USSD, CBE Birr, and Bank Wire slips with durable reference tracking.
            </p>
            <div className="mt-3 pt-3 border-t border-neutral-200 flex items-center justify-between text-xs">
              <span className="text-neutral-500">Supported Methods</span>
              <span className="font-medium text-neutral-800">CASH, TELEBIRR, CBE, BANK, CREDIT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
