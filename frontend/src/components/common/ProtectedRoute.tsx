import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from './StatePanel'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../types/api'

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()
  if (isLoading) return <LoadingState label="Restoring your session" />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && user && !roles.includes(user.role)) {
    const fallback = user.role === 'SUPER_ADMIN' ? '/super-admin/properties' : '/dashboard'
    return <Navigate to={fallback} replace />
  }
  return <Outlet />
}