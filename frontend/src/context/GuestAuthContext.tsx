import { useState, useEffect, ReactNode } from 'react'
import type { GuestUserProfile, GuestRegisterData, GuestLoginData } from '../types/public'
import { guestLogin, guestRegister, verifyGoogleToken } from '../api/public'
import { GuestAuthContext } from './guest-auth-context'

const GUEST_STORAGE_KEY = 'haven_guest_user'
const LEGACY_GOOGLE_KEY = 'haven_guest_google_user'

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  const [guestUser, setGuestUser] = useState<GuestUserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY)
      if (stored) return JSON.parse(stored)
      const legacyGoogle = localStorage.getItem(LEGACY_GOOGLE_KEY)
      if (legacyGoogle) {
        const parsed = JSON.parse(legacyGoogle)
        return {
          name: parsed.name,
          email: parsed.email,
          picture: parsed.picture,
          provider: 'google',
        }
      }
      return null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (guestUser) {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser))
    } else {
      localStorage.removeItem(GUEST_STORAGE_KEY)
      localStorage.removeItem(LEGACY_GOOGLE_KEY)
    }
  }, [guestUser])

  function clearError() {
    setError(null)
  }

  async function loginWithEmail(data: GuestLoginData) {
    setLoading(true)
    setError(null)
    try {
      const user = await guestLogin(data)
      setGuestUser(user)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined
      const errorMessage = msg || (err instanceof Error ? err.message : 'Invalid credentials. Please try again.')
      setError(errorMessage)
      throw new Error(errorMessage, { cause: err })
    } finally {
      setLoading(false)
    }
  }

  async function registerWithEmail(data: GuestRegisterData) {
    setLoading(true)
    setError(null)
    try {
      const user = await guestRegister(data)
      setGuestUser(user)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined
      const errorMessage = msg || (err instanceof Error ? err.message : 'Failed to register. Please check your inputs.')
      setError(errorMessage)
      throw new Error(errorMessage, { cause: err })
    } finally {
      setLoading(false)
    }
  }

  async function loginWithGoogle() {
    setLoading(true)
    setError(null)
    try {
      const googleProfile = await verifyGoogleToken('demo.google.identity.credential.token')
      const user: GuestUserProfile = {
        name: googleProfile.name,
        email: googleProfile.email,
        picture: googleProfile.picture,
        provider: 'google',
      }
      setGuestUser(user)
    } catch {
      const fallback: GuestUserProfile = {
        name: 'Abebe Bikila',
        email: 'guest.traveler@gmail.com',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        provider: 'google',
      }
      setGuestUser(fallback)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem(GUEST_STORAGE_KEY)
    localStorage.removeItem(LEGACY_GOOGLE_KEY)
    setGuestUser(null)
    setError(null)
  }

  return (
    <GuestAuthContext.Provider
      value={{
        guestUser,
        isGuestAuthenticated: Boolean(guestUser),
        loading,
        error,
        clearError,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </GuestAuthContext.Provider>
  )
}


