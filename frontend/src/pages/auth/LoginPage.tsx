import { useState } from 'react'
import { Eye, EyeOff, HelpCircle, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'

export function LoginPage() {
  const { login, user, isAuthenticated, logout } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      window.location.href = '/dashboard'
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Unable to sign in. Please verify your credentials and connection.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col justify-between selection:bg-[#FFF0F2] selection:text-[#FF385C]">
      {/* Top Header */}
      <header className="w-full h-18 sm:h-20 px-6 sm:px-12 flex items-center justify-between border-b border-[#EEEEEE] bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF385C] flex items-center justify-center text-white shadow-xs">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <span className="block text-base font-bold text-[#222222] tracking-tight leading-tight">
              Haven House
            </span>
            <span className="block text-[11px] font-medium text-[#717171]">
              Guest House Management System
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#717171] hover:text-[#222222] transition-colors py-2 px-3 rounded-full hover:bg-[#F7F7F7]"
        >
          <HelpCircle size={15} />
          <span>Help & Support</span>
        </button>
      </header>

      {/* Main Centered Login Section */}
      <main className="flex-1 flex items-center justify-center p-6 py-12 sm:py-16">
        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#DDDDDD] p-7 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            {isAuthenticated && user ? (
              /* Already Signed In View */
              <div className="text-center space-y-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF9EB] text-[#008A05] text-xs font-semibold">
                  <ShieldCheck size={13} />
                  <span>Currently Signed In</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#222222] tracking-tight">
                    Welcome back, {user.full_name}
                  </h1>
                  <p className="text-xs text-[#717171] mt-1.5">
                    Signed in as <strong>{user.role === 'ADMIN' ? 'Administrator' : 'Receptionist'}</strong> (@{user.username}).
                  </p>
                </div>
                <div className="space-y-2.5 pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full h-11 text-xs font-semibold rounded-xl"
                    onClick={() => { window.location.href = '/dashboard' }}
                  >
                    Continue to Dashboard
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full h-11 text-xs font-semibold rounded-xl text-[#C13515] border-[#DDDDDD] hover:bg-[#FFF7F5]"
                    onClick={() => logout()}
                  >
                    Sign Out / Switch User
                  </Button>
                </div>
              </div>
            ) : (
              /* Normal Sign In Form */
              <>
                {/* Greeting & Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F2] text-[#FF385C] text-xs font-semibold mb-3">
                    <ShieldCheck size={13} />
                    <span>Staff Login</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight">
                    Welcome back
                  </h1>
                  <p className="text-sm text-[#717171] mt-1.5 leading-relaxed">
                    Sign in to manage your guest house operations.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Username field */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="username"
                      className="block text-xs font-semibold text-[#222222]"
                    >
                      Username or Email
                    </label>
                    <div className="relative flex items-center h-12 rounded-xl border border-[#DDDDDD] hover:border-[#B0B0B0] focus-within:border-[#222222] focus-within:ring-1 focus-within:ring-[#222222] bg-white px-3.5 transition-all">
                      <UserRound size={17} className="text-[#717171] shrink-0 mr-2.5" />
                      <input
                        id="username"
                        required
                        autoFocus
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. admin@guesthousemail.com or admin"
                        className="w-full bg-transparent text-sm text-[#222222] placeholder:text-[#999999] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="block text-xs font-semibold text-[#222222]"
                      >
                        Password
                      </label>
                    </div>
                    <div className="relative flex items-center h-12 rounded-xl border border-[#DDDDDD] hover:border-[#B0B0B0] focus-within:border-[#222222] focus-within:ring-1 focus-within:ring-[#222222] bg-white px-3.5 transition-all">
                      <LockKeyhole size={17} className="text-[#717171] shrink-0 mr-2.5" />
                      <input
                        id="password"
                        required
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-transparent text-sm text-[#222222] placeholder:text-[#999999] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="p-1 text-[#717171] hover:text-[#222222] focus:outline-none transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div
                      role="alert"
                      className="p-3.5 rounded-xl bg-[#FFF7F5] border border-[#F2D1CA] text-xs text-[#C13515] leading-relaxed flex items-start gap-2.5"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C13515] mt-1.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={submitting}
                    className="w-full h-12 text-sm font-semibold rounded-xl mt-2"
                  >
                    {submitting ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              </>
            )}

            {/* Note */}
            <div className="mt-8 pt-6 border-t border-[#F0F0F0] text-center">
              <span className="text-xs text-[#717171] flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#008A05]" />
                Staff access only · Haven Guest House Management System
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 text-center text-xs text-[#717171] border-t border-[#EEEEEE]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Haven House. All rights reserved.</span>
          <div className="flex items-center gap-4 text-xs text-[#717171]">
            <span>Privacy</span>
            <span>·</span>
            <span>Terms</span>
            <span>·</span>
            <span>Guest House Management System</span>
          </div>
        </div>
      </footer>

      {/* Help Modal */}
      <Modal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Haven House Staff Support"
        description="Assistance with account access and operational desk procedures."
      >
        <div className="space-y-4 text-sm text-[#222222]">
          <div className="p-3.5 rounded-xl bg-[#F7F7F7] border border-[#DDDDDD]">
            <strong className="block text-xs font-bold uppercase tracking-wider text-[#717171] mb-1">
              Account Credentials
            </strong>
            <p className="text-xs text-[#717171] leading-relaxed">
              Standard credentials are provided to designated staff members by the Guest House Administrator. If you have forgotten your password or need a role change, contact your general manager.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F7F7F7] border border-[#DDDDDD]">
            <strong className="block text-xs font-bold uppercase tracking-wider text-[#717171] mb-1">
              Server Connectivity
            </strong>
            <p className="text-xs text-[#717171] leading-relaxed">
              Ensure the Haven House backend service is active and reachable at <code className="text-[#FF385C] bg-white px-1.5 py-0.5 rounded border border-[#DDDDDD]">http://localhost:8000</code>.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}