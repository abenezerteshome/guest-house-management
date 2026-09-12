import { useState, useMemo, useEffect } from 'react'
import {
  Plus,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  LogOut,
  CalendarDays,
  CalendarCheck,
  SprayCan,
} from 'lucide-react'
import { getStayFinancialSummary, getStayPayments, getStayCharges } from '../../api/stays'
import { clearRoomCleaning } from '../../utils/roomCleaning'
import type { Room, Stay, Reservation, Charge } from '../../types/api'

interface LogbookSheetProps {
  rooms: Room[]
  stays: Stay[]
  reservations: Reservation[]
  onCheckInRoom: (roomId: number, reservation?: Reservation) => void
  onCheckOut: (stay: Stay) => void
  onExtendStay?: (stay: Stay) => void
  onRefresh?: () => void
}

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDayDiff(startDateStr: string, endDateStr: string): number {
  const [y1, m1, d1] = startDateStr.split('-').map(Number)
  const [y2, m2, d2] = endDateStr.split('-').map(Number)
  const utc1 = Date.UTC(y1, m1 - 1, d1)
  const utc2 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24))
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Ready soon…'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}m ${String(sec).padStart(2, '0')}s`
}

export function LogbookSheet({
  rooms,
  stays,
  reservations,
  onCheckInRoom,
  onCheckOut,
  onExtendStay,
  onRefresh,
}: LogbookSheetProps) {
  // Calendar Start Date
  const [startDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [daysCount] = useState(7) // 7-day rolling window
  const [activeStayPopover, setActiveStayPopover] = useState<{
    stay: Stay
    room: Room
    dayIndex: number
    totalNights: number
    nightNumber: number
  } | null>(null)

  // Tick counter to force countdown re-renders every second
  const [_tick, setTick] = useState(0)
  const hasCleaningRooms = rooms.some((r) => r.status === 'CLEANING' && r.available_after)
  useEffect(() => {
    if (!hasCleaningRooms) return
    const interval = setInterval(() => {
      setTick((t) => t + 1)
      // When 1-hour cleaning expires, clear persistent state and auto-trigger refresh to release room
      let anyExpired = false
      for (const r of rooms) {
        if (
          r.status === 'CLEANING' &&
          r.available_after &&
          new Date(r.available_after).getTime() <= Date.now()
        ) {
          clearRoomCleaning(r.id)
          anyExpired = true
        }
      }
      if (anyExpired && onRefresh) {
        onRefresh()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [hasCleaningRooms, rooms, onRefresh])

  // Cache of financial summaries and charges for stays to accurately display Credit vs Payment method per night
  const [stayFinancials, setStayFinancials] = useState<
    Record<
      number,
      {
        balance: number
        totalDue: number
        totalPaid: number
        method: string
        payments: Array<{ amount: number; method: string; reference?: string | null; status?: string }>
        charges: Charge[]
        extensionNights: number
        unpaidExtensionCredit: number
        unpaidExtensionNights: number
        paidExtensionNights: number
      }
    >
  >({})

  useEffect(() => {
    let isMounted = true
    const checkedInStays = stays.filter((s) => s.status === 'CHECKED_IN' || s.status === 'ACTIVE')
    if (checkedInStays.length === 0) return

    Promise.all(
      checkedInStays.map(async (s) => {
        try {
          const [summary, payments, charges] = await Promise.all([
            getStayFinancialSummary(s.id).catch(() => null),
            getStayPayments(s.id).catch(() => []),
            getStayCharges(s.id).catch(() => []),
          ])
          const balance = summary ? Number(summary.balance) : 0
          const totalDue = summary ? Number(summary.total_due) : 0
          const totalPaid = summary ? Number(summary.total_paid) : 0
          const initialMethod = payments[0]?.payment_method || 'CASH'
          const parsedPayments = payments.map((p) => ({
            amount: Number(p.amount) || 0,
            method: p.payment_method || 'CASH',
            reference: p.reference,
            status: p.status,
          }))

          // Extension credit calculation (same business logic as CheckOutModal)
          const extCharges = charges.filter((c) =>
            (c.description || '').toLowerCase().includes('extension')
          )
          const totalExtDue = extCharges.reduce(
            (sum, c) => sum + Number(c.amount || 0) * (c.quantity || 1),
            0
          )
          let totalExtNights = 0
          extCharges.forEach((c) => {
            const match = (c.description || '').match(/(\d+)\s*night/)
            if (match) {
              totalExtNights += parseInt(match[1], 10)
            } else {
              totalExtNights += c.quantity || 1
            }
          })

          const extPayments = payments.filter(
            (p) => p.status === 'SUCCESS' && (p.reference || '').toLowerCase().includes('extension')
          )
          const directExtPaid = extPayments.reduce(
            (sum, p) => sum + Number(p.amount || 0),
            0
          )
          const initialRoomChargesTotal = charges
            .filter(
              (c) =>
                !(c.description || '').toLowerCase().includes('extension') &&
                c.charge_type !== 'LATE_CHECKOUT_PENALTY'
            )
            .reduce((sum, c) => sum + Number(c.amount || 0) * (c.quantity || 1), 0)

          const totalSuccessfulPayments = payments
            .filter((p) => p.status === 'SUCCESS')
            .reduce((sum, p) => sum + Number(p.amount || 0), 0)

          const excessPaid = Math.max(0, totalSuccessfulPayments - initialRoomChargesTotal)
          const unpaidExtensionCredit = Math.max(
            0,
            totalExtDue - Math.max(directExtPaid, excessPaid)
          )

          // Rate per extension night
          const extRate = totalExtNights > 0 ? totalExtDue / totalExtNights : 0
          const unpaidExtNights =
            extRate > 0 ? Math.min(totalExtNights, Math.round(unpaidExtensionCredit / extRate)) : 0
          const paidExtNights = Math.max(0, totalExtNights - unpaidExtNights)

          return {
            stayId: s.id,
            balance,
            totalDue,
            totalPaid,
            method: initialMethod,
            payments: parsedPayments,
            charges,
            extensionNights: totalExtNights,
            unpaidExtensionCredit,
            unpaidExtensionNights: unpaidExtNights,
            paidExtensionNights: paidExtNights,
          }
        } catch {
          return null
        }
      })
    ).then((results) => {
      if (!isMounted) return
      const map: Record<
        number,
        {
          balance: number
          totalDue: number
          totalPaid: number
          method: string
          payments: Array<{ amount: number; method: string; reference?: string | null; status?: string }>
          charges: Charge[]
          extensionNights: number
          unpaidExtensionCredit: number
          unpaidExtensionNights: number
          paidExtensionNights: number
        }
      > = {}
      for (const r of results) {
        if (r) {
          map[r.stayId] = {
            balance: r.balance,
            totalDue: r.totalDue,
            totalPaid: r.totalPaid,
            method: r.method,
            payments: r.payments,
            charges: r.charges,
            extensionNights: r.extensionNights,
            unpaidExtensionCredit: r.unpaidExtensionCredit,
            unpaidExtensionNights: r.unpaidExtensionNights,
            paidExtensionNights: r.paidExtensionNights,
          }
        }
      }
      setStayFinancials(map)
    })

    return () => {
      isMounted = false
    }
  }, [stays])

  // Automatically dismiss popover if stay was checked out or removed
  useEffect(() => {
    if (activeStayPopover && !stays.some((s) => s.id === activeStayPopover.stay.id && s.status === 'CHECKED_IN')) {
      setActiveStayPopover(null)
    }
  }, [stays, activeStayPopover])

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
    return toLocalDateStr(new Date())
  }, [])

  // Sort rooms numerically
  const filteredRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      const numA = parseInt(a.room_number) || 0
      const numB = parseInt(b.room_number) || 0
      return numA - numB
    })
  }, [rooms])

  // Helper to test if date falls within stay interval
  const getStayForRoomAndDate = (roomId: number, date: Date): {
    stay: Stay
    nightNumber: number
    totalNights: number
  } | null => {
    const targetStr = toLocalDateStr(date)
    for (const s of stays) {
      if (s.room_id !== roomId) continue
      if (s.status !== 'CHECKED_IN' && s.status !== 'ACTIVE') continue
      if (s.actual_checkout_at) continue // Checked out stays immediately disappear

      const checkInRaw = s.check_in_at || (s as any).check_in_date || (s as any).check_in
      const checkOutRaw = s.expected_checkout || (s as any).checkout_date
      if (!checkInRaw || !checkOutRaw) continue

      const checkInDate = new Date(checkInRaw)
      const checkOutDate = new Date(checkOutRaw)
      
      const checkInStr = !isNaN(checkInDate.getTime()) ? toLocalDateStr(checkInDate) : ''
      const checkOutStr = !isNaN(checkOutDate.getTime()) ? toLocalDateStr(checkOutDate) : ''

      if (checkInStr && checkOutStr) {
        if (targetStr >= checkInStr && (targetStr < checkOutStr || (targetStr === checkOutStr && targetStr === todayStr))) {
          // Calculate night number based on pure calendar days
          const diffDays = getDayDiff(checkInStr, targetStr) + 1
          const totalDays = Math.max(1, getDayDiff(checkInStr, checkOutStr))
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
    const targetStr = toLocalDateStr(date)
    for (const r of reservations) {
      if (r.room_id !== roomId) continue
      if (r.status !== 'RESERVED' && r.status !== 'PENDING') continue
      const arrRaw = r.expected_arrival || (r as any).check_in_date || ''
      const outRaw = r.expected_checkout || (r as any).check_out_date || ''
      if (!arrRaw || !outRaw) continue
      const checkInDate = new Date(arrRaw)
      const checkOutDate = new Date(outRaw)
      const inStr = !isNaN(checkInDate.getTime()) ? toLocalDateStr(checkInDate) : ''
      const outStr = !isNaN(checkOutDate.getTime()) ? toLocalDateStr(checkOutDate) : ''
      if (inStr && outStr && targetStr >= inStr && targetStr < outStr) {
        return r
      }
    }
    return null
  }


  // Format date headers
  const formatDayHeader = (date: Date) => {
    const isToday = toLocalDateStr(date) === todayStr
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { dayName, monthDay, isToday }
  }

  // Format payment badge (exact color scheme preserved)
  const renderPaymentBadge = (method?: string, hasCredit?: boolean) => {
    if (hasCredit || method === 'CREDIT') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
          <CreditCard className="w-2.5 h-2.5 text-amber-700" />
          Credit
        </span>
      )
    }

    switch (method) {
      case 'TELEBIRR':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
            <Smartphone className="w-2.5 h-2.5" />
            Telebirr
          </span>
        )
      case 'CBE_BIRR':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Building2 className="w-2.5 h-2.5" />
            CBE Birr
          </span>
        )
      case 'BANK_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <CreditCard className="w-2.5 h-2.5" />
            Bank
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Banknote className="w-2.5 h-2.5" />
            Cash
          </span>
        )
    }
  }

  return (
    <div className="space-y-3">
      {/* Main Excel-Style Spreadsheet Table */}
      <div className="bg-white rounded-xl border border-neutral-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-left select-none border-t border-l border-neutral-300">
            {/* Header: Column labels */}
            <thead>
              <tr className="bg-neutral-100">
                {/* Sticky Left Column: Room info header */}
                <th className="sticky left-0 z-20 bg-neutral-100 border-b border-r border-neutral-300 p-2.5 min-w-[145px] max-w-[155px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                  <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                    Room / Rate
                  </div>
                  <div className="text-xs font-black text-neutral-800 mt-0.5">
                    {filteredRooms.length} Rooms
                  </div>
                </th>

                {/* Day Columns Headers */}
                {dateColumns.map((colDate, idx) => {
                  const { dayName, monthDay, isToday } = formatDayHeader(colDate)
                  return (
                    <th
                      key={idx}
                      className={`p-2 min-w-[170px] border-b border-r border-neutral-300 text-center transition ${
                        isToday
                          ? 'bg-rose-50/70 border-t-2 border-t-[#FF385C]'
                          : 'bg-neutral-100/90'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isToday ? 'text-[#FF385C]' : 'text-neutral-500'
                          }`}
                        >
                          {dayName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-xs font-black ${
                              isToday ? 'text-[#FF385C]' : 'text-neutral-900'
                            }`}
                          >
                            {monthDay}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#FF385C] text-white tracking-wide">
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
            <tbody>
              {filteredRooms.map((room) => {
                const roomPrice = Number(room.price || 0).toLocaleString()

                return (
                  <tr key={room.id} className="hover:bg-neutral-50/50 transition group/row">
                    {/* Sticky Room Info Cell */}
                    <td className="sticky left-0 z-10 bg-white group-hover/row:bg-neutral-50 border-b border-r-2 border-neutral-300 p-2.5 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] align-middle">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black tracking-tight text-neutral-900">
                          {room.room_number}
                        </span>
                        <div className="flex items-center gap-1">
                          {room.status === 'EXPECTED' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                              Reserved
                            </span>
                          )}
                          {room.status === 'CLEANING' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 border border-sky-300 uppercase">
                              Cleaning
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 uppercase">
                            {room.room_type || (room as any).type || 'Room'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold text-neutral-500 mt-0.5">
                        {roomPrice} <span className="text-[10px] font-normal">ETB / night</span>
                      </div>
                    </td>

                    {/* Day Cells for this Room */}
                    {dateColumns.map((colDate, dayIdx) => {
                      const dateStr = toLocalDateStr(colDate)
                      const isToday = dateStr === todayStr
                      const isPast = dateStr < todayStr
                      const stayInfo = getStayForRoomAndDate(room.id, colDate)
                      const resInfo = !stayInfo ? getReservationForRoomAndDate(room.id, colDate) : null

                      // Case 1: Active Stay in Room on this Date
                      if (stayInfo) {
                        const { stay, nightNumber, totalNights } = stayInfo
                        const guestName = (stay as any).guest?.full_name || (stay as any).guest_name || `Guest #${stay.guest_id}`
                        const isPayPopoverActive = activeStayPopover?.stay.id === stay.id

                        const fin = stayFinancials[stay.id]

                        // Rate per night and cumulative charge through this night
                        const ratePerNight =
                          fin && fin.totalDue > 0 && totalNights > 0
                            ? fin.totalDue / totalNights
                            : Number(room.price || 0)
                        // Business rule: The initial check-in is paid immediately upon arrival (Cash).
                        // ONLY extension charges that are explicitly left unpaid should show as "Credit".
                        const extNights = fin
                          ? fin.extensionNights
                          : Number((stay as any).extension_nights || 0)

                        let matchedResOriginalNights = 0
                        if (stay.reservation_id) {
                          const r = reservations.find((res) => res.id === stay.reservation_id)
                          if (r?.expected_arrival && r?.expected_checkout) {
                            const arrStr = toLocalDateStr(new Date(r.expected_arrival))
                            const depStr = toLocalDateStr(new Date(r.expected_checkout))
                            const diff = getDayDiff(arrStr, depStr)
                            if (diff > 0) matchedResOriginalNights = diff
                          }
                        }

                        const originalNights =
                          extNights > 0
                            ? Math.max(1, totalNights - extNights)
                            : matchedResOriginalNights > 0
                            ? matchedResOriginalNights
                            : 1

                        const paidExtNights = fin ? fin.paidExtensionNights : 0

                        // Is this specific night on credit?
                        // Only nights beyond the original check-in AND beyond any paid extension nights are credit!
                        const isThisNightCredit = fin
                          ? nightNumber > originalNights + paidExtNights
                          : Boolean((stay as any).has_credit && nightNumber > originalNights)

                        // Determine the payment method for this specific night
                        let cellPaymentMethod = 'CASH'
                        if (isThisNightCredit) {
                          cellPaymentMethod = 'CREDIT'
                        } else if (nightNumber > originalNights) {
                          // Paid extension night: use extension payment method
                          const extPayment = fin?.payments.find((p) =>
                            (p.reference || '').toLowerCase().includes('extension')
                          )
                          cellPaymentMethod = extPayment?.method || fin?.method || 'CASH'
                        } else {
                          // Initial check-in night: always considered paid using original check-in method
                          const initialMethod =
                            (stay as any).initial_payment_method ||
                            fin?.payments?.find(
                              (p) => !(p.reference || '').toLowerCase().includes('extension') && p.status === 'SUCCESS'
                            )?.method ||
                            ((stay as any).payment_method && (stay as any).payment_method !== 'CREDIT'
                              ? (stay as any).payment_method
                              : undefined) ||
                            (fin?.method && fin.method !== 'CREDIT' ? fin.method : undefined) ||
                            'CASH'
                          cellPaymentMethod = initialMethod
                        }

                        return (
                          <td
                            key={dayIdx}
                            className={`border-b border-r border-neutral-300 p-1.5 h-[68px] align-stretch transition ${
                              isToday ? 'bg-rose-50/15' : ''
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
                              className={`h-full w-full p-1.5 rounded border transition cursor-pointer flex flex-col justify-between ${
                                isPayPopoverActive
                                  ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500 shadow-xs'
                                  : 'bg-emerald-50/90 hover:bg-emerald-100 border-emerald-300 text-emerald-950 border-l-4 border-l-emerald-600'
                              }`}
                            >
                              {/* Top row: Occupied indicator + Night count badge */}
                              <div className="flex items-center justify-between gap-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 uppercase tracking-tight">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  Occupied
                                </span>
                                <span className="px-1 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                                  Day {nightNumber}/{totalNights}
                                </span>
                              </div>

                              {/* Guest Name */}
                              <div className="text-xs font-bold text-neutral-900 truncate" title={guestName}>
                                {guestName}
                              </div>

                              {/* Bottom row: Payment badge & Price */}
                              <div className="flex items-center justify-between gap-1 pt-1 border-t border-emerald-200/60">
                                {renderPaymentBadge(cellPaymentMethod, isThisNightCredit)}
                                <span className="text-[10px] font-bold text-neutral-700">
                                  {roomPrice} <span className="text-[8px]">ETB</span>
                                </span>
                              </div>
                            </div>
                          </td>
                        )
                      }

                      // Case 2: Advance Reservation on this Date or Room is Reserved
                      const isRoomReserved = room.status === 'EXPECTED'
                      const activeRes = resInfo || (isRoomReserved && isToday ? reservations.find(r => r.room_id === room.id && (r.status === 'RESERVED' || r.status === 'PENDING')) : null)

                      if (activeRes) {
                        const guestName = (activeRes as any).guest?.full_name || (activeRes as any).guest_name || `Booking #${activeRes.id}`
                        return (
                          <td
                            key={dayIdx}
                            className={`border-b border-r border-neutral-300 p-1.5 h-[68px] align-stretch ${
                              isToday ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            <div className="h-full w-full p-1.5 rounded border border-amber-300 bg-amber-50/90 text-amber-950 flex flex-col justify-between border-l-4 border-l-amber-500 shadow-2xs">
                              <div className="flex items-center justify-between gap-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 uppercase tracking-tight">
                                  <CalendarCheck className="w-2.5 h-2.5 text-amber-600" />
                                  Reserved
                                </span>
                                <span className="text-[9px] font-bold text-amber-700">
                                  {(activeRes as any).code || `#${activeRes.id}`}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-amber-950 truncate" title={guestName}>
                                {guestName}
                              </div>
                              <div className="pt-0.5">
                                {isPast ? (
                                  <span className="block text-center text-[9px] font-semibold text-neutral-400">
                                    Past Reservation
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onCheckInRoom(room.id, activeRes as Reservation)}
                                    className="w-full py-0.5 text-[9px] font-bold rounded bg-amber-600 text-white hover:bg-amber-700 transition cursor-pointer shadow-2xs"
                                  >
                                    Check In
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        )
                      }

                      // Case 3: Room is being cleaned (CLEANING status with countdown)
                      if (room.status === 'CLEANING' && isToday) {
                        const availableAfter = room.available_after ? new Date(room.available_after) : null
                        const remainingMs = availableAfter ? availableAfter.getTime() - Date.now() : 0
                        const isExpired = remainingMs <= 0
                        const progressPct = availableAfter
                          ? Math.min(100, Math.max(0, (1 - remainingMs / (60 * 60 * 1000)) * 100))
                          : 100

                        return (
                          <td
                            key={dayIdx}
                            className="border-b border-r border-neutral-300 p-1.5 h-[68px] align-stretch bg-sky-50/30"
                          >
                            <div className="h-full w-full p-1.5 rounded border border-sky-300 bg-sky-50/90 text-sky-950 flex flex-col justify-between border-l-4 border-l-sky-500 shadow-2xs">
                              {/* Top: Cleaning badge */}
                              <div className="flex items-center justify-between gap-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-sky-800 uppercase tracking-tight">
                                  <SprayCan className="w-2.5 h-2.5 text-sky-600" />
                                  Cleaning
                                </span>
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                                  {isExpired ? 'Done' : formatCountdown(remainingMs)}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full h-1.5 bg-sky-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                                  style={{
                                    width: `${progressPct}%`,
                                    backgroundColor: isExpired ? '#22c55e' : '#0ea5e9',
                                  }}
                                />
                              </div>

                              {/* Bottom: status text */}
                              <div className="text-center">
                                <span className="text-[9px] font-semibold text-sky-700">
                                  {isExpired ? 'Ready on next refresh' : 'Turnaround in progress'}
                                </span>
                              </div>
                            </div>
                          </td>
                        )
                      }


                      // Case 4: Vacant / Available Room (Check-in allowed for CURRENT DAY only)
                      if (!isToday) {
                        return (
                          <td
                            key={dayIdx}
                            className="border-b border-r border-neutral-300 p-1.5 h-[68px] align-stretch bg-neutral-50/40 select-none"
                            title={isPast ? `Past date (${dateStr}) — cannot check in retroactively` : `Future date (${dateStr}) — check-in is for current day only`}
                          >
                            <div className="h-full w-full rounded p-1 flex flex-col items-center justify-center text-center">
                              <span className="text-xs font-semibold text-neutral-300">
                                —
                              </span>
                              <span className="text-[9px] font-medium text-neutral-400 mt-0.5">
                                Vacant
                              </span>
                            </div>
                          </td>
                        )
                      }

                      // Current Day Vacant Cell: Interactive + Check In
                      return (
                        <td
                          key={dayIdx}
                          className="border-b border-r border-neutral-300 p-1.5 h-[68px] align-stretch bg-rose-50/15 group/cell"
                        >
                          <button
                            type="button"
                            onClick={() => onCheckInRoom(room.id)}
                            className="h-full w-full rounded border border-dashed border-neutral-300 group-hover/cell:border-[#FF385C] bg-white/70 group-hover/cell:bg-white p-1 flex flex-col items-center justify-center cursor-pointer transition shadow-2xs text-center"
                            title={`Click to check in room ${room.room_number} today`}
                          >
                            <span className="text-[11px] font-bold text-neutral-500 group-hover/cell:text-[#FF385C] flex items-center gap-1 transition">
                              <Plus className="w-3 h-3 text-[#FF385C]" />
                              <span>Check In</span>
                            </span>
                            <span className="text-[9px] text-neutral-400 group-hover/cell:text-neutral-600 mt-0.5 font-medium">
                              {roomPrice} ETB
                            </span>
                          </button>
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
        <div className="p-4 rounded-xl bg-neutral-900 text-white shadow-xl border border-neutral-700 animate-in fade-in slide-in-from-bottom-2 duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-black text-lg text-emerald-400">
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
                {(() => {
                  const fin = stayFinancials[activeStayPopover.stay.id]
                  // Only show credit for unpaid EXTENSION charges.
                  // Initial check-in is assumed paid (Cash).
                  const extensionCredit = fin
                    ? fin.unpaidExtensionCredit
                    : Number((activeStayPopover.stay as any).extension_credit || 0)
                  return extensionCredit > 0.5 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Credit: {Math.round(extensionCredit).toLocaleString()} ETB
                    </span>
                  ) : null
                })()}
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
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 cursor-pointer border border-white/10"
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
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
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
    </div>
  )
}
