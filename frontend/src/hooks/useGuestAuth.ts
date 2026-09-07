import { useContext } from 'react'
import { GuestAuthContext } from '../context/guest-auth-context'

export function useGuestAuth() {
  const context = useContext(GuestAuthContext)
  if (!context) {
    throw new Error('useGuestAuth must be used within a GuestAuthProvider')
  }
  return context
}
