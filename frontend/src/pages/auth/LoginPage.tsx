import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, HelpCircle, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { LoginChangePasswordModal } from '../../components/modals/LoginChangePasswordModal'

const DEFAULT_GOOGLE_CLIENT_ID =
  '103591637790-8abooait8kaehgn1erto293u4mh0u9rb.apps.googleusercontent.com'

export function LoginPage() {
  const { login, loginWithGoogle, user, isAuthenticated, logout } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID
    if (!clientId) return

    let intervalId: number | undefined
    let initialized = false

    function initGsi() {
      if (initialized) return
      if (window.google?.accounts?.id && googleBtnRef.current) {
        initialized = true
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            if (!response.credential) return
            setError('')
            setGoogleSubmitting(true)
            try {
              await loginWithGoogle(response.credential)
              window.location.href = '/dashboard'
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : 'Google sign-in failed. Please verify your account.'
              )
            } finally {
              setGoogleSubmitting(false)
            }
          },
        })

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = ''
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: '360',
          })
        }

        if (intervalId) clearInterval(intervalId)
      }
    }

    initGsi()
    if (!window.google?.accounts?.id) {
      intervalId = window.setInterval(initGsi, 200)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [loginWithGoogle])

  async function handleGoogleClick() {
    setError('')
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError(
        'Google OAuth Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.'
      )
      return
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    } else {
      setError('Google Identity Services is loading. Please check your internet connection and try again.')
    }
  }

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
              Family Guest House
            </span>
            <span className="block text-[11px] font-medium text-[#717171]">
              Management System
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
                      <button
                        type="button"
                        onClick={() => {
                          setChangePasswordOpen(true)
                          setSuccessMessage(null)
                        }}
                        className="text-xs font-semibold text-[#FF385C] hover:text-[#E00B41] transition-colors cursor-pointer"
                      >
                        Change or reset?
                      </button>
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

                  {/* Success Message */}
                  {successMessage && (
                    <div
                      role="status"
                      className="p-3.5 rounded-xl bg-[#EBF9EB] border border-[#C6E7C6] text-xs text-[#008A05] leading-relaxed flex items-start gap-2.5"
                    >
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}

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
                    {submitting ? 'Signing in...' : 'Sign in to Front Desk'}
                  </Button>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#EEEEEE]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-3 text-[11px] font-semibold text-[#717171] tracking-wider uppercase">
                        Or Administrator SSO
                      </span>
                    </div>
                  </div>

                  {/* Administrator Google SSO */}
                  <div className="space-y-2">
                    <div className="flex justify-center w-full min-h-[44px]">
                      {import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID ? (
                        <div ref={googleBtnRef} className="flex justify-center w-full" />
                      ) : (
                        <button
                          type="button"
                          id="google-admin-login-btn"
                          disabled={googleSubmitting}
                          onClick={handleGoogleClick}
                          className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-[#DDDDDD] bg-white hover:bg-[#F9F9F9] active:bg-[#F0F0F0] text-sm font-semibold text-[#222222] shadow-xs hover:border-[#B0B0B0] transition-all cursor-pointer disabled:opacity-60"
                        >
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                            />
                          </svg>
                          <span>{googleSubmitting ? 'Verifying Admin...' : 'Continue with Google (Admin Only)'}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-center text-[#717171] leading-tight">
                      Restricted to authorized administrator accounts. Front desk staff please use credentials above.
                    </p>
                  </div>
                </form>
              </>
            )}

            {/* Note */}
            <div className="mt-8 pt-6 border-t border-[#F0F0F0] text-center">
              <span className="text-xs text-[#717171] flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#008A05]" />
                Staff access only · Family Guest House Management System
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 text-center text-xs text-[#717171] border-t border-[#EEEEEE]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Family Guest House. All rights reserved.</span>
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
        title="Need Sign In Help?"
        description="Here is how to get access to your account."
      >
        <div className="space-y-4 text-xs text-[#717171] leading-relaxed">
          <p>
            <strong className="text-[#222222]">Default Accounts:</strong>
            <br />
            • Administrator: username <code className="bg-[#F7F7F7] px-1.5 py-0.5 rounded font-mono">admin</code>
            <br />
            • Reception Desk: username <code className="bg-[#F7F7F7] px-1.5 py-0.5 rounded font-mono">reception</code>
          </p>
          <p>
            <strong className="text-[#222222]">Forgotten Passwords:</strong>
            <br />
            Click <strong>"Change or reset?"</strong> on the login screen to update your password with your current password or request an Administrator Shift Override.
          </p>
          <div className="pt-2 border-t border-[#F0F0F0]">
            <p className="text-[11px] text-[#999999]">
              Family Guest House Front Desk &bull; Internal System
            </p>
          </div>
        </div>
      </Modal>

      {/* Change / Reset Password Modal */}
      <LoginChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        initialUsername={username}
        onSuccess={(msg, updatedUsername) => {
          setSuccessMessage(msg)
          if (updatedUsername) setUsername(updatedUsername)
          setPassword('')
          setError('')
        }}
      />
    </div>
  )
}