import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Plus,
  Clock,
  Wrench,
  Sparkles,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Search,
  User,
  LogOut,
  History,
  CalendarDays,
} from 'lucide-react'
import type { Room, Stay, Reservation } from '../../types/api'
import { Button } from '../common/Button'

interface LogbookSheetProps {
  rooms: Room[]
  stays: Stay[]
  reservations: Reservation[]
  onCheckInRoom: (roomId: number) => void
  onCheckOut: (stay: Stay) => void
  onExtendStay?: (stay: Stay) => void
  onRefresh: () => void
}

export function LogbookSheet({
  rooms,
  stays,
  reservations,
  onCheckInRoom,
  onCheckOut,
  onExtendStay,
}: LogbookSheetProps) {
  // Center view on today
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    // Start 1 day before today so yesterday and today are immediately visible
    d.setDate(d.getDate() - 1)
    return d
  })
  const [daysCount] = useState(7) // 7-day rolling window
  const [searchQuery, setSearchQuery] = useState('')
  const [activeStayPopover, setActiveStayPopover] = useState<{
    stay: Stay
    room: Room
    dayIndex: number
    totalNights: number
    nightNumber: number
  } | null>(null)

  // Generate date array for columns
  const dateColumns = useMemo(() => {
    const cols: Date[] = []
    for (let i = 0; i < daysCount; i++) {
      const colDate = new Date(startDate)
      colDate.setDate(colDate.getDate() + i)
      cols.push(colDate)
    }
    return cols
  }, [startDate, daysCount])

  const todayStr = useMemo(() => {
    const today = new Date()
    return today.toISOString().slice(0, 10)
  }, [])

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(startDate)
    d.setDate(d.getDate() - 5)
    setStartDate(d)
  }

  const handleNext = () => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + 5)
    setStartDate(d)
  }

  const handleToday = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - 1)
    setStartDate(d)
  }

  // Filter rooms by search query
  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const sorted = [...rooms].sort((a, b) => {
      const numA = parseInt(a.room_number) || 0
      const numB = parseInt(b.room_number) || 0
      return numA - numB
    })
    if (!query) return sorted
    return sorted.filter(
      (r) =>
        r.room_number.toLowerCase().includes(query) ||
        (r.room_type || '').toLowerCase().includes(query)
    )
  }, [rooms, searchQuery])

  // Helper to test if date falls within stay interval
  const getStayForRoomAndDate = (roomId: number, date: Date): {
    stay: Stay
    nightNumber: number
    totalNights: number
  } | null => {
    const targetStr = date.toISOString().slice(0, 10)
    for (const s of stays) {
      if (s.room_id !== roomId) continue
      if (s.status !== 'CHECKED_IN' && s.status !== 'ACTIVE') continue

      const checkInRaw = s.check_in_at || (s as any).check_in_date || (s as any).check_in
      const checkOutRaw = s.expected_checkout || (s as any).checkout_date
      if (!checkInRaw || !checkOutRaw) continue

      const checkInDate = new Date(checkInRaw)
      const checkOutDate = new Date(checkOutRaw)
      
      const checkInStr = !isNaN(checkInDate.getTime()) ? checkInDate.toISOString().slice(0, 10) : ''
      const checkOutStr = !isNaN(checkOutDate.getTime()) ? checkOutDate.toISOString().slice(0, 10) : ''

      if (checkInStr && checkOutStr) {
        if (targetStr >= checkInStr && (targetStr < checkOutStr || (targetStr === checkOutStr && targetStr === todayStr))) {
          // Calculate night number
          const diffDays = Math.floor((date.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24)) + 1
          const totalDays = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24)))
          return {
            stay: s,
            nightNumber: Math.min(Math.max(1, diffDays), totalDays),
            totalNights: totalDays,
          }
        }
      }
    }
    return null
  }

  // Helper to test if date has reservation
  const getReservationForRoomAndDate = (roomId: number, date: Date): Reservation | null => {
    const targetStr = date.toISOString().slice(0, 10)
    for (const r of reservations) {
      if (r.room_id !== roomId) continue
      if (r.status !== 'RESERVED' && r.status !== 'PENDING') continue
      const arrRaw = r.expected_arrival || (r as any).check_in_date || ''
      const outRaw = r.expected_checkout || (r as any).check_out_date || ''
      if (!arrRaw || !outRaw) continue
      const checkInDate = new Date(arrRaw)
      const checkOutDate = new Date(outRaw)
      const inStr = !isNaN(checkInDate.getTime()) ? checkInDate.toISOString().slice(0, 10) : ''
      const outStr = !isNaN(checkOutDate.getTime()) ? checkOutDate.toISOString().slice(0, 10) : ''
      if (inStr && outStr && targetStr >= inStr && targetStr < outStr) {
        return r
      }
    }
    return null
  }

  // Format date headers
  const formatDayHeader = (date: Date) => {
    const isToday = date.toISOString().slice(0, 10) === todayStr
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { dayName, monthDay, isToday }
  }

  // Format payment badge
  const renderPaymentBadge = (method?: string) => {
    switch (method) {
      case 'TELEBIRR':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
            <Smartphone className="w-2.5 h-2.5" />
            Telebirr
          </span>
        )
      case 'CBE_BIRR':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Building2 className="w-2.5 h-2.5" />
            CBE Birr
          </span>
        )
      case 'BANK_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <CreditCard className="w-2.5 h-2.5" />
            Bank
          </span>
        )
      case 'CREDIT':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Credit
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Banknote className="w-2.5 h-2.5" />
            Cash
          </span>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Controls: Paper Logbook Header */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Date navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-white text-neutral-700 hover:text-neutral-900 transition"
              title="Previous 5 days"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-white shadow-xs text-neutral-900 border border-neutral-200 hover:bg-neutral-50 transition"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-white text-neutral-700 hover:text-neutral-900 transition"
              title="Next 5 days"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span>
              {dateColumns[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' — '}
              {dateColumns[dateColumns.length - 1]?.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Right: Search room & Quick check-in */}
        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search room (e.g. 101)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onCheckInRoom(rooms[0]?.id || 0)}
            className="gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Check-In</span>
          </Button>
        </div>
      </div>

      {/* Main Ledger Sheet Grid Container */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left select-none">
            {/* Table Header: Dates */}
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80">
                {/* Sticky Left Column: Room info */}
                <th className="sticky left-0 z-20 bg-neutral-100/95 backdrop-blur-xs border-r border-neutral-200 p-3 min-w-[140px] max-w-[160px]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Room / Rate
                  </div>
                  <div className="text-xs font-semibold text-neutral-700 mt-0.5">
                    {filteredRooms.length} Rooms
                  </div>
                </th>

                {/* Day Columns */}
                {dateColumns.map((colDate, idx) => {
                  const { dayName, monthDay, isToday } = formatDayHeader(colDate)
                  return (
                    <th
                      key={idx}
                      className={`p-3 min-w-[170px] border-r border-neutral-200 text-center transition ${
                        isToday ? 'bg-[#FF385C]/5 border-t-2 border-t-[#FF385C]' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            isToday ? 'text-[#FF385C]' : 'text-neutral-500'
                          }`}
                        >
                          {dayName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-xs font-extrabold ${
                              isToday ? 'text-[#FF385C]' : 'text-neutral-900'
                            }`}
                          >
                            {monthDay}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#FF385C] text-white">
                              TODAY
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Table Body: Rooms as Rows */}
            <tbody className="divide-y divide-neutral-200">
              {filteredRooms.map((room) => {
                const roomPrice = Number(room.price || 0).toLocaleString()

                return (
                  <tr key={room.id} className="hover:bg-neutral-50/40 transition">
                    {/* Sticky Room Column */}
                    <td className="sticky left-0 z-10 bg-white border-r border-neutral-200 p-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black tracking-tight text-neutral-900">
                          {room.room_number}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 uppercase">
                          {room.room_type || (room as any).type || 'Room'}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-neutral-500 mt-1">
                        {roomPrice} <span className="text-[10px] font-normal">ETB / night</span>
                      </div>
                    </td>

                    {/* Day Cells for this Room */}
                    {dateColumns.map((colDate, dayIdx) => {
                      const dateStr = colDate.toISOString().slice(0, 10)
                      const isToday = dateStr === todayStr
                      const stayInfo = getStayForRoomAndDate(room.id, colDate)
                      const resInfo = !stayInfo ? getReservationForRoomAndDate(room.id, colDate) : null

                      // Case 1: Active Stay in Room on this Date
                      if (stayInfo) {
                        const { stay, nightNumber, totalNights } = stayInfo
                        const guestName = (stay as any).guest?.full_name || (stay as any).guest_name || `Guest #${stay.guest_id}`
                        const isPayPopoverActive = activeStayPopover?.stay.id === stay.id

                        return (
                          <td
                            key={dayIdx}
                            className={`p-2 border-r border-neutral-200 align-top ${
                              isToday ? 'bg-[#FF385C]/5' : ''
                            }`}
                          >
                            <div
                              onClick={() =>
                                setActiveStayPopover(
                                  isPayPopoverActive
                                    ? null
                                    : { stay, room, dayIndex: dayIdx, totalNights, nightNumber }
                                )
                              }
                              className={`p-2 rounded-xl border transition cursor-pointer relative ${
                                isPayPopoverActive
                                  ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-400/40 shadow-sm'
                                  : 'bg-emerald-50/90 hover:bg-emerald-100/80 border-emerald-300 text-emerald-950'
                              }`}
                            >
                              {/* Top row: Checkmark + Night Count in red (Just like paper notebook!) */}
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Occupied</span>
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                                  Day {nightNumber}/{totalNights}
                                </span>
                              </div>

                              {/* Guest Name */}
                              <div className="text-xs font-bold text-neutral-900 truncate mb-1">
                                {guestName}
                              </div>

                              {/* Bottom row: Payment Badge & Price */}
                              <div className="flex items-center justify-between gap-1 mt-1.5 pt-1.5 border-t border-emerald-200/60">
                                {renderPaymentBadge((stay as any).payment_method)}
                                <span className="text-[11px] font-bold text-neutral-700">
                                  {roomPrice} <span className="text-[9px]">ETB</span>
                                </span>
                              </div>
                            </div>
                          </td>
                        )
                      }

                      // Case 2: Advance Reservation on this Date
                      if (resInfo) {
                        const guestName = (resInfo as any).guest?.full_name || (resInfo as any).guest_name || `Booking #${resInfo.id}`
                        return (
                          <td
                            key={dayIdx}
                            className={`p-2 border-r border-neutral-200 align-top ${
                              isToday ? 'bg-[#FF385C]/5' : ''
                            }`}
                          >
                            <div className="p-2 rounded-xl border border-blue-300 bg-blue-50 text-blue-950">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800">
                                  <Clock className="w-3 h-3 text-blue-600" />
                                  <span>Booked</span>
                                </span>
                                <span className="text-[10px] font-semibold text-blue-600">
                                  {(resInfo as any).code || `#${resInfo.id}`}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-blue-900 truncate mb-1">
                                {guestName}
                              </div>
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={() => onCheckInRoom(room.id)}
                                  className="w-full py-1 text-[10px] font-bold rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                                >
                                  Check In Now
                                </button>
                              </div>
                            </div>
                          </td>
                        )
                      }

                      // Case 3: Maintenance Room
                      if (room.status === 'MAINTENANCE') {
                        return (
                          <td
                            key={dayIdx}
                            className="p-2 border-r border-neutral-200 align-top bg-rose-50/40"
                          >
                            <div className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-center">
                              <Wrench className="w-3.5 h-3.5 text-rose-500 mx-auto mb-0.5" />
                              <span className="text-[10px] font-bold text-rose-700 block">
                                Repairs
                              </span>
                            </div>
                          </td>
                        )
                      }

                      // Case 4: Cleaning Room
                      if (room.status === 'CLEANING') {
                        return (
                          <td
                            key={dayIdx}
                            className="p-2 border-r border-neutral-200 align-top bg-amber-50/40"
                          >
                            <div className="p-2 rounded-xl border border-amber-200 bg-amber-50 text-center">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 mx-auto mb-0.5" />
                              <span className="text-[10px] font-bold text-amber-700 block">
                                Housekeeping
                              </span>
                            </div>
                          </td>
                        )
                      }

                      // Case 5: Vacant / Available Room (Clean cell with quick check-in)
                      return (
                        <td
                          key={dayIdx}
                          className={`p-2 border-r border-neutral-200 align-top group ${
                            isToday ? 'bg-[#FF385C]/5' : ''
                          }`}
                        >
                          <div
                            onClick={() => onCheckInRoom(room.id)}
                            className="h-18 rounded-xl border border-dashed border-neutral-200 hover:border-[#FF385C] hover:bg-white hover:shadow-xs transition p-2 flex flex-col items-center justify-center cursor-pointer text-center"
                            title={`Click to check in room ${room.room_number}`}
                          >
                            <span className="text-[11px] font-semibold text-neutral-400 group-hover:text-[#FF385C] flex items-center gap-1">
                              <Plus className="w-3.5 h-3.5" />
                              <span>Check In</span>
                            </span>
                            <span className="text-[10px] text-neutral-300 group-hover:text-neutral-500 mt-0.5">
                              {roomPrice} ETB
                            </span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Bar when a Stay Cell is Selected */}
      {activeStayPopover && (
        <div className="p-4 rounded-2xl bg-neutral-900 text-white shadow-xl border border-neutral-700 animate-in fade-in slide-in-from-bottom-2 duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-lg text-emerald-400">
              {activeStayPopover.room.room_number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {(activeStayPopover.stay as any).guest?.full_name || (activeStayPopover.stay as any).guest_name || `Guest #${activeStayPopover.stay.guest_id}`}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Day {activeStayPopover.nightNumber} of {activeStayPopover.totalNights}
                </span>
              </div>
              <span className="text-xs text-neutral-400 block mt-0.5">
                Phone: {(activeStayPopover.stay as any).guest?.phone || 'Front desk registered'} · Rate: {activeStayPopover.room.price} ETB/night
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onExtendStay && (
              <button
                type="button"
                onClick={() => {
                  onExtendStay(activeStayPopover.stay)
                  setActiveStayPopover(null)
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 cursor-pointer border border-white/10"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Extend +1 Night</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onCheckOut(activeStayPopover.stay)
                setActiveStayPopover(null)
              }}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Check Out</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStayPopover(null)}
              className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Visual Legend matching the paper notebook */}
      <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between flex-wrap gap-3 text-xs text-neutral-600">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-neutral-700">Ledger Key:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400 flex items-center justify-center text-[8px] text-emerald-800 font-black">
              ✓
            </span>
            <span>Occupied Guest Room</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200">
              Day 2
            </span>
            <span>Stay Night Counter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-dashed border-neutral-400 bg-white" />
            <span>Available (Click to Check In)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
            <span>Housekeeping</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />
            <span>Maintenance</span>
          </div>
        </div>
        <div className="text-[11px] text-neutral-400 font-medium">
          Matches Haven House front-desk daily room registry book.
        </div>
      </div>
    </div>
  )
}
