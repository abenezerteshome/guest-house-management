import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  RefreshCw,
  UserCheck,
  X,
  Ban,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Badge, type BadgeTone } from '../../components/common/Badge'
import { Table, type TableColumn } from '../../components/common/Table'
import { ReservationModal } from '../../components/modals/ReservationModal'
import {
  getReservations,
  cancelReservation,
  markReservationNoShow,
} from '../../api/reservations'
import { checkInReservation } from '../../api/stays'
import { getRooms } from '../../api/rooms'
import { getGuests } from '../../api/guests'
import type { Reservation, Room, Guest } from '../../types/api'

export function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  const [modalOpen, setModalOpen] = useState(false)

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

  const roomMap = new Map(rooms.map((r) => [r.id, r]))
  const guestMap = new Map(guests.map((g) => [g.id, g]))
  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE')

  async function handleCheckIn(resId: number) {
    setActionLoadingId(resId)
    try {
      await checkInReservation(resId)
      fetchData()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to check in guest.'
      alert(msg)
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleCancel(resId: number) {
    if (!confirm('Are you sure you want to cancel this reservation? Room will become available.')) return
    setActionLoadingId(resId)
    try {
      await cancelReservation(resId)
      fetchData()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to cancel reservation.'
      alert(msg)
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleNoShow(resId: number) {
    if (!confirm('Mark guest as No-Show? Room will become available.')) return
    setActionLoadingId(resId)
    try {
      await markReservationNoShow(resId)
      fetchData()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to mark no-show.'
      alert(msg)
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredReservations = reservations.filter((r) => {
    const matchesFilter = filterStatus === 'ALL' || r.status === filterStatus
    const guest = guestMap.get(r.guest_id)
    const room = roomMap.get(r.room_id)
    const matchesSearch =
      (guest?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (guest?.phone || '').includes(search) ||
      (room?.room_number || '').includes(search) ||
      String(r.id).includes(search)
    return matchesFilter && matchesSearch
  })

  const statusTone: Record<string, BadgeTone> = {
    RESERVED: 'expected',
    CHECKED_IN: 'occupied',
    CANCELLED: 'inactive',
    NO_SHOW: 'maintenance',
  }

  const columns: TableColumn<Reservation>[] = [
    {
      key: 'id',
      header: 'Booking #',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-neutral-900">#{r.id}</span>
      ),
    },
    {
      key: 'guest',
      header: 'Guest Details',
      render: (r) => {
        const guest = guestMap.get(r.guest_id)
        return (
          <div>
            <p className="font-bold text-neutral-900 text-sm">
              {guest?.full_name || `Guest #${r.guest_id}`}
            </p>
            <p className="text-xs text-neutral-500">{guest?.phone || 'No phone'}</p>
          </div>
        )
      },
    },
    {
      key: 'room',
      header: 'Assigned Room',
      render: (r) => {
        const room = roomMap.get(r.room_id)
        return room ? (
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-[#FF385C]/10 text-[#FF385C]">
              Room {room.room_number}
            </span>
            <p className="text-[11px] text-neutral-500 mt-0.5">{room.room_type}</p>
          </div>
        ) : (
          <span className="text-xs text-neutral-400">Room #{r.room_id}</span>
        )
      },
    },
    {
      key: 'dates',
      header: 'Arrival & Departure',
      render: (r) => {
        const arr = new Date(r.expected_arrival).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        const dep = new Date(r.expected_checkout).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        return (
          <div className="text-xs text-neutral-700">
            <p className="font-medium text-neutral-900">Arr: {arr}</p>
            <p className="text-neutral-500">Dep: {dep}</p>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge tone={statusTone[r.status] || 'neutral'} size="sm">
          {r.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (r) => (
        <span className="text-xs text-neutral-500 italic max-w-xs truncate block">
          {r.notes || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => {
        const isActionLoading = actionLoadingId === r.id
        if (r.status === 'RESERVED') {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="primary"
                size="xs"
                isLoading={isActionLoading}
                onClick={() => handleCheckIn(r.id)}
                className="gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Check In
              </Button>
              <Button
                variant="outline"
                size="xs"
                leftIcon={<X className="w-3.5 h-3.5" />}
                disabled={isActionLoading}
                onClick={() => handleCancel(r.id)}
                className="text-neutral-600 hover:text-rose-600"
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<Ban className="w-3.5 h-3.5" />}
                disabled={isActionLoading}
                onClick={() => handleNoShow(r.id)}
                className="text-neutral-400 hover:text-amber-600"
              >
                No-Show
              </Button>
            </div>
          )
        }
        return <span className="text-xs text-neutral-400">—</span>
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations & Expected Guests"
        subtitle="Manage upcoming bookings, arrive expected guests, and track reservation statuses."
        action={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData()}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Reservation
            </Button>
          </div>
        }
      />

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Bookings', count: reservations.length },
            {
              id: 'RESERVED',
              label: 'Expected Arrivals',
              count: reservations.filter((r) => r.status === 'RESERVED').length,
            },
            {
              id: 'CHECKED_IN',
              label: 'Checked In',
              count: reservations.filter((r) => r.status === 'CHECKED_IN').length,
            },
            {
              id: 'CANCELLED',
              label: 'Cancelled',
              count: reservations.filter((r) => r.status === 'CANCELLED').length,
            },
            {
              id: 'NO_SHOW',
              label: 'No-Show',
              count: reservations.filter((r) => r.status === 'NO_SHOW').length,
            },
          ].map((tab) => {
            const active = filterStatus === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  active
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    active ? 'bg-neutral-700 text-white' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search by guest, room, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <Table
          columns={columns}
          data={filteredReservations}
          keyExtractor={(r) => r.id}
          isLoading={loading}
          emptyMessage="No reservations found matching your criteria."
        />
      </div>

      <ReservationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        availableRooms={availableRooms}
        onSuccess={() => fetchData()}
      />
    </div>
  )
}
