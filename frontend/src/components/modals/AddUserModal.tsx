import { useState } from 'react'
import { UserPlus, AlertCircle, Eye, EyeOff, ShieldCheck, UserCheck } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { createUser } from '../../api/users'
import { getApiError } from '../../api/client'
import type { Role, User } from '../../types/api'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newUser: User) => void
}

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('RECEPTION')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function resetForm() {
    setFullName('')
    setUsername('')
    setPassword('')
    setRole('RECEPTION')
    setEmail('')
    setShowPassword(false)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleanName = fullName.trim()
    const cleanUsername = username.trim().toLowerCase()
    const cleanPassword = password.trim()
    const cleanEmail = email.trim() || null

    if (!cleanName) {
      setError('Please enter the employee or administrator full name.')
      return
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setError('Initial password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const newUser = await createUser({
        full_name: cleanName,
        username: cleanUsername,
        password: cleanPassword,
        role,
        email: cleanEmail,
      })

      onSuccess(newUser)
      resetForm()
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Failed to create user account. Please verify credentials.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm()
        onClose()
      }}
      title="Create Staff Account"
      description="Add a new administrator or front-desk receptionist to the system."
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

        {/* Role Selection */}
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

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
            Initial Password *
          </label>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-xl border border-neutral-300 pl-3.5 pr-10 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 p-1 text-neutral-400 hover:text-neutral-700 transition"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Staff will use this password to sign in.</p>
        </div>

        {/* Optional Email */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
            Email Address <span className="text-neutral-400 font-normal">(Optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. staff@guesthouse.com"
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm()
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="gap-2"
          >
            <UserPlus size={16} />
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
