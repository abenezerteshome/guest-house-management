import { useState, useEffect, useCallback } from 'react'
import {
  ArrowRight,
  BedDouble,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  KeyRound,
  LayoutGrid,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserCheck,
  Wallet,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/common/Button'
import { KpiCard } from '../../components/common/KpiCard'
import { RoomCard } from '../../components/common/RoomCard'
import { EmptyState } from '../../components/common/StatePanel'
import { Badge } from '../../components/common/Badge'
import { CheckInModal } from '../../components/modals/CheckInModal'
import { ReservationModal } from '../../components/modals/ReservationModal'
import { RecordPaymentModal } from '../../components/modals/RecordPaymentModal'
import { RecordExpenseModal } from '../../components/modals/RecordExpenseModal'
import { CheckOutModal } from '../../components/modals/CheckOutModal'
import { LogbookSheet } from '../../components/logbook/LogbookSheet'
import { getDailyReport } from '../../api/reports'
import { getRooms } from '../../api/rooms'
import { getStays } from '../../api/stays'
import { getReservations } from '../../api/reservations'
import { getGuests } from '../../api/guests'
import type { DailyReport, Room, Stay, Reservation } from '../../types/api'

export function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // Operational View Mode: 'LOGBOOK' (Paper notebook ledger replica) vs 'CARDS' (Matrix)
  const [viewMode, setViewMode] = useState<'LOGBOOK' | 'CARDS'>('LOGBOOK')

  // Live state
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeStays, setActiveStays] = useState<Stay[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [_loading, setLoading] = useState(true)

  // Filters & Modals
  const [roomFilter, setRoomFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'EXPECTED' | 'MAINTENANCE'>('ALL')
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [checkOutOpen, setCheckOutOpen] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined)
  const [selectedStay, setSelectedStay] = useState<Stay | null>(null)

  // Derive personalized greeting based on local time
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'Team'

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

  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE')
  const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED')

  const filteredRooms = rooms.filter((r) => {
    if (roomFilter === 'ALL') return true
    return r.status === roomFilter
  })

  // Selected stay for payments
  const firstActiveStay = activeStays[0] || null

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hospitality Welcome Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#DDDDDD]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171]">
              {isAdmin ? 'Guest House Overview' : 'Front Desk Operations'}
            </span>
            <span className="text-[11px] text-[#717171]">·</span>
            <span className="text-[11px] font-medium text-[#008A05] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#008A05]" />
              House Online
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-[#717171] mt-1">
            Here’s what’s happening at Haven House today.
          </p>
        </div>

        {/* Status Stamp & Refresh */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData()}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Desk
          </Button>
          <div className="px-3.5 py-1.5 rounded-full bg-[#F7F7F7] border border-[#DDDDDD] flex items-center gap-2 text-xs text-[#222222]">
            <Sparkles size={14} className="text-[#FF385C]" />
            <span className="font-semibold">Boutique Guest House</span>
            <span className="text-[#717171]">| Addis Ababa</span>
          </div>
        </div>
      </div>

      {/* Prominent Quick Actions Bar */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#717171]">
          Desk Actions
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            leftIcon={<KeyRound size={16} />}
            onClick={() => {
              setSelectedRoomId(undefined)
              setCheckInOpen(true)
            }}
          >
            + Check in guest
          </Button>
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setSelectedRoomId(undefined)
              setReservationOpen(true)
            }}
          >
            + New reservation
          </Button>
          <Button
            variant="secondary"
            size="md"
            leftIcon={<CircleDollarSign size={16} />}
            onClick={() => {
              if (activeStays.length > 0) {
                setSelectedStay(activeStays[0])
                setPaymentOpen(true)
              } else {
                alert('No active in-house stays currently available to record payments.')
              }
            }}
          >
            + Record payment
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<Wallet size={16} />}
              onClick={() => setExpenseOpen(true)}
            >
              + Record expense
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid — 6 clean hospitality cards with LIVE PostgreSQL data */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171]">
            Key Performance Metrics
          </span>
          <span className="text-xs text-[#717171]">
            Real-time operations & financial summary
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

      {/* Operational View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 p-1 bg-[#F1F1F1] rounded-2xl border border-[#E5E5E5] w-fit">
          <button
            type="button"
            onClick={() => setViewMode('LOGBOOK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'LOGBOOK'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'text-[#555555] hover:text-neutral-900'
            }`}
          >
            <BookOpen size={15} />
            <span>Daily Room Logbook (Register Sheet)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
              LEDGER
            </span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('CARDS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'CARDS'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'text-[#555555] hover:text-neutral-900'
            }`}
          >
            <LayoutGrid size={15} />
            <span>Room Cards Matrix</span>
          </button>
        </div>

        <div className="text-xs text-[#717171] font-medium hidden md:block">
          {viewMode === 'LOGBOOK'
            ? 'Rows = Room Numbers · Columns = Rolling 7 Days · Click vacant cell to Check In'
            : 'Visual status card glance for all guest house rooms'}
        </div>
      </div>

      {/* Primary Logbook Sheet View (Notebook Replica) */}
      {viewMode === 'LOGBOOK' && (
        <LogbookSheet
          rooms={rooms}
          stays={activeStays}
          reservations={reservations}
          onCheckInRoom={(roomId) => {
            setSelectedRoomId(roomId)
            setCheckInOpen(true)
          }}
          onRecordPayment={(stay) => {
            setSelectedStay(stay)
            setPaymentOpen(true)
          }}
          onCheckOut={(stay) => {
            setSelectedStay(stay)
            setSelectedRoomId(stay.room_id)
            setCheckOutOpen(true)
          }}
          onRefresh={() => fetchDashboardData()}
        />
      )}

      {/* Main Operational Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Operations Feed & (in CARDS view) Room Cards */}
        <div className="lg:col-span-2 space-y-6">
          {viewMode === 'CARDS' && (
            <div className="bg-white rounded-2xl border border-[#DDDDDD] p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0F0]">
                <div>
                  <h2 className="text-base font-semibold text-[#222222]">
                    Room Readiness Glance
                  </h2>
                  <p className="text-xs text-[#717171] mt-0.5">
                    Visual card matrix for instant front-desk check-in and checkout.
                  </p>
                </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#F7F7F7] rounded-xl border border-[#EEEEEE] overflow-x-auto">
                {(['ALL', 'AVAILABLE', 'OCCUPIED', 'EXPECTED', 'MAINTENANCE'] as const).map(
                  (filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setRoomFilter(filter)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        roomFilter === filter
                          ? 'bg-white text-[#222222] shadow-xs'
                          : 'text-[#717171] hover:text-[#222222]'
                      }`}
                    >
                      {filter === 'ALL'
                        ? 'All Rooms'
                        : filter.charAt(0) + filter.slice(1).toLowerCase()}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Room Cards Grid */}
            {filteredRooms.length === 0 ? (
              <p className="text-center py-8 text-xs text-[#717171]">
                No rooms match the selected filter.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {filteredRooms.map((room) => {
                  const isAvail = room.status === 'AVAILABLE'
                  const isOcc = room.status === 'OCCUPIED'
                  const isExp = room.status === 'EXPECTED'
                  const stay = activeStays.find((s) => s.room_id === room.id)

                  return (
                    <RoomCard
                      key={room.id}
                      room={{
                        id: String(room.id),
                        roomNumber: `Room ${room.room_number}`,
                        roomType: room.room_type,
                        pricePerNight: Number(room.price),
                        status: room.status,
                        capacity: 2,
                        bedType: 'Standard Suite',
                      }}
                      onSelect={() => {
                        if (isAvail) {
                          setSelectedRoomId(room.id)
                          setCheckInOpen(true)
                        } else if (isOcc && stay) {
                          setSelectedStay(stay)
                          setSelectedRoomId(room.id)
                          setCheckOutOpen(true)
                        } else if (isExp) {
                          setSelectedRoomId(room.id)
                          setCheckInOpen(true)
                        }
                      }}
                      actionSlot={
                        isAvail ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <Button
                              variant="outline"
                              size="xs"
                              leftIcon={<CalendarPlus size={13} />}
                              className="flex-1 whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedRoomId(room.id)
                                setReservationOpen(true)
                              }}
                            >
                              Reserve
                            </Button>
                            <Button
                              variant="primary"
                              size="xs"
                              leftIcon={<LogIn size={13} />}
                              className="flex-1 whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedRoomId(room.id)
                                setCheckInOpen(true)
                              }}
                            >
                              Check In
                            </Button>
                          </div>
                        ) : isOcc && stay ? (
                          <Button
                            variant="outline"
                            size="xs"
                            leftIcon={<LogOut size={13} />}
                            className="w-full whitespace-nowrap text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedStay(stay)
                              setSelectedRoomId(room.id)
                              setCheckOutOpen(true)
                            }}
                          >
                            Checkout
                          </Button>
                        ) : isExp ? (
                          <Button
                            variant="primary"
                            size="xs"
                            leftIcon={<UserCheck size={13} />}
                            className="w-full whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRoomId(room.id)
                              setCheckInOpen(true)
                            }}
                          >
                            Arrive Guest
                          </Button>
                        ) : (
                          <span className="text-xs text-[#717171] flex items-center justify-center gap-1 w-full py-1">
                            <Wrench size={13} />
                            <span>In Maintenance</span>
                          </span>
                        )
                      }
                    />
                  )
                })}
              </div>
            )}
          </div>
          )}

          {/* Today's Operational Live Feed */}
          <div className="bg-white rounded-2xl border border-[#DDDDDD] p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
              <div>
                <h2 className="text-base font-semibold text-[#222222]">
                  Today's Operational Feed
                </h2>
                <p className="text-xs text-[#717171] mt-0.5">
                  Active in-house resident guests and scheduled movements.
                </p>
              </div>
              <Badge tone="occupied" size="sm">
                {activeStays.length} In-House
              </Badge>
            </div>

            {activeStays.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={22} className="text-[#717171]" />}
                title="No active guests in-house"
                description="When guests check in, their live stay folios and schedules will appear here."
                actionLabel="Check In Guest"
                onAction={() => setCheckInOpen(true)}
              />
            ) : (
              <div className="divide-y divide-[#F0F0F0]">
                {activeStays.map((stay) => {
                  const room = rooms.find((r) => r.id === stay.room_id)
                  const checkInTime = new Date(stay.check_in_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const checkoutDate = new Date(stay.expected_checkout).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div
                      key={stay.id}
                      className="py-3 flex items-center justify-between hover:bg-[#F9F9F9] px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center font-bold text-xs">
                          {room ? room.room_number : stay.room_id}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#222222]">
                            Stay #{stay.id} • Room {room ? room.room_number : stay.room_id}
                          </p>
                          <p className="text-[11px] text-[#717171]">
                            Checked in today at {checkInTime} • Checkout: {checkoutDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setSelectedStay(stay)
                            setPaymentOpen(true)
                          }}
                        >
                          Payment
                        </Button>
                        <Button
                          variant="primary"
                          size="xs"
                          className="bg-neutral-900 hover:bg-neutral-800 text-white"
                          onClick={() => {
                            setSelectedStay(stay)
                            setSelectedRoomId(stay.room_id)
                            setCheckOutOpen(true)
                          }}
                        >
                          Checkout
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Desk Speed Shortcuts & House Info */}
        <div className="space-y-6">
          {/* Desk Summary Card */}
          <div className="bg-white rounded-2xl border border-[#DDDDDD] p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h2 className="text-base font-semibold text-[#222222]">
              Operational Desk Context
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F7F7F7] border border-[#EEEEEE] flex items-center justify-between">
                <span className="text-[#717171]">Current Shift</span>
                <span className="font-semibold text-[#222222]">Reception Shift</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70 flex items-center justify-between">
                <span className="text-rose-800 font-medium">Late Checkout Cutoff</span>
                <span className="font-bold text-rose-700">04:00 AM (600 ETB)</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7F7] border border-[#EEEEEE] flex items-center justify-between">
                <span className="text-[#717171]">Payment Channels</span>
                <span className="font-semibold text-[#222222]">Cash, Telebirr, CBE, Bank</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7F7] border border-[#EEEEEE] flex items-center justify-between">
                <span className="text-[#717171]">Currency</span>
                <span className="font-semibold text-[#222222]">ETB (Ethiopian Birr)</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white rounded-2xl border border-[#DDDDDD] p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h2 className="text-base font-semibold text-[#222222]">
              Front Desk Shortcuts
            </h2>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setCheckInOpen(true)}
                className="w-full p-3 rounded-xl border border-[#DDDDDD] hover:border-[#222222] hover:bg-[#F7F7F7] transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <strong className="block text-xs text-[#222222]">Fast Guest Check-In</strong>
                    <span className="block text-[11px] text-[#717171]">Register & assign room instantly</span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[#717171] group-hover:text-[#222222] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => setReservationOpen(true)}
                className="w-full p-3 rounded-xl border border-[#DDDDDD] hover:border-[#222222] hover:bg-[#F7F7F7] transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF6EB] text-[#C76A00] flex items-center justify-center">
                    <CalendarDays size={16} />
                  </div>
                  <div>
                    <strong className="block text-xs text-[#222222]">New Expected Reservation</strong>
                    <span className="block text-[11px] text-[#717171]">Reserve room for upcoming arrival</span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[#717171] group-hover:text-[#222222] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeStays.length > 0) {
                    setSelectedStay(activeStays[0])
                    setPaymentOpen(true)
                  } else {
                    alert('No active stay to record payment for.')
                  }
                }}
                className="w-full p-3 rounded-xl border border-[#DDDDDD] hover:border-[#222222] hover:bg-[#F7F7F7] transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EBF9EB] text-[#008A05] flex items-center justify-center">
                    <CircleDollarSign size={16} />
                  </div>
                  <div>
                    <strong className="block text-xs text-[#222222]">Record Folio Payment</strong>
                    <span className="block text-[11px] text-[#717171]">Cash, Telebirr, CBE, Bank, Credit</span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[#717171] group-hover:text-[#222222] transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>

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

      <RecordPaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        stayId={selectedStay?.id || firstActiveStay?.id || null}
        roomNumber={String(selectedStay?.room_id || '')}
        onSuccess={() => fetchDashboardData()}
      />

      <RecordExpenseModal
        isOpen={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onSuccess={() => fetchDashboardData()}
      />

      <CheckOutModal
        isOpen={checkOutOpen}
        onClose={() => setCheckOutOpen(false)}
        stay={selectedStay}
        roomNumber={String(selectedStay?.room_id || '')}
        onSuccess={() => fetchDashboardData()}
      />
    </div>
  )
}