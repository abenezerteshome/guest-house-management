import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { GuestPortalLayout } from './components/layout/GuestPortalLayout'
import { GuestHomePage } from './pages/guest/GuestHomePage'
import { BookingLookupPage } from './pages/guest/BookingLookupPage'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { RoomsPage } from './pages/rooms/RoomsPage'
import { GuestsPage } from './pages/guests/GuestsPage'
import { ReservationsPage } from './pages/reservations/ReservationsPage'
import { StaysPage } from './pages/stays/StaysPage'
import { PaymentsPage } from './pages/payments/PaymentsPage'
import { ExpensesPage } from './pages/expenses/ExpensesPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { ChapaResultPage } from './pages/payments/ChapaResultPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { History, ShieldCheck } from 'lucide-react'

const secondaryModules = {
  users: {
    id: 'users',
    title: 'Staff Access & Roles',
    description: 'Manage staff access, user credentials, and role assignments.',
    icon: ShieldCheck,
  },
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
        {/* PUBLIC GUEST PORTAL ("USER SIDE") */}
        <Route
          path="/"
          element={
            <GuestPortalLayout>
              <GuestHomePage />
            </GuestPortalLayout>
          }
        />
        <Route
          path="/explore"
          element={
            <GuestPortalLayout>
              <GuestHomePage />
            </GuestPortalLayout>
          }
        />
        <Route
          path="/lookup"
          element={
            <GuestPortalLayout>
              <BookingLookupPage />
            </GuestPortalLayout>
          }
        />

        {/* STAFF DESK LOGIN */}
        <Route path="/login" element={<LoginPage />} />

        {/* CHAPA PAYMENT RETURN / RESULT PAGE */}
        <Route path="/payments/chapa/result" element={<ChapaResultPage />} />

        {/* PROTECTED STAFF PROPERTY MANAGEMENT SYSTEM */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="guests" element={<GuestsPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="stays" element={<StaysPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="users" element={<PlaceholderPage {...secondaryModules.users} />} />
              <Route path="audit-log" element={<PlaceholderPage {...secondaryModules.audit} />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}