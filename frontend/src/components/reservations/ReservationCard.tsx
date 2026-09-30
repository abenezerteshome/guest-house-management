import {
  Phone,
  BedDouble,
  UserCheck,
  X,
  Ban,
  CheckCircle2,
} from 'lucide-react'
import { Avatar } from '../common/Avatar'
import { Badge, type BadgeTone } from '../common/Badge'
import { Button } from '../common/Button'
import { toLocalDateStr, todayLocalDateString } from '../../utils/dateUtils'
import type { Reservation, Room, Guest } from '../../types/api'

export interface ReservationCardProps {
  reservation: Reservation
  guest?: Guest
  room?: Room
  onCheckIn: (res: Reservation) => void
  onCancel: (resId: number) => void
  onNoShow: (resId: number) => void
  actionLoading?: {
    id: number
    type: 'cancel' | 'no-show'
  } | null
}

const statusTone: Record<string, BadgeTone> = {
  RESERVED: 'expected',
  CHECKED_IN: 'available',
  CANCELLED: 'inactive',
  NO_SHOW: 'inactive',
}

function formatSchedule(dateStr: string) {
  if (!dateStr) return { date: '—', time: '' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { date: dateStr, time: '' }

  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return { date, time }
}

function calculateNights(arrStr: string, depStr: string): number {
  if (!arrStr || !depStr) return 1
  const arr = new Date(arrStr)
  const dep = new Date(depStr)
  if (isNaN(arr.getTime()) || isNaN(dep.getTime())) return 1
  const diffHours = (dep.getTime() - arr.getTime()) / (1000 * 60 * 60)
  return Math.max(1, Math.round(diffHours / 24))
}

export function ReservationCard({
  reservation: r,
  guest,
  room,
  onCheckIn,
  onCancel,
  onNoShow,
  actionLoading,
}: ReservationCardProps) {
  const isActionLoading = actionLoading?.id === r.id
  const arrFormatted = formatSchedule(r.expected_arrival)
  const depFormatted = formatSchedule(r.expected_checkout)
  const nights = calculateNights(r.expected_arrival, r.expected_checkout)

  // Single concise status badge
  const arrLocalDateStr = r.expected_arrival ? toLocalDateStr(new Date(r.expected_arrival)) : ''
  const isToday = arrLocalDateStr === todayLocalDateString()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = arrLocalDateStr === toLocalDateStr(tomorrow)
  const isPast = Boolean(
    r.expected_arrival &&
      new Date(r.expected_arrival).getTime() < new Date().setHours(0, 0, 0, 0)
  )

  const guestName = guest?.full_name || `Guest #${r.guest_id}`
  const guestPhone = guest?.phone

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-3.5 shadow-xs space-y-3 hover:border-neutral-300 transition-colors">
      {/* Top Header: #ID + Room on left, single status on right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded-md">
            #{r.id}
          </span>
          {room ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-[#FF385C] border border-rose-100 text-xs font-bold">
              <BedDouble className="w-3 h-3" />
              Room {room.room_number}
            </span>
          ) : (
            <span className="text-xs text-neutral-400">Room #{r.room_id}</span>
          )}
        </div>

        {/* Single clean status badge without repetition */}
        <div>
          {r.status === 'RESERVED' && isToday ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Today
            </span>
          ) : r.status === 'RESERVED' && isTomorrow ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              Tomorrow
            </span>
          ) : r.status === 'RESERVED' && isPast ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Overdue
            </span>
          ) : (
            <Badge tone={statusTone[r.status] || 'neutral'} size="sm">
              {r.status === 'RESERVED'
                ? 'Reserved'
                : r.status === 'CHECKED_IN'
                ? 'Checked In'
                : r.status === 'CANCELLED'
                ? 'Cancelled'
                : 'No-Show'}
            </Badge>
          )}
        </div>
      </div>

      {/* Guest Name & Phone */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={guestName} size="sm" />
          <div className="min-w-0">
            <h4 className="font-bold text-neutral-900 text-sm leading-tight truncate">
              {guestName}
            </h4>
            {room?.room_type && (
              <p className="text-[11px] text-neutral-400 capitalize">{room.room_type}</p>
            )}
          </div>
        </div>

        {guestPhone && (
          <a
            href={`tel:${guestPhone}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-xl shrink-0 transition"
          >
            <Phone className="w-3 h-3 text-[#FF385C]" />
            <span>{guestPhone}</span>
          </a>
        )}
      </div>

      {/* Clean, Compact Schedule Box */}
      <div className="bg-[#FAF8F5] border border-[#EFEBE4] rounded-xl p-2.5">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
              Check-In
            </span>
            <p className="font-bold text-neutral-900 text-[13px] mt-0.5">{arrFormatted.date}</p>
            <p className="text-[11px] text-neutral-500">{arrFormatted.time}</p>
          </div>

          <div className="text-center px-1 shrink-0">
            <span className="text-[11px] font-semibold text-neutral-600 bg-white border border-neutral-200 px-2 py-0.5 rounded-full shadow-2xs">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
              Check-Out
            </span>
            <p className="font-bold text-neutral-900 text-[13px] mt-0.5">{depFormatted.date}</p>
            <p className="text-[11px] text-neutral-500">{depFormatted.time}</p>
          </div>
        </div>

        {Number(r.expected_amount) > 0 && (
          <div className="mt-2 pt-1.5 border-t border-[#EAE4DC] space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Total Rate</span>
              <span className="font-bold text-neutral-900">
                ETB {Number(r.expected_amount).toLocaleString()}
              </span>
            </div>
            {Number(r.deposit_amount) > 0 && (
              <div className="flex items-center justify-between text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold">
                <span>Deposit ({r.deposit_method || 'Paid'}):</span>
                <span>
                  {Number(r.deposit_amount) >= Number(r.expected_amount) ? (
                    '✓ Fully Prepaid'
                  ) : (
                    `ETB ${Number(r.deposit_amount).toLocaleString()} • Due: ETB ${(Number(r.expected_amount) - Number(r.deposit_amount)).toLocaleString()}`
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Optional short note */}
      {r.notes && (
        <p className="text-xs text-neutral-500 italic px-1 truncate">
          "{r.notes}"
        </p>
      )}

      {/* Action Buttons */}
      {r.status === 'RESERVED' ? (
        <div className="pt-1 space-y-1.5">
          <Button
            variant="primary"
            size="sm"
            isLoading={isActionLoading && !actionLoading?.type}
            disabled={isActionLoading}
            onClick={() => onCheckIn(r)}
            className="w-full justify-center gap-1.5 font-bold shadow-xs h-9 text-xs"
          >
            <UserCheck className="w-4 h-4" />
            Check In
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="xs"
              leftIcon={<X className="w-3 h-3" />}
              isLoading={isActionLoading && actionLoading?.type === 'cancel'}
              disabled={isActionLoading}
              onClick={() => onCancel(r.id)}
              className="w-full justify-center text-neutral-700 hover:text-rose-600 h-8"
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              size="xs"
              leftIcon={<Ban className="w-3 h-3" />}
              isLoading={isActionLoading && actionLoading?.type === 'no-show'}
              disabled={isActionLoading}
              onClick={() => onNoShow(r.id)}
              className="w-full justify-center text-neutral-500 hover:text-amber-600 h-8"
            >
              No-Show
            </Button>
          </div>
        </div>
      ) : r.status === 'CHECKED_IN' ? (
        <div className="py-1 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Checked In</span>
        </div>
      ) : (
        <div className="py-1 text-center text-xs text-neutral-400 font-medium capitalize">
          {r.status.toLowerCase().replace('_', ' ')}
        </div>
      )}
    </div>
  )
}
