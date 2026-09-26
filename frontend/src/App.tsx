import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { RoomsPage } from './pages/rooms/RoomsPage'
import { GuestsPage } from './pages/guests/GuestsPage'
import { ReservationsPage } from './pages/reservations/ReservationsPage'
import { StaysPage } from './pages/stays/StaysPage'
import { ExpensesPage } from './pages/expenses/ExpensesPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { History } from 'lucide-react'

import { SuperAdminPropertiesPage } from './pages/super-admin/SuperAdminPropertiesPage'
import { useAuth } from './hooks/useAuth'

const secondaryModules = {
  audit: {
    id: 'audit',
    title: 'Audit Trail',
    description: 'A durable record of operational check-ins, check-outs, and folio updates.',
    icon: History,
  },
}

function RootRedirect() {
  const { user } = useAuth()
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/super-admin/properties" replace />
  }
  return <Navigate to="/dashboard" replace />
}

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* STAFF DESK LOGIN */}
        <Route path="/login" element={<LoginPage />} />

        {/* PROTECTED STAFF GUEST HOUSE MANAGEMENT SYSTEM */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="guests" element={<GuestsPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="stays" element={<StaysPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route element={<ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']} />}>
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit-log" element={<PlaceholderPage {...secondaryModules.audit} />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            {/* PLATFORM SUPER ADMIN */}
            <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
              <Route path="super-admin/properties" element={<SuperAdminPropertiesPage />} />
            </Route>
          </Route>
        </Route>

        {/* DEFAULT REDIRECT TO DASHBOARD / LOGIN / SUPER ADMIN */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </ErrorBoundary>
  )
}