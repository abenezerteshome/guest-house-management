import { useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser, login as loginRequest, loginWithGoogle as loginWithGoogleRequest } from '../api/auth'
import { clearSession, getApiError, TOKEN_KEY } from '../api/client'
import { AuthContext } from './auth-context'
import type { User } from '../types/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    getCurrentUser().then(setUser).catch(() => { clearSession(); setUser(null) }).finally(() => setIsLoading(false))
  }, [])

  async function login(username: string, password: string) {
    try {
      const response = await loginRequest(username, password)
      localStorage.setItem(TOKEN_KEY, response.access_token)
      setUser(await getCurrentUser())
    } catch (error) {
      throw new Error(getApiError(error, 'Invalid username or password.'), { cause: error })
    }
  }

  async function loginWithGoogle(credential: string) {
    try {
      const response = await loginWithGoogleRequest(credential)
      localStorage.setItem(TOKEN_KEY, response.access_token)
      setUser(await getCurrentUser())
    } catch (error) {
      throw new Error(getApiError(error, 'Google authentication failed.'), { cause: error })
    }
  }

  function logout() { clearSession(); setUser(null) }

  return <AuthContext.Provider value={{ user, isLoading, isAuthenticated: Boolean(user), login, loginWithGoogle, logout }}>{children}</AuthContext.Provider>
}

export { useAuth } from '../hooks/useAuth'
