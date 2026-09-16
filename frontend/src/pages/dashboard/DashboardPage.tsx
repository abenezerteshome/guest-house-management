import { useState, useEffect, useCallback } from 'react'
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Printer,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { KpiCard } from '../../components/common/KpiCard'
import { LoadingState } from '../../components/common/StatePanel'
import { CheckInModal } from '../../components/modals/CheckInModal'
import { ReservationModal } from '../../components/modals/ReservationModal'
import { RecordExpenseModal } from '../../components/modals/RecordExpenseModal'
import { CheckOutModal } from '../../components/modals/CheckOutModal'
import { VoidCheckInModal } from '../../components/modals/VoidCheckInModal'
import { ExtendStayModal } from '../../components/modals/ExtendStayModal'
import { DailyManifestModal } from '../../components/modals/DailyManifestModal'
import { LogbookSheet } from '../../components/logbook/LogbookSheet'
import { getDailyReport } from '../../api/reports'
import { getRooms } from '../../api/rooms'
import { getStays } from '../../api/stays'
import { getReservations } from '../../api/reservations'
import { getGuests } from '../../api/guests'
import { getCleaningRooms, setRoomCleaning } from '../../utils/roomCleaning'
import type { DailyReport, Room, Stay, Reservation, Guest } from '../../types/api'

interface StayWithGuest extends Stay {
  guest?: Guest
  has_credit?: boolean
  payment_method?: string
  initial_payment_method?: string
  extension_credit?: number
  extension_nights?: number
}

export function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // Live state
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeStays, setActiveStays] = useState<StayWithGuest[]>([])
  const [recentStays, setRecentStays] = useState<StayWithGuest[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingInRoomId, setCheckingInRoomId] = useState<number | null>(null)

  // Modals
  const [dailyManifestOpen, setDailyManifestOpen] = useState(false)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [checkOutOpen, setCheckOutOpen] = useState(false)
  const [voidCheckInOpen, setVoidCheckInOpen] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [selectedStay, setSelectedStay] = useState<StayWithGuest | null>(null)

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [reportData, roomsData, staysData, checkedOutData, resData, guestsData] = await Promise.all([
        isAdmin ? getDailyReport().catch(() => null) : Promise.resolve(null),
        getRooms(),
        getStays('CHECKED_IN').catch(() => []),
        getStays('CHECKED_OUT').catch(() => []),
        getReservations('RESERVED').catch(() => []),
        getGuests().catch(() => []),
      ])
      if (reportData) setDailyReport(reportData)

      // Merge persistent 1-hour turnaround cleaning state
      const activeCleaning = getCleaningRooms()
      const mergedRooms = roomsData.map((r) => {
        const cleanExpiry = activeCleaning[r.id]
        if (cleanExpiry && cleanExpiry > Date.now()) {
          return {
            ...r,
            status: 'CLEANING' as const,
            available_after: new Date(cleanExpiry).toISOString(),
          }
        }
        if (r.status === 'CLEANING' && r.available_after) {
          setRoomCleaning(r.id, Math.max(0, new Date(r.available_after).getTime() - Date.now()))
        }
        return r
      })
      setRooms(mergedRooms)

      // Map guest information onto active stays. Financial details load independently in LogbookSheet.
      const guestMap = new Map(guestsData.map((g) => [g.id, g]))
      const enrichedStays: StayWithGuest[] = staysData.map((s) => ({
        ...s,
        guest: guestMap.get(s.guest_id),
      }))
      setActiveStays(enrichedStays)

      // Enrich all checked-out stays for full historical visibility in the logbook
      const enrichedCheckedOut: StayWithGuest[] = checkedOutData.map((s) => ({
        ...s,
        guest: guestMap.get(s.guest_id),
      }))
      setRecentStays(enrichedCheckedOut)

      setReservations(resData)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE')
  const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Title (Admin only) */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-[#222222] tracking-tight">
            Guest House Overview
          </h1>
        </div>
      )}

      {/* KPI Cards Grid — Visible strictly to Administrator */}
      {isAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#222222]">
              Management Overview
            </h3>
            <span className="text-xs text-[#717171]">
              Real-time financial & occupancy summary (Administrator only)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <KpiCard
              loading={loading}
              label="Today's Income"
              value={
                dailyReport
                  ? `${Number(dailyReport.todays_income).toLocaleString()} ETB`
                  : '0 ETB'
              }
              detail="Guest settlements today"
              icon={CircleDollarSign}
              tone="success"
            />
            <KpiCard
              loading={loading}
              label="Today's Expenses"
              value={
                dailyReport
                  ? `${Number(dailyReport.todays_expenses).toLocaleString()} ETB`
                  : '0 ETB'
              }
              detail="Disbursed petty cash"
              icon={Wallet}
              tone="neutral"
            />
            <KpiCard
              loading={loading}
              label="Net Cashflow"
              value={
                dailyReport
                  ? `${Number(dailyReport.net_income).toLocaleString()} ETB`
                  : '0 ETB'
              }
              detail="Revenue minus expenses"
              icon={TrendingUp}
              tone={Number(dailyReport?.net_income || 0) >= 0 ? 'success' : 'danger'}
            />
            <KpiCard
              loading={loading}
              label="Occupied Rooms"
              value={
                dailyReport
                  ? `${dailyReport.occupied_rooms} / ${rooms.length || dailyReport.occupied_rooms + dailyReport.available_rooms}`
                  : `${occupiedRooms.length} / ${rooms.length}`
              }
              detail={`${
                rooms.length > 0
                  ? Math.round((occupiedRooms.length / rooms.length) * 100)
                  : 0
              }% occupancy rate`}
              icon={BedDouble}
              tone="accent"
            />
            <KpiCard
              loading={loading}
              label="Available Rooms"
              value={String(availableRooms.length)}
              detail="Ready for instant check-in"
              icon={CheckCircle2}
              tone="success"
            />
            <KpiCard
              loading={loading}
              label="Expected Arrivals"
              value={String(reservations.length)}
              detail="Scheduled bookings pending"
              icon={CalendarDays}
              tone={reservations.length > 0 ? 'warning' : 'neutral'}
            />
          </div>
        </div>
      )}

      {/* Quick Shift Audit & Daily Manifest Bar */}
      <div className="bg-white rounded-xl border border-neutral-300 p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <Printer size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900">
                Today's Guest Activity & Daily Manifest
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Audit
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Review today's checked-in, checked-out, and reserved guests with stay durations and payment tracking.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDailyManifestOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Printer size={14} />
          <span>View & Print Daily Manifest</span>
        </button>
      </div>

      {/* Primary Logbook Sheet View (Notebook Replica) */}
      {loading ? (
        <div
          className="min-h-[280px] rounded-xl border border-neutral-300 bg-white"
          role="status"
          aria-busy="true"
        >
          <LoadingState label="Loading dashboard and room information..." />
        </div>
      ) : (
        <LogbookSheet
          rooms={rooms}
          stays={activeStays}
          recentStays={recentStays}
          reservations={reservations}
          checkingInRoomId={checkingInRoomId}
          onOpenDailyManifest={() => setDailyManifestOpen(true)}
          onCheckInRoom={(roomId, res) => {
            const matchedRes =
              res ||
              reservations.find(
                (r) => r.room_id === roomId && (r.status === 'RESERVED' || r.status === 'PENDING')
              ) ||
              null
            setSelectedRoomId(roomId)
            setSelectedReservation(matchedRes)
            setCheckInOpen(true)
          }}
          onCheckOut={(stay) => {
            setSelectedStay(stay)
            setSelectedRoomId(stay.room_id)
            setCheckOutOpen(true)
          }}
          onExtendStay={(stay) => {
            setSelectedStay(stay)
            setSelectedRoomId(stay.room_id)
            setExtendOpen(true)
          }}
          onRefresh={() => fetchDashboardData()}
        />
      )}

      {/* Interactive Modals */}
      <CheckInModal
        isOpen={checkInOpen}
        onClose={() => {
          setCheckInOpen(false)
          setSelectedReservation(null)
        }}
        availableRooms={availableRooms}
        allRooms={rooms}
        selectedRoomId={selectedRoomId}
        existingReservation={selectedReservation}
        onLoadingChange={(roomId, isLoading) =>
          setCheckingInRoomId(isLoading ? roomId : null)
        }
        onSuccess={() => fetchDashboardData()}
      />

      <ReservationModal
        isOpen={reservationOpen}
        onClose={() => setReservationOpen(false)}
        availableRooms={availableRooms}
        selectedRoomId={selectedRoomId}
        onSuccess={() => fetchDashboardData()}
      />

      <RecordExpenseModal
        isOpen={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onSuccess={() => fetchDashboardData()}
      />



      <CheckOutModal
        isOpen={checkOutOpen}
        onClose={() => {
          setCheckOutOpen(false)
          setSelectedStay(null)
        }}
        stay={selectedStay}
        roomNumber={rooms.find((r) => r.id === selectedStay?.room_id)?.room_number || String(selectedStay?.room_id || '')}
        guestName={selectedStay?.guest?.full_name}
        onOpenVoidModal={(stay) => {
          setSelectedStay(stay as StayWithGuest)
          setVoidCheckInOpen(true)
        }}
        onSuccess={(checkedOutStay) => {
          const targetStay = checkedOutStay || selectedStay
          if (targetStay) {
            // Persist 1-hour cleaning in storage and memory
            const availableAfter = setRoomCleaning(targetStay.room_id, 60 * 60 * 1000)
            setActiveStays((prev) => prev.filter((s) => s.id !== targetStay.id))
            setRooms((prev) =>
              prev.map((r) =>
                r.id === targetStay.room_id
                  ? { ...r, status: 'CLEANING' as const, available_after: availableAfter }
                  : r
              )
            )
          }
          fetchDashboardData()
        }}
      />

      <VoidCheckInModal
        isOpen={voidCheckInOpen}
        onClose={() => {
          setVoidCheckInOpen(false)
          setSelectedStay(null)
        }}
        stay={selectedStay}
        roomNumber={rooms.find((r) => r.id === selectedStay?.room_id)?.room_number}
        guestName={selectedStay?.guest?.full_name}
        onSuccess={() => fetchDashboardData()}
      />

      <ExtendStayModal
        isOpen={extendOpen}
        onClose={() => setExtendOpen(false)}
        stay={selectedStay}
        roomNumber={rooms.find((r) => r.id === selectedStay?.room_id)?.room_number}
        roomPrice={Number(rooms.find((r) => r.id === selectedStay?.room_id)?.price || 0)}
        guestName={selectedStay?.guest?.full_name}
        onSuccess={() => fetchDashboardData()}
      />

      <DailyManifestModal
        isOpen={dailyManifestOpen}
        onClose={() => setDailyManifestOpen(false)}
      />
    </div>
  )
}