import { useState, useEffect } from 'react'
import { UserCog, AlertCircle, ShieldCheck, UserCheck, CheckCircle2, XCircle } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { updateUser } from '../../api/users'
import { getApiError } from '../../api/client'
import type { Role, User } from '../../types/api'

interface EditUserModalProps {
  isOpen: boolean
  user: User | null
  onClose: () => void
  onSuccess: (updatedUser: User) => void
}

export function EditUserModal({ isOpen, user, onClose, onSuccess }: EditUserModalProps) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<Role>('RECEPTION')
  const [email, setEmail] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setUsername(user.username || '')
      setRole(user.role)
      setEmail(user.email || '')
      setIsActive(user.is_active)
      setError('')
    }
  }, [user, isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError('')

    const cleanName = fullName.trim()
    const cleanUsername = username.trim().toLowerCase()
    const cleanEmail = email.trim() || null

    if (!cleanName) {
      setError('Please enter the employee or administrator full name.')
      return
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }

    setLoading(true)
    try {
      const updated = await updateUser(user.id, {
        full_name: cleanName,
        username: cleanUsername,
        role,
        email: cleanEmail,
        is_active: isActive,
      })

      onSuccess(updated)
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Failed to update user account. Please check details.'))
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Staff Account"
      description={`Update role, username, email, and permissions for @${user.username}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-[#FFF7F5] border border-[#F2D1CA] text-xs text-[#C13515] flex items-start gap-2.5">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
            Full Name *
          </label>
          <input
            type="text"
            required
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Yared Mekonen"
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
            Username *
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-sm text-neutral-400 font-semibold select-none">@</span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.@-]/g, ''))}
              placeholder="e.g. yared"
              className="w-full rounded-xl border border-neutral-300 pl-8 pr-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
            />
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Letters, numbers, dots, and underscores only.</p>
        </div>

        {/* System Role Selection */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
            System Role *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setRole('RECEPTION')}
              className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                role === 'RECEPTION'
                  ? 'border-[#FF385C] bg-[#FFF0F2] ring-1 ring-[#FF385C]'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <UserCheck size={18} className={`shrink-0 mt-0.5 ${role === 'RECEPTION' ? 'text-[#FF385C]' : 'text-neutral-500'}`} />
              <div>
                <span className="block text-xs font-bold text-neutral-900">Reception Desk</span>
                <span className="block text-[11px] text-neutral-500 mt-0.5 leading-tight">
                  Stays, guests, logbook & payments
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('ADMIN')}
              className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                role === 'ADMIN'
                  ? 'border-[#FF385C] bg-[#FFF0F2] ring-1 ring-[#FF385C]'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <ShieldCheck size={18} className={`shrink-0 mt-0.5 ${role === 'ADMIN' ? 'text-[#FF385C]' : 'text-neutral-500'}`} />
              <div>
                <span className="block text-xs font-bold text-neutral-900">Administrator</span>
                <span className="block text-[11px] text-neutral-500 mt-0.5 leading-tight">
                  Full access, reports & settings
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
            Email Address <span className="text-neutral-400 font-normal">(Optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. Yaredmekonen96@gmail.com"
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
          />
          <p className="text-[11px] text-neutral-500 mt-1">Can be used directly to sign into the system.</p>
        </div>

        {/* Account Status */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
            Account Status
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setIsActive(true)}
              className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500 text-emerald-900'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
              }`}
            >
              <CheckCircle2 size={16} className={isActive ? 'text-emerald-600' : 'text-neutral-400'} />
              <span className="text-xs font-bold">Active Account</span>
            </button>

            <button
              type="button"
              onClick={() => setIsActive(false)}
              className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                !isActive
                  ? 'border-neutral-500 bg-neutral-100 ring-1 ring-neutral-500 text-neutral-900'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
              }`}
            >
              <XCircle size={16} className={!isActive ? 'text-neutral-600' : 'text-neutral-400'} />
              <span className="text-xs font-bold">Disabled Account</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="gap-2"
          >
            <UserCog size={16} />
            {loading ? 'Saving changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
