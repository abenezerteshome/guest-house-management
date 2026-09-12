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
} from 'lucide-react'
import { getStayFinancialSummary, getStayPayments } from '../../api/stays'
import type { Room, Stay, Reservation } from '../../types/api'

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

export function LogbookSheet({
  rooms,
  stays,
  reservations,
  onCheckInRoom,
  onCheckOut,
  onExtendStay,
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

  // Cache of financial summaries for stays to accurately display Credit vs Payment method per night
  const [stayFinancials, setStayFinancials] = useState<
    Record<
      number,
      {
        balance: number
        totalDue: number
        totalPaid: number
        method: string
        payments: Array<{ amount: number; method: string }>
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
          const [summary, payments] = await Promise.all([
            getStayFinancialSummary(s.id).catch(() => null),
            getStayPayments(s.id).catch(() => []),
          ])
          const balance = summary ? Number(summary.balance) : 0
          const totalDue = summary ? Number(summary.total_due) : 0
          const totalPaid = summary ? Number(summary.total_paid) : 0
          const initialMethod = payments[0]?.payment_method || 'CASH'
          const parsedPayments = payments.map((p) => ({
            amount: Number(p.amount) || 0,
            method: p.payment_method || 'CASH',
          }))
          return {
            stayId: s.id,
            balance,
            totalDue,
            totalPaid,
            method: initialMethod,
            payments: parsedPayments,
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
          payments: Array<{ amount: number; method: string }>
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
                        const hasOverallCredit = fin
                          ? fin.balance > 0
                          : Boolean(
                              (stay as any).has_credit ||
                              Number((stay as any).summary?.balance || 0) > 0 ||
                              (stay as any).payment_method === 'CREDIT'
                            )

                        // Rate per night and cumulative charge through this night
                        const ratePerNight =
                          fin && fin.totalDue > 0 && totalNights > 0
                            ? fin.totalDue / totalNights
                            : Number(room.price || 0)
                        const cumulativeDueForThisNight = nightNumber * ratePerNight

                        // Determine whether this specific night has been covered by payments
                        const isThisNightPaid = fin
                          ? fin.totalPaid >= cumulativeDueForThisNight - 0.5
                          : !hasOverallCredit

                        const isThisNightCredit = !isThisNightPaid && hasOverallCredit

                        // Determine the payment method for this specific night
                        let cellPaymentMethod = 'CASH'
                        if (isThisNightCredit) {
                          cellPaymentMethod = 'CREDIT'
                        } else if (fin && fin.payments && fin.payments.length > 0) {
                          let runningPaid = 0
                          let foundMethod = fin.method || 'CASH'
                          for (const p of fin.payments) {
                            runningPaid += p.amount
                            if (runningPaid >= cumulativeDueForThisNight - 0.5) {
                              foundMethod = p.method
                              break
                            }
                          }
                          cellPaymentMethod = foundMethod
                        } else if (fin) {
                          cellPaymentMethod = fin.method || 'CASH'
                        } else {
                          cellPaymentMethod = (stay as any).payment_method || 'CASH'
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


                      // Case 3: Vacant / Available Room (Check-in allowed for CURRENT DAY only)
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
                {Boolean(
                  (activeStayPopover.stay as any).has_credit ||
                  (stayFinancials[activeStayPopover.stay.id]?.balance ?? 0) > 0 ||
                  Number((activeStayPopover.stay as any).summary?.balance ?? 0) > 0
                ) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Credit: {Number(stayFinancials[activeStayPopover.stay.id]?.balance ?? (activeStayPopover.stay as any).summary?.balance ?? 0).toLocaleString()} ETB
                  </span>
                )}
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
