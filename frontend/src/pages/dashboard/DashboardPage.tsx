import { useState, useEffect, useCallback } from 'react'
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  KeyRound,
  LogOut,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { KpiCard } from '../../components/common/KpiCard'
import { CheckInModal } from '../../components/modals/CheckInModal'
import { ReservationModal } from '../../components/modals/ReservationModal'
import { RecordExpenseModal } from '../../components/modals/RecordExpenseModal'
import { CheckOutModal } from '../../components/modals/CheckOutModal'
import { ExtendStayModal } from '../../components/modals/ExtendStayModal'
import { LogbookSheet } from '../../components/logbook/LogbookSheet'
import { getDailyReport } from '../../api/reports'
import { getRooms } from '../../api/rooms'
import { getStays } from '../../api/stays'
import { getReservations } from '../../api/reservations'
import { getGuests } from '../../api/guests'
import type { DailyReport, Room, Stay, Reservation, Guest } from '../../types/api'

interface StayWithGuest extends Stay {
  guest?: Guest
}

export function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // Live state
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeStays, setActiveStays] = useState<StayWithGuest[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [_loading, setLoading] = useState(true)

  // Modals
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [quickCheckOutOpen, setQuickCheckOutOpen] = useState(false)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [checkOutOpen, setCheckOutOpen] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined)
  const [selectedStay, setSelectedStay] = useState<StayWithGuest | null>(null)

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [reportData, roomsData, staysData, resData, guestsData] = await Promise.all([
        isAdmin ? getDailyReport().catch(() => null) : Promise.resolve(null),
        getRooms(),
        getStays('CHECKED_IN').catch(() => []),
        getReservations('RESERVED').catch(() => []),
        getGuests().catch(() => []),
      ])
      if (reportData) setDailyReport(reportData)
      setRooms(roomsData)

      // Map guest information onto active stays so guest names display clearly
      const guestMap = new Map(guestsData.map((g) => [g.id, g]))
      const enrichedStays = staysData.map((s) => ({
        ...s,
        guest: guestMap.get(s.guest_id),
      }))
      setActiveStays(enrichedStays)
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

  const isTurnaround = (r: Room) => !!r.available_after && new Date(r.available_after).getTime() > Date.now()
  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE' && !isTurnaround(r))
  const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Clean Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DDDDDD]">
        <div>
          <h1 className="text-2xl font-bold text-[#222222] tracking-tight">
            {isAdmin ? 'Guest House Overview' : 'Daily Room Logbook'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="primary"
            size="md"
            leftIcon={<KeyRound size={16} />}
            onClick={() => {
              setSelectedRoomId(undefined)
              setCheckInOpen(true)
            }}
          >
            + Check In Guest
          </Button>
          <Button
            variant="outline"
            size="md"
            leftIcon={<LogOut size={16} />}
            className="text-neutral-700 hover:text-rose-600 hover:border-rose-200"
            onClick={() => setQuickCheckOutOpen(true)}
          >
            Check Out Guest
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid — Visible strictly to Administrator */}
      {isAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171]">
              Key Performance Metrics
            </span>
            <span className="text-xs text-[#717171]">
              Real-time financial & occupancy summary (Administrator only)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <KpiCard
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
              label="Available Rooms"
              value={String(availableRooms.length)}
              detail="Ready for instant check-in"
              icon={CheckCircle2}
              tone="success"
            />
            <KpiCard
              label="Expected Arrivals"
              value={String(reservations.length)}
              detail="Scheduled bookings pending"
              icon={CalendarDays}
              tone={reservations.length > 0 ? 'warning' : 'neutral'}
            />
          </div>
        </div>
      )}

      {/* Primary Logbook Sheet View (Notebook Replica) */}
      <LogbookSheet
        rooms={rooms}
        stays={activeStays}
        reservations={reservations}
        onCheckInRoom={(roomId) => {
          setSelectedRoomId(roomId)
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

      {/* Interactive Modals */}
      <CheckInModal
        isOpen={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        availableRooms={availableRooms}
        selectedRoomId={selectedRoomId}
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

      {/* Quick Check Out Guest Selector */}
      <Modal
        isOpen={quickCheckOutOpen}
        onClose={() => setQuickCheckOutOpen(false)}
        title="Check Out Guest"
        description="Select an occupied room to process final checkout and payment."
        maxWidth="md"
      >
        {activeStays.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <p className="text-sm font-semibold text-neutral-700">No rooms are currently occupied</p>
            <p className="text-xs text-neutral-400 mt-1">All rooms are currently vacant or ready for guest check-in.</p>
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setQuickCheckOutOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {activeStays.map((stay) => {
                const room = rooms.find((r) => r.id === stay.room_id)
                const guestName = stay.guest?.full_name || (stay as any).guest_name || `Guest #${stay.guest_id}`

                return (
                  <div
                    key={stay.id}
                    className="p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50/60 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-black text-sm">
                        {room?.room_number || stay.room_id}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900">{guestName}</p>
                        <p className="text-xs text-neutral-500">
                          {room?.room_type || 'Room'} · {Number(room?.price || 0).toLocaleString()} ETB/night
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<LogOut size={13} />}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => {
                        setSelectedStay(stay)
                        setSelectedRoomId(stay.room_id)
                        setQuickCheckOutOpen(false)
                        setCheckOutOpen(true)
                      }}
                    >
                      Check Out
                    </Button>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end pt-2 border-t border-neutral-100">
              <Button variant="outline" size="sm" onClick={() => setQuickCheckOutOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <CheckOutModal
        isOpen={checkOutOpen}
        onClose={() => setCheckOutOpen(false)}
        stay={selectedStay}
        roomNumber={rooms.find((r) => r.id === selectedStay?.room_id)?.room_number || String(selectedStay?.room_id || '')}
        guestName={selectedStay?.guest?.full_name}
        onSuccess={() => fetchDashboardData()}
      />

      <ExtendStayModal
        isOpen={extendOpen}
        onClose={() => setExtendOpen(false)}
        stay={selectedStay}
        roomNumber={rooms.find((r) => r.id === selectedStay?.room_id)?.room_number}
        guestName={selectedStay?.guest?.full_name}
        onSuccess={() => fetchDashboardData()}
      />
    </div>
  )
}