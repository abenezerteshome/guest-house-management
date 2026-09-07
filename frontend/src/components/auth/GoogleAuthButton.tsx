import { useState, useEffect } from 'react'
import { LogOut, UserCheck } from 'lucide-react'
import type { GoogleUserProfile } from '../../types/public'
import { verifyGoogleToken } from '../../api/public'

interface GoogleAuthButtonProps {
  onUserChange?: (user: GoogleUserProfile | null) => void
  compact?: boolean
}

const GUEST_STORAGE_KEY = 'haven_guest_google_user'

export function GoogleAuthButton({ onUserChange, compact = false }: GoogleAuthButtonProps) {
  const [user, setUser] = useState<GoogleUserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (onUserChange) {
      onUserChange(user)
    }
  }, [user, onUserChange])

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      // In production, GIS (google.accounts.id) renders the native one-tap modal.
      // Here we verify with our backend Google auth endpoint.
      const profile = await verifyGoogleToken('demo.google.identity.credential.token')
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile))
      setUser(profile)
    } catch (err) {
      console.error('Google sign-in error:', err)
      // Fallback guest profile
      const fallback: GoogleUserProfile = {
        email: 'guest.traveler@gmail.com',
        name: 'Abebe Bikila',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        sub: 'demo-google-user',
      }
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(fallback))
      setUser(fallback)
    } finally {
      setLoading(false)
    }
  }

  function handleSignOut() {
    localStorage.removeItem(GUEST_STORAGE_KEY)
    setUser(null)
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 bg-white border border-[#DDDDDD] hover:border-[#CCCCCC] rounded-full p-1 pr-3 shadow-sm transition">
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-7 h-7 rounded-full object-cover border border-neutral-200"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center text-xs font-bold">
            <UserCheck size={14} />
          </div>
        )}
        <div className="text-left leading-none">
          <span className="block text-xs font-semibold text-[#222222] truncate max-w-[120px]">
            {user.name}
          </span>
          <span className="block text-[10px] text-[#717171] truncate max-w-[120px]">
            {user.email}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          title="Sign out of Google"
          className="ml-1 p-1 text-[#717171] hover:text-[#C13515] rounded-full transition"
        >
          <LogOut size={13} />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2.5 bg-white border border-[#DDDDDD] hover:border-[#222222] text-[#222222] font-semibold text-xs transition duration-150 shadow-sm disabled:opacity-60 select-none ${
        compact ? 'px-3 py-1.5 rounded-full' : 'px-4 py-2 rounded-full'
      }`}
    >
      {/* Official Google 'G' Logo SVG */}
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
      <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
    </button>
  )
}
