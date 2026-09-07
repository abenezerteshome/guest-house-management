import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, User as UserIcon, Lock, AlertCircle, Mail, Phone } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { useAuth } from '../../hooks/useAuth'
import { useGuestAuth } from '../../hooks/useGuestAuth'

interface GuestAuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'signin' | 'register'
}

export function GuestAuthModal({ isOpen, onClose, initialMode = 'signin' }: GuestAuthModalProps) {
  const navigate = useNavigate()
  const { login: staffLogin } = useAuth()
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useGuestAuth()

  const [mode, setMode] = useState<'signin' | 'register'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  function switchMode(newMode: 'signin' | 'register') {
    setMode(newMode)
    setError(null)
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    const userIdent = username.trim()
    try {
      // Primary: Authenticate with Haven House system (staff/admin)
      await staffLogin(userIdent, password)
      onClose()
      navigate('/dashboard')
    } catch (staffErr) {
      if (userIdent.includes('@')) {
        try {
          await loginWithEmail({ identifier: userIdent, password })
          onClose()
          return
        } catch {
          // fall through to display clean error
        }
      }
      const message = staffErr instanceof Error ? staffErr.message : 'Invalid username or password.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await registerWithEmail({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      })
      onClose()
    } catch (regErr) {
      setError(regErr instanceof Error ? regErr.message : 'Failed to register account.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleAuth() {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await loginWithGoogle()
      onClose()
    } catch (gErr) {
      setError(gErr instanceof Error ? gErr.message : 'Google authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'signin' ? 'Sign in to Haven House' : 'Create a Guest Account'}
      description={
        mode === 'signin'
          ? 'Access your bookings, receipts, and enjoy faster reservations.'
          : 'Join Haven House to track your stays, receipts, and save preferences.'
      }
      maxWidth="md"
    >
      <div className="space-y-5 pt-1">
        {/* Tab switch */}
        <div className="flex rounded-xl bg-[#F7F7F7] p-1 border border-[#EBEBEB]">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-white text-[#222222] shadow-xs'
                : 'text-[#717171] hover:text-[#222222]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white text-[#222222] shadow-xs'
                : 'text-[#717171] hover:text-[#222222]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="p-3 rounded-xl bg-[#FFF7F5] border border-[#F2D1CA] text-xs text-[#C13515] flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Mode: Sign In */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="login-username" className="block text-xs font-semibold text-[#222222]">
                Username
              </label>
              <div className="relative flex items-center h-11 rounded-xl border border-[#DDDDDD] px-3 focus-within:border-[#222222] focus-within:ring-1 focus-within:ring-[#222222] transition">
                <UserIcon size={15} className="text-[#717171] mr-2 shrink-0" />
                <input
                  id="login-username"
                  name="username"
                  required
                  autoFocus
                  autoComplete="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or reception"
                  disabled={loading}
                  className="w-full text-xs text-[#222222] focus:outline-none bg-transparent placeholder:text-[#999999]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#222222]">
                  Password
                </label>
              </div>
              <div className="relative flex items-center h-11 rounded-xl border border-[#DDDDDD] px-3 focus-within:border-[#222222] focus-within:ring-1 focus-within:ring-[#222222] transition">
                <Lock size={15} className="text-[#717171] mr-2 shrink-0" />
                <input
                  id="login-password"
                  name="password"
                  required
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="w-full text-xs text-[#222222] focus:outline-none bg-transparent placeholder:text-[#999999]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#717171] hover:text-[#222222] p-1"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
              className="w-full h-11 text-xs font-semibold rounded-xl mt-1"
            >
              Sign In
            </Button>
          </form>
        )}

        {/* Mode: Register */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#222222]">
                Full Name
              </label>
              <div className="relative flex items-center h-11 rounded-xl border border-[#DDDDDD] px-3 focus-within:border-[#222222] focus-within:ring-1 focus-within:ring-[#222222] transition">
                <UserIcon size={15} className="text-[#717171] mr-2 shrink-0" />
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Abebe Bikila"
                  className="w-full text-xs text-[#222222] focus:outline-none bg-transparent placeholder:text-[#999999]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#222222]">
                Email Address
              </label>
              <div className="relative flex items-center h-11 rounded-xl border border-[#DDDDDD] px-3 focus-within:border-[#222222] focus-within:ring-1 focus-within:ring-[#222222] transition">
                <Mail size={15} className="text-[#717171] mr-2 shrink-0" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. abebe@gmail.com"
                  className="w-full text-xs text-[#222222] focus:outline-none bg-transparent placeholder:text-[#999999]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#222222]">
                Phone Number
              </label>
              <div className="relative flex items-center h-11 rounded-xl border border-[#DDDDDD] px-3 focus-within:border-[#222222] focus-within:ring-1 focus-within:ring-[#222222] transition">
                <Phone size={15} className="text-[#717171] mr-2 shrink-0" />
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +251 91 122 3344"
                  className="w-full text-xs text-[#222222] focus:outline-none bg-transparent placeholder:text-[#999999]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#222222]">
                Create Password
              </label>
              <div className="relative flex items-center h-11 rounded-xl border border-[#DDDDDD] px-3 focus-within:border-[#222222] focus-within:ring-1 focus-within:ring-[#222222] transition">
                <Lock size={15} className="text-[#717171] mr-2 shrink-0" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  minLength={4}
                  className="w-full text-xs text-[#222222] focus:outline-none bg-transparent placeholder:text-[#999999]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#717171] hover:text-[#222222] p-1"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full h-11 text-xs font-semibold rounded-xl mt-1"
            >
              Create Account
            </Button>
          </form>
        )}

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#EBEBEB] w-full" />
          <span className="bg-white px-3 text-[11px] text-[#717171] uppercase tracking-wider absolute">
            or
          </span>
        </div>

        {/* Google One-Click Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl border border-[#DDDDDD] hover:border-[#222222] hover:bg-[#F7F7F7] text-xs font-semibold text-[#222222] transition duration-150 shadow-xs"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}</span>
        </button>

        {/* Footer switch link */}
        <div className="text-center pt-2">
          {mode === 'signin' ? (
            <p className="text-xs text-[#717171]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-[#FF385C] font-semibold hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-xs text-[#717171]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-[#FF385C] font-semibold hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
