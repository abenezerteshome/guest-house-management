import { useState, useEffect } from 'react'
import {
  Clock,
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserPlus,
  Users,
  ShieldCheck,
  UserCheck,
  Power,
  Pencil,
  Building2,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { getSettings, updateSettings } from '../../api/settings'
import { listUsers, activateUser, deactivateUser } from '../../api/users'
import { ChangePasswordModal } from '../../components/modals/ChangePasswordModal'
import { AddUserModal } from '../../components/modals/AddUserModal'
import { EditUserModal } from '../../components/modals/EditUserModal'
import { useAuth } from '../../hooks/useAuth'
import type { SettingsData, User } from '../../types/api'

export function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [_settings, setSettings] = useState<SettingsData | null>(null)
  const [propertyName, setPropertyName] = useState<string>('')
  const [currency, setCurrency] = useState<string>('ETB')
  const [contactPhone, setContactPhone] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [deadlineHour, setDeadlineHour] = useState<number>(4)
  const [deadlineMinute, setDeadlineMinute] = useState<number>(0)
  const [penalty, setPenalty] = useState<string>('600')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [staff, setStaff] = useState<User[]>([])
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [addUserOpen, setAddUserOpen] = useState(false)

  async function handleToggleActive(targetUser: import('../../types/api').User) {
    if (targetUser.id === user?.id) {
      setErrorMsg('You cannot deactivate your own active session.')
      return
    }
    try {
      const updated = targetUser.is_active
        ? await deactivateUser(targetUser.id)
        : await activateUser(targetUser.id)
      setStaff((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      setSuccessMsg(`User @${updated.username} is now ${updated.is_active ? 'Active' : 'Disabled'}.`)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch {
      setErrorMsg('Failed to update user status.')
    }
  }

  useEffect(() => {
    getSettings()
      .then((data) => {
        setSettings(data)
        setPropertyName(data.property_name || '')
        setCurrency(data.currency || 'ETB')
        setContactPhone(data.contact_phone || '')
        setAddress(data.address || '')
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

  useEffect(() => {
    if (isAdmin) listUsers().then(setStaff).catch(() => setErrorMsg('Could not load staff accounts.'))
  }, [isAdmin])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) return

    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      const updated = await updateSettings({
        property_name: propertyName.trim(),
        currency: currency.trim() || 'ETB',
        contact_phone: contactPhone.trim() || null,
        address: address.trim() || null,
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
        title="Guest House Settings & Policies"
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

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6">
        {/* Property Profile & Info */}
        <div className="border-b border-neutral-200 pb-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Property Information</h3>
              <p className="text-xs text-neutral-500">
                General guest house details displayed on guest folios, receipts, and system headers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Property Name *
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin || loading}
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g. Family Guest House"
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C] disabled:bg-neutral-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Operating Currency Code *
              </label>
              <input
                type="text"
                required
                maxLength={10}
                disabled={!isAdmin || loading}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="e.g. ETB or USD"
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C] disabled:bg-neutral-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Contact Phone
              </label>
              <input
                type="text"
                disabled={!isAdmin || loading}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+251 911 234567"
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C] disabled:bg-neutral-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Physical Address / Location
              </label>
              <input
                type="text"
                disabled={!isAdmin || loading}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Bole Subcity, Addis Ababa"
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C] disabled:bg-neutral-100"
              />
            </div>
          </div>
        </div>

        {/* Checkout Deadline Policy */}
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
              {saving ? 'Saving configuration...' : 'Save Configuration'}
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

      {isAdmin && (
        <section className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0F2] text-[#FF385C]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Staff & Access Management</h3>
                <p className="text-xs text-neutral-500">
                  Manage employee login credentials, assigned roles, and access status.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="gap-2 shrink-0 self-start sm:self-auto"
              onClick={() => setAddUserOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
              Add New User
            </Button>
          </div>

          <div className="divide-y divide-neutral-100">
            {staff.map((staffUser) => {
              const isCurrentSession = staffUser.id === user?.id
              const isAdminRole = staffUser.role === 'ADMIN'

              return (
                <div key={staffUser.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isAdminRole ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {staffUser.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-sm font-bold text-neutral-900">{staffUser.full_name}</p>
                        {isCurrentSession && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                            You
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isAdminRole
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {isAdminRole ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {isAdminRole ? 'Administrator' : 'Reception Desk'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            staffUser.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                          }`}
                        >
                          {staffUser.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        @{staffUser.username} {staffUser.email ? `· ${staffUser.email}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300"
                      onClick={() => setEditUser(staffUser)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-neutral-500" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setPasswordUser(staffUser)}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Set password
                    </Button>

                    {!isCurrentSession && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`gap-1.5 text-xs ${
                          staffUser.is_active
                            ? 'text-neutral-600 hover:text-rose-600 hover:border-rose-300'
                            : 'text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300'
                        }`}
                        onClick={() => handleToggleActive(staffUser)}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {staffUser.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {passwordUser && (
        <ChangePasswordModal user={passwordUser} adminReset onClose={() => setPasswordUser(null)} />
      )}

      {editUser && (
        <EditUserModal
          isOpen={Boolean(editUser)}
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={(updatedUser) => {
            setStaff((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
            setSuccessMsg(`Staff account '@${updatedUser.username}' updated successfully!`)
            setTimeout(() => setSuccessMsg(''), 4000)
          }}
        />
      )}

      <AddUserModal
        isOpen={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onSuccess={(newUser) => {
          setStaff((prev) => [newUser, ...prev])
          setSuccessMsg(`Staff account '@${newUser.username}' created successfully!`)
          setTimeout(() => setSuccessMsg(''), 4000)
        }}
      />
    </div>
  )
}
