import { useState } from 'react'
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  User,
} from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { publicChangePassword, adminOverrideResetPassword } from '../../api/auth'
import { getApiError } from '../../api/client'

interface LoginChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialUsername?: string
  onSuccess: (message: string, username: string) => void
}

type TabType = 'SELF_SERVICE' | 'ADMIN_OVERRIDE'

export function LoginChangePasswordModal({
  isOpen,
  onClose,
  initialUsername = '',
  onSuccess,
}: LoginChangePasswordModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('SELF_SERVICE')

  // Tab 1: Self-Service states
  const [selfUsername, setSelfUsername] = useState(initialUsername)
  const [currentPassword, setCurrentPassword] = useState('')
  const [selfNewPassword, setSelfNewPassword] = useState('')
  const [selfConfirmPassword, setSelfConfirmPassword] = useState('')

  // Tab 2: Admin Override states
  const [targetUsername, setTargetUsername] = useState(initialUsername)
  const [overrideNewPassword, setOverrideNewPassword] = useState('')
  const [overrideConfirmPassword, setOverrideConfirmPassword] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  // UI helpers
  const [showPasswords, setShowPasswords] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selfUsername.trim()) {
      setError('Please enter your username.')
      return
    }
    if (!currentPassword) {
      setError('Please enter your current password.')
      return
    }
    if (selfNewPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (selfNewPassword !== selfConfirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setSubmitting(true)
    try {
      const res = await publicChangePassword({
        username: selfUsername.trim(),
        current_password: currentPassword,
        new_password: selfNewPassword,
      })
      onSuccess(res.message, res.username)
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Failed to change password. Please verify your credentials.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdminOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!targetUsername.trim()) {
      setError('Please enter the staff username to reset.')
      return
    }
    if (overrideNewPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (overrideNewPassword !== overrideConfirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    if (!adminUsername.trim() || !adminPassword) {
      setError('Administrator username and password are required for authorization.')
      return
    }

    setSubmitting(true)
    try {
      const res = await adminOverrideResetPassword({
        target_username: targetUsername.trim(),
        new_password: overrideNewPassword,
        admin_username: adminUsername.trim(),
        admin_password: adminPassword,
      })
      onSuccess(res.message, res.username)
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Failed to reset password. Please verify administrator credentials.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Password Management"
      description="Update your personal password or authorize a front-desk shift reset."
      size="md"
    >
      <div className="space-y-4">
        {/* TAB TOGGLE */}
        <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('SELF_SERVICE')
              setError(null)
            }}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'SELF_SERVICE'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <KeyRound size={13} className={activeTab === 'SELF_SERVICE' ? 'text-rose-600' : ''} />
            <span>I Know Current Password</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('ADMIN_OVERRIDE')
              setError(null)
            }}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ADMIN_OVERRIDE'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <ShieldCheck size={13} className={activeTab === 'ADMIN_OVERRIDE' ? 'text-amber-600' : ''} />
            <span>Admin Shift Override</span>
          </button>
        </div>

        {/* ERROR NOTIFICATION */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: SELF-SERVICE (REQUIRES CURRENT PASSWORD) */}
        {activeTab === 'SELF_SERVICE' && (
          <form onSubmit={handleSelfSubmit} className="space-y-3.5">
            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-600 flex items-start gap-2">
              <UserCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Enter your username and existing password to set a new password for your account.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Username or Account
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. reception or admin"
                  value={selfUsername}
                  onChange={(e) => setSelfUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-stone-900 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-stone-900 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  New Password
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  value={selfNewPassword}
                  onChange={(e) => setSelfNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-stone-900 shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Re-enter password"
                  value={selfConfirmPassword}
                  onChange={(e) => setSelfConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-stone-900 shadow-2xs"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs px-4 py-2"
              >
                {submitting ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: ADMIN SHIFT OVERRIDE (FORGOTTEN PASSWORD) */}
        {activeTab === 'ADMIN_OVERRIDE' && (
          <form onSubmit={handleAdminOverrideSubmit} className="space-y-3.5">
            <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
              <ShieldCheck size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                Use this when staff forgot their password. The on-duty Administrator must authorize the reset.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Staff Username to Reset
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. reception"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  New Password for Staff
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  value={overrideNewPassword}
                  onChange={(e) => setOverrideNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Re-enter password"
                  value={overrideConfirmPassword}
                  onChange={(e) => setOverrideConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 shadow-2xs"
                />
              </div>
            </div>

            {/* ADMIN AUTHORIZATION CREDENTIALS */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/90 space-y-2.5 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={12} className="text-amber-600" />
                  Manager / Admin Authorization
                </span>
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-[11px] font-medium text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                >
                  {showPasswords ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showPasswords ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">
                    Admin Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">
                    Admin Password
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    placeholder="Admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2"
              >
                {submitting ? 'Authorizing...' : 'Authorize & Reset'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
