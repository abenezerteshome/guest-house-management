import { useState } from 'react'
import { Eye, EyeOff, KeyRound, X } from 'lucide-react'
import { changeOwnPassword, resetUserPassword } from '../../api/users'
import { getApiError } from '../../api/client'
import { Button } from '../common/Button'
import type { User } from '../../types/api'

interface ChangePasswordModalProps {
  user: User
  adminReset?: boolean
  onClose: () => void
  onSaved?: (user: User) => void
}

export function ChangePasswordModal({ user, adminReset = false, onClose, onSaved }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (newPassword !== confirmation) {
      setError('New passwords do not match.')
      return
    }
    setSaving(true)
    try {
      const updated = adminReset
        ? await resetUserPassword(user.id, newPassword)
        : await changeOwnPassword(currentPassword, newPassword)
      onSaved?.(updated)
      onClose()
    } catch (requestError) {
      setError(getApiError(requestError, 'Could not change the password.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="password-dialog-title">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0F2] text-[#FF385C]"><KeyRound size={19} /></div>
            <div>
              <h2 id="password-dialog-title" className="text-lg font-bold text-[#222222]">{adminReset ? 'Set staff password' : 'Change your password'}</h2>
              <p className="text-xs text-[#717171]">{adminReset ? `Set a new password for ${user.full_name}.` : 'Use at least 6 characters.'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#717171] hover:bg-[#F7F7F7]" aria-label="Close password dialog"><X size={18} /></button>
        </div>

        <div className="mt-6 space-y-4">
          {!adminReset && (
            <label className="block text-sm font-medium text-[#222222]">
              Current password
              <input required type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DDDDDD] px-3.5 py-2.5 focus:border-[#FF385C] focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20" autoComplete="current-password" />
            </label>
          )}
          <label className="block text-sm font-medium text-[#222222]">
            New password
            <input required minLength={6} maxLength={128} type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DDDDDD] px-3.5 py-2.5 focus:border-[#FF385C] focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20" autoComplete="new-password" />
          </label>
          <label className="block text-sm font-medium text-[#222222]">
            Confirm new password
            <input required minLength={6} maxLength={128} type={showPasswords ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DDDDDD] px-3.5 py-2.5 focus:border-[#FF385C] focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20" autoComplete="new-password" />
          </label>
          <button type="button" onClick={() => setShowPasswords((visible) => !visible)} className="flex items-center gap-2 text-xs font-medium text-[#717171] hover:text-[#222222]">
            {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPasswords ? 'Hide passwords' : 'Show passwords'}
          </button>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{adminReset ? 'Set password' : 'Update password'}</Button>
        </div>
      </form>
    </div>
  )
}
