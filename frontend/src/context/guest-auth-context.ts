import { createContext } from 'react'
import type { GuestUserProfile, GuestRegisterData, GuestLoginData } from '../types/public'

export interface GuestAuthContextType {
  guestUser: GuestUserProfile | null
  isGuestAuthenticated: boolean
  loading: boolean
  error: string | null
  clearError: () => void
  loginWithEmail: (data: GuestLoginData) => Promise<void>
  registerWithEmail: (data: GuestRegisterData) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => void
}

export const GuestAuthContext = createContext<GuestAuthContextType | undefined>(undefined)
