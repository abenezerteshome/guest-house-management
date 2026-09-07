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

const secondaryModules = {
  audit: {
    id: 'audit',
    title: 'Audit Trail',
    description: 'A durable record of operational check-ins, check-outs, and folio updates.',
    icon: History,
  },
}

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* STAFF DESK LOGIN */}
        <Route path="/login" element={<LoginPage />} />

        {/* PROTECTED STAFF PROPERTY MANAGEMENT SYSTEM */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="guests" element={<GuestsPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="stays" element={<StaysPage />} />
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit-log" element={<PlaceholderPage {...secondaryModules.audit} />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        {/* DEFAULT REDIRECT TO DASHBOARD / LOGIN */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}