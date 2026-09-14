import type { ReactNode } from 'react'
import { Pencil, Trash2, SprayCan, Clock, CreditCard, Banknote, User, AlertCircle } from 'lucide-react'

export interface RoomCardData {
  id?: string
  roomNumber: string
  roomType: string
  pricePerNight: string | number
  hourlyPrice?: string | number | null
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'RESERVED' | 'EXPECTED'
  availableAfter?: string | null
  capacity?: number
  bedType?: string
  amenities?: string[]
  // Active stay / occupant details
  guestName?: string
  guestPhone?: string
  stayNightsText?: string
  hasCredit?: boolean
  creditAmount?: number
  expectedCheckout?: string
  expectedArrival?: string
}

export interface RoomCardProps {
  room: RoomCardData
  isAdmin?: boolean
  onEdit?: (room: RoomCardData) => void
  onDelete?: (room: RoomCardData) => void
  onSelect?: (room: RoomCardData) => void
  actionSlot?: ReactNode
  className?: string
}

export function RoomCard({
  room,
  isAdmin = false,
  onEdit,
  onDelete,
  onSelect,
  actionSlot,
  className = '',
}: RoomCardProps) {
  const formattedPrice =
    typeof room.pricePerNight === 'number'
      ? room.pricePerNight.toLocaleString()
      : room.pricePerNight.replace(/^ETB\s*/i, '')

  // Cleaning countdown calculation
  const availableAfterDate = room.availableAfter ? new Date(room.availableAfter) : null
  const remainingCleaningMs = availableAfterDate ? availableAfterDate.getTime() - Date.now() : 0
  const isCleaningDone = remainingCleaningMs <= 0
  const cleaningMinutesLeft = Math.max(0, Math.ceil(remainingCleaningMs / (60 * 1000)))
  const cleaningProgressPct = availableAfterDate
    ? Math.min(100, Math.max(0, (1 - remainingCleaningMs / (60 * 60 * 1000)) * 100))
    : 100

  // Keep status color restrained so room information remains the focus.
  const statusConfig = {
    AVAILABLE: {
      cardBg: 'bg-white border-neutral-200 hover:border-neutral-300',
      badgeBg: 'bg-neutral-800 text-white',
      pillBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotColor: 'bg-emerald-600',
      label: 'Available',
      pulse: false,
      borderDivider: 'border-neutral-200',
    },
    OCCUPIED: {
      cardBg: 'bg-white border-l-4 border-l-rose-300 border-y-neutral-200 border-r-neutral-200 hover:border-r-neutral-300',
      badgeBg: 'bg-neutral-800 text-white',
      pillBg: 'bg-rose-50 text-rose-700 border-rose-200',
      dotColor: 'bg-rose-600',
      label: 'Occupied',
      pulse: false,
      borderDivider: 'border-neutral-200',
    },
    CLEANING: {
      cardBg: 'bg-white border-l-4 border-l-slate-300 border-y-neutral-200 border-r-neutral-200 hover:border-r-neutral-300',
      badgeBg: 'bg-neutral-800 text-white',
      pillBg: 'bg-slate-100 text-slate-700 border-slate-200',
      dotColor: 'bg-slate-500',
      label: 'Turnaround',
      pulse: false,
      borderDivider: 'border-neutral-200',
    },
    RESERVED: {
      cardBg: 'bg-white border-l-4 border-l-amber-300 border-y-neutral-200 border-r-neutral-200 hover:border-r-neutral-300',
      badgeBg: 'bg-neutral-800 text-white',
      pillBg: 'bg-amber-50 text-amber-700 border-amber-200',
      dotColor: 'bg-amber-600',
      label: 'Reserved',
      pulse: false,
      borderDivider: 'border-amber-200',
    },
    EXPECTED: {
      cardBg: 'bg-white border-l-4 border-l-amber-300 border-y-neutral-200 border-r-neutral-200 hover:border-r-neutral-300',
      badgeBg: 'bg-neutral-800 text-white',
      pillBg: 'bg-amber-50 text-amber-700 border-amber-200',
      dotColor: 'bg-amber-600',
      label: 'Arriving today',
      pulse: false,
      borderDivider: 'border-amber-200',
    },
  }[room.status] || {
    cardBg: 'bg-white border-neutral-200 hover:border-neutral-300',
    badgeBg: 'bg-neutral-700 text-white',
    pillBg: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    dotColor: 'bg-neutral-400',
    label: room.status,
    pulse: false,
    borderDivider: 'border-neutral-200',
  }

  // Format Room Number badge text
  const roomBadgeText = room.roomNumber.toLowerCase().startsWith('room')
    ? room.roomNumber.toUpperCase()
    : `ROOM ${room.roomNumber.toUpperCase()}`

  return (
    <div
      onClick={() => onSelect?.(room)}
      className={`rounded-xl border p-4 shadow-xs transition-all duration-200 flex flex-col justify-between relative group ${
        statusConfig.cardBg
      } ${onSelect ? 'cursor-pointer' : ''} ${className}`}
    >
      <div>
        {/* Top Header: Room Identifier + Admin Controls (Admin Only) + Status Pill */}
        <div className="flex items-center justify-between gap-1.5">
          <span className={`text-xs font-black px-2.5 py-0.5 rounded tracking-wide shadow-2xs ${statusConfig.badgeBg}`}>
            {roomBadgeText}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Admin-only controls: Strictly visible when user is Admin */}
            {isAdmin && (onEdit || onDelete) && (
              <div
                className="flex items-center gap-0.5 bg-white/90 backdrop-blur-xs p-0.5 rounded-lg border border-neutral-200/90 shadow-2xs"
                onClick={(e) => e.stopPropagation()}
              >
                {onEdit && (
                  <button
                    type="button"
                    title="Edit Room (Admin Only)"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(room)
                    }}
                    className="p-1 rounded text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition cursor-pointer"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    title="Delete Room (Admin Only)"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(room)
                    }}
                    className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Status Pill with live color dot */}
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${statusConfig.pillBg}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor} ${
                  statusConfig.pulse ? 'animate-pulse' : ''
                }`}
              />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Room Title */}
        <h3 className="text-lg font-black text-neutral-900 mt-3.5 tracking-tight leading-tight">
          {room.roomType}
        </h3>
        <p className="text-xs text-neutral-600 mt-0.5">
          {room.bedType || 'Comfort Bed'} · {room.capacity ? `Max ${room.capacity} Guests` : 'Standard Occupancy'}
        </p>

        {/* Dynamic Contextual Snapshot: Occupied / Cleaning / Reserved */}
        {room.status === 'OCCUPIED' && (
          <div className="mt-3 p-3 rounded-xl bg-white/90 border border-rose-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-neutral-900 truncate flex items-center gap-1.5">
                <User size={12} className="text-rose-500 shrink-0" />
                {room.guestName || 'Checked-in Guest'}
              </span>
              {room.hasCredit ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <CreditCard size={10} />
                  Credit
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Banknote size={10} />
                  Paid
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <span>{room.stayNightsText || 'Active Stay'}</span>
              <span className="font-semibold text-rose-600">
                {room.expectedCheckout
                  ? `Out: ${new Date(room.expectedCheckout).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}`
                  : 'In Progress'}
              </span>
            </div>
          </div>
        )}

        {room.status === 'CLEANING' && (
          <div className="mt-3 p-3 rounded-xl bg-white/90 border border-sky-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-sky-900">
              <span className="flex items-center gap-1.5">
                <SprayCan size={13} className="text-sky-600" />
                Housekeeping
              </span>
              <span className="font-bold">
                {isCleaningDone ? 'Done' : `${cleaningMinutesLeft}m left`}
              </span>
            </div>
            <div className="w-full bg-sky-200/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${cleaningProgressPct}%` }}
              />
            </div>
          </div>
        )}

        {(room.status === 'RESERVED' || room.status === 'EXPECTED') && room.guestName && (
          <div className="mt-3 p-2.5 rounded-xl bg-white/90 border border-amber-200/90 shadow-2xs space-y-1 text-xs">
            <div className="flex items-center justify-between font-bold text-neutral-900">
              <span className="truncate">{room.guestName}</span>
              <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-semibold">
                Arrival Today
              </span>
            </div>
          </div>
        )}

        {/* Pricing display */}
        <div className="mt-3.5 flex items-baseline justify-between">
          <div className="text-xl font-black text-neutral-900">
            {formattedPrice} <span className="text-xs font-semibold text-neutral-500">ETB / night</span>
          </div>
          {room.hourlyPrice ? (
            <span className="text-[11px] font-semibold text-neutral-500 bg-white/80 px-2 py-0.5 rounded-md border border-black/5">
              ETB {Number(room.hourlyPrice).toLocaleString()} / hr
            </span>
          ) : null}
        </div>
      </div>

      {/* Action Footer */}
      {actionSlot && (
        <div className={`mt-5 pt-3.5 border-t ${statusConfig.borderDivider} w-full`}>
          {actionSlot}
        </div>
      )}
    </div>
  )
}
