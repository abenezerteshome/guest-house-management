import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  UserCheck,
  X,
  Ban,
  Calendar,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Users,
  BedDouble,
  FileText,
  Phone,
  Wallet,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Badge, type BadgeTone } from '../../components/common/Badge'
import { Table, type TableColumn } from '../../components/common/Table'
import { Avatar } from '../../components/common/Avatar'
import { ReservationCard } from '../../components/reservations/ReservationCard'
import { ReservationModal } from '../../components/modals/ReservationModal'
import { CheckInModal } from '../../components/modals/CheckInModal'
import { ConfirmCancelReservationModal } from '../../components/modals/ConfirmCancelReservationModal'
import {
  getReservations,
  cancelReservation,
  markReservationNoShow,
} from '../../api/reservations'
import { getRooms } from '../../api/rooms'
import { getGuests } from '../../api/guests'
import { toLocalDateStr, todayLocalDateString } from '../../utils/dateUtils'
import type { Reservation, Room, Guest } from '../../types/api'

type StatusFilter = 'ALL' | 'RESERVED' | 'CHECKED_IN' | 'CANCELLED_NO_SHOW'
type SortOption = 'arrival_asc' | 'arrival_desc' | 'created_desc'

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

export function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('RESERVED')
  // Default: ascending by reserved arrival date
  const [sortBy, setSortBy] = useState<SortOption>('arrival_asc')

  const [actionLoading, setActionLoading] = useState<{
    id: number
    type: 'cancel' | 'no-show'
  } | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [checkInModalOpen, setCheckInModalOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  const [cancelModalState, setCancelModalState] = useState<{
    isOpen: boolean
    reservation: Reservation | null
    type: 'cancel' | 'no-show'
  }>({
    isOpen: false,
    reservation: null,
    type: 'cancel',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [resData, roomsData, guestsData] = await Promise.all([
        getReservations(),
        getRooms(),
        getGuests().catch(() => []),
      ])
      setReservations(resData)
      setRooms(roomsData)
      setGuests(guestsData)
    } catch (err) {
      console.error('Failed to fetch reservations data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])
  const guestMap = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests])
  const availableRooms = useMemo(() => rooms.filter((r) => r.status === 'AVAILABLE'), [rooms])

  function handleCheckIn(res: Reservation) {
    setSelectedReservation(res)
    setCheckInModalOpen(true)
  }

  function handleCancelPrompt(resIdOrRes: number | Reservation) {
    const res =
      typeof resIdOrRes === 'number'
        ? reservations.find((r) => r.id === resIdOrRes) || null
        : resIdOrRes
    if (!res) return
    setCancelModalState({
      isOpen: true,
      reservation: res,
      type: 'cancel',
    })
  }

  function handleNoShowPrompt(resIdOrRes: number | Reservation) {
    const res =
      typeof resIdOrRes === 'number'
        ? reservations.find((r) => r.id === resIdOrRes) || null
        : resIdOrRes
    if (!res) return
    setCancelModalState({
      isOpen: true,
      reservation: res,
      type: 'no-show',
    })
  }

  async function handleConfirmCancelOrNoShow() {
    const res = cancelModalState.reservation
    if (!res) return

    const isCancel = cancelModalState.type === 'cancel'
    setActionLoading({ id: res.id, type: cancelModalState.type })
    try {
      if (isCancel) {
        await cancelReservation(res.id)
      } else {
        await markReservationNoShow(res.id)
      }
      setCancelModalState({ isOpen: false, reservation: null, type: 'cancel' })
      fetchData()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        `Failed to ${isCancel ? 'cancel reservation' : 'mark no-show'}.`
      alert(msg)
    } finally {
      setActionLoading(null)
    }
  }

  // Summary statistics for desktop overview
  const stats = useMemo(() => {
    const todayStr = todayLocalDateString()
    let arrivingToday = 0
    let reservedPending = 0
    let checkedIn = 0
    let cancelled = 0

    reservations.forEach((r) => {
      if (r.status === 'RESERVED') {
        reservedPending++
        if (r.expected_arrival && toLocalDateStr(new Date(r.expected_arrival)) === todayStr) {
          arrivingToday++
        }
      } else if (r.status === 'CHECKED_IN') {
        checkedIn++
      } else if (r.status === 'CANCELLED' || r.status === 'NO_SHOW') {
        cancelled++
      }
    })

    return {
      total: reservations.length,
      reserved: reservedPending,
      arrivingToday,
      checkedIn,
      cancelled,
    }
  }, [reservations])

  // Filter and sort reservations ascending by reserved arrival date by default
  const sortedReservations = useMemo(() => {
    const searchLower = search.trim().toLowerCase()

    const filtered = reservations.filter((r) => {
      const guest = guestMap.get(r.guest_id)
      const room = roomMap.get(r.room_id)

      const matchesSearch =
        !searchLower ||
        (guest?.full_name || '').toLowerCase().includes(searchLower) ||
        (guest?.phone || '').includes(searchLower) ||
        (room?.room_number || '').toLowerCase().includes(searchLower) ||
        (room?.room_type || '').toLowerCase().includes(searchLower) ||
        String(r.id).includes(searchLower)

      if (!matchesSearch) return false

      if (statusFilter === 'ALL') {
        return r.status !== 'CANCELLED' && r.status !== 'NO_SHOW'
      }
      if (statusFilter === 'RESERVED') return r.status === 'RESERVED'
      if (statusFilter === 'CHECKED_IN') return r.status === 'CHECKED_IN'
      if (statusFilter === 'CANCELLED_NO_SHOW') {
        return r.status === 'CANCELLED' || r.status === 'NO_SHOW'
      }
      return true
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'arrival_asc') {
        const timeA = a.expected_arrival ? new Date(a.expected_arrival).getTime() : 0
        const timeB = b.expected_arrival ? new Date(b.expected_arrival).getTime() : 0
        if (timeA !== timeB) return timeA - timeB
        return a.id - b.id
      }
      if (sortBy === 'arrival_desc') {
        const timeA = a.expected_arrival ? new Date(a.expected_arrival).getTime() : 0
        const timeB = b.expected_arrival ? new Date(b.expected_arrival).getTime() : 0
        if (timeA !== timeB) return timeB - timeA
        return b.id - a.id
      }
      if (sortBy === 'created_desc') {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
        if (timeA !== timeB) return timeB - timeA
        return b.id - a.id
      }
      return 0
    })
  }, [reservations, guestMap, roomMap, search, statusFilter, sortBy])

  // Table columns for Desktop view
  const columns: TableColumn<Reservation>[] = [
    {
      key: 'id',
      header: 'Reservation',
      render: (r) => (
        <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
          #{r.id}
        </span>
      ),
    },
    {
      key: 'guest',
      header: 'Guest',
      render: (r) => {
        const guest = guestMap.get(r.guest_id)
        const name = guest?.full_name || `Guest #${r.guest_id}`
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={name} size="sm" />
            <div>
              <p className="font-bold text-neutral-900 text-sm leading-tight">{name}</p>
              {guest?.phone && (
                <a
                  href={`tel:${guest.phone}`}
                  className="text-xs text-neutral-500 hover:text-[#FF385C] flex items-center gap-1 mt-0.5 font-medium transition"
                >
                  <Phone className="w-3 h-3" />
                  {guest.phone}
                </a>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'room',
      header: 'Room',
      render: (r) => {
        const room = roomMap.get(r.room_id)
        return room ? (
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#FF385C]/10 text-[#FF385C]">
              <BedDouble className="w-3 h-3" />
              Room {room.room_number}
            </span>
            <p className="text-[11px] text-neutral-500 mt-0.5 capitalize">{room.room_type}</p>
          </div>
        ) : (
          <span className="text-xs text-neutral-400">Room #{r.room_id}</span>
        )
      },
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (r) => {
        const arr = formatSchedule(r.expected_arrival)
        const dep = formatSchedule(r.expected_checkout)
        const nights = calculateNights(r.expected_arrival, r.expected_checkout)
        return (
          <div className="space-y-0.5 text-xs">
            <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#FF385C]" />
              <span>{arr.date} ({arr.time})</span>
            </div>
            <div className="text-neutral-500 flex items-center gap-1.5">
              <span>to {dep.date}</span>
              <span className="text-[11px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded font-medium">
                {nights} {nights === 1 ? 'nt' : 'nts'}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const arrLocalDateStr = r.expected_arrival ? toLocalDateStr(new Date(r.expected_arrival)) : ''
        const isToday = arrLocalDateStr === todayLocalDateString()
        const isPast = Boolean(
          r.expected_arrival &&
            new Date(r.expected_arrival).getTime() < new Date().setHours(0, 0, 0, 0)
        )
        if (r.status === 'RESERVED' && isPast) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Overdue
            </span>
          )
        }
        if (r.status === 'RESERVED' && isToday) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Today
            </span>
          )
        }
        return (
          <Badge tone={statusTone[r.status] || 'neutral'} size="sm">
            {r.status === 'RESERVED'
              ? 'Reserved'
              : r.status === 'CHECKED_IN'
              ? 'Checked In'
              : r.status === 'CANCELLED'
              ? 'Cancelled'
              : 'No-Show'}
          </Badge>
        )
      },
    },
    {
      key: 'notes',
      header: 'Amount / Notes',
      render: (r) => (
        <div className="max-w-[200px] text-xs space-y-1">
          {Number(r.expected_amount) > 0 && (
            <p className="font-semibold text-neutral-900 flex items-center gap-1">
              <Wallet className="w-3 h-3 text-neutral-500" />
              ETB {Number(r.expected_amount).toLocaleString()}
            </p>
          )}
          {Number(r.deposit_amount) > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {Number(r.deposit_amount) >= Number(r.expected_amount)
                ? '✓ Fully Prepaid'
                : `Deposit: ETB ${Number(r.deposit_amount).toLocaleString()}`}
            </span>
          )}
          {r.notes ? (
            <p className="text-neutral-500 italic truncate flex items-center gap-1" title={r.notes}>
              <FileText className="w-3 h-3 text-neutral-400 shrink-0" />
              {r.notes}
            </p>
          ) : (
            !Number(r.expected_amount) && !Number(r.deposit_amount) && <span className="text-neutral-300">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => {
        const isActionLoading = actionLoading?.id === r.id
        if (r.status === 'RESERVED') {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="primary"
                size="xs"
                isLoading={isActionLoading && !actionLoading?.type}
                disabled={isActionLoading}
                onClick={() => handleCheckIn(r)}
                className="gap-1 font-bold shadow-2xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Check In
              </Button>
              <Button
                variant="outline"
                size="xs"
                leftIcon={<X className="w-3.5 h-3.5" />}
                isLoading={isActionLoading && actionLoading?.type === 'cancel'}
                disabled={isActionLoading}
                onClick={() => handleCancelPrompt(r)}
                className="text-neutral-600 hover:text-rose-600"
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<Ban className="w-3.5 h-3.5" />}
                isLoading={isActionLoading && actionLoading?.type === 'no-show'}
                disabled={isActionLoading}
                onClick={() => handleNoShowPrompt(r)}
                className="text-neutral-400 hover:text-amber-600"
              >
                No-Show
              </Button>
            </div>
          )
        }
        if (r.status === 'CHECKED_IN') {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Checked In
            </span>
          )
        }
        return <span className="text-xs text-neutral-400 italic capitalize">{r.status.toLowerCase().replace('_', ' ')}</span>
      },
    },
  ]

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <PageHeader
        title="Reservations"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="gap-1.5 shadow-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            New Reservation
          </Button>
        }
      />

      {/* KPI Overview Row - Desktop Only */}
      <div className="hidden md:grid md:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('RESERVED')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'RESERVED'
              ? 'bg-[#FFF0F2] border-[#FF385C]/30 shadow-xs'
              : 'bg-white border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center justify-between text-[#FF385C] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Upcoming</span>
            <Calendar className="w-4 h-4 text-[#FF385C]" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{stats.reserved}</p>
        </div>

        <div
          onClick={() => setStatusFilter('RESERVED')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            stats.arrivingToday > 0
              ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
              : 'bg-white border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Today</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-950">{stats.arrivingToday}</p>
        </div>

        <div
          onClick={() => setStatusFilter('CHECKED_IN')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'CHECKED_IN'
              ? 'bg-sky-50 border-sky-300 shadow-xs'
              : 'bg-white border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center justify-between text-sky-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Checked In</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-sky-950">{stats.checkedIn}</p>
        </div>

        <div
          onClick={() => setStatusFilter('CANCELLED_NO_SHOW')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'CANCELLED_NO_SHOW'
              ? 'bg-neutral-100 border-neutral-300 shadow-xs'
              : 'bg-white border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Cancelled</span>
            <Ban className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{stats.cancelled}</p>
        </div>
      </div>

      {/* Compact Controls: Search, Sort & Filter Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reservations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-7 text-xs sm:text-sm rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF385C] transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Compact Sort dropdown */}
          <div className="flex items-center gap-1 px-2.5 h-9 rounded-xl border border-neutral-200 bg-white text-xs shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#FF385C]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent font-semibold text-neutral-700 focus:outline-none cursor-pointer text-xs pr-1"
            >
              <option value="arrival_asc">Earliest</option>
              <option value="arrival_desc">Latest</option>
              <option value="created_desc">Newest</option>
            </select>
          </div>
        </div>

        {/* Minimal Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setStatusFilter('RESERVED')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'RESERVED'
                ? 'bg-[#FF385C] text-white shadow-2xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Upcoming ({stats.reserved})
          </button>
          <button
            onClick={() => setStatusFilter('CHECKED_IN')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'CHECKED_IN'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Checked In ({stats.checkedIn})
          </button>
          <button
            onClick={() => setStatusFilter('CANCELLED_NO_SHOW')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'CANCELLED_NO_SHOW'
                ? 'bg-neutral-800 text-white shadow-2xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Cancelled ({stats.cancelled})
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center text-xs text-neutral-500 shadow-xs">
          <div className="inline-flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#FF385C] border-t-transparent animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      ) : sortedReservations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center shadow-xs space-y-2.5">
          <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">No reservations found</h3>
          {(search || statusFilter !== 'ALL') && (
            <Button
              variant="outline"
              size="xs"
              leftIcon={<RotateCcw className="w-3 h-3" />}
              onClick={() => {
                setSearch('')
                setStatusFilter('ALL')
              }}
            >
              Reset filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile View: Concise, uncluttered cards */}
          <div className="space-y-3 block md:hidden">
            {sortedReservations.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                guest={guestMap.get(r.guest_id)}
                room={roomMap.get(r.room_id)}
                onCheckIn={handleCheckIn}
                onCancel={handleCancelPrompt}
                onNoShow={handleNoShowPrompt}
                actionLoading={actionLoading}
              />
            ))}
          </div>

          {/* Desktop View: Clean Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <Table
                columns={columns}
                data={sortedReservations}
                keyExtractor={(r) => r.id}
                isLoading={false}
                emptyMessage="No reservations found."
                className="border-none shadow-none rounded-none min-w-[850px]"
              />
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <ReservationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        availableRooms={availableRooms}
        onSuccess={() => fetchData()}
      />

      <CheckInModal
        isOpen={checkInModalOpen}
        onClose={() => {
          setCheckInModalOpen(false)
          setSelectedReservation(null)
        }}
        availableRooms={availableRooms}
        allRooms={rooms}
        selectedRoomId={selectedReservation?.room_id}
        existingReservation={selectedReservation}
        onSuccess={() => fetchData()}
      />

      <ConfirmCancelReservationModal
        isOpen={cancelModalState.isOpen}
        onClose={() => setCancelModalState({ isOpen: false, reservation: null, type: 'cancel' })}
        onConfirm={handleConfirmCancelOrNoShow}
        reservation={cancelModalState.reservation}
        guestName={cancelModalState.reservation ? guestMap.get(cancelModalState.reservation.guest_id)?.full_name : undefined}
        roomNumber={cancelModalState.reservation ? roomMap.get(cancelModalState.reservation.room_id)?.room_number : undefined}
        actionType={cancelModalState.type}
        loading={Boolean(actionLoading && actionLoading.id === cancelModalState.reservation?.id)}
      />
    </div>
  )
}
