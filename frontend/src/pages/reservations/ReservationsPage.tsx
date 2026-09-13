import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
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
import { CheckInModal } from '../../components/modals/CheckInModal'
import {
  getReservations,
  cancelReservation,
  markReservationNoShow,
} from '../../api/reservations'
import { getRooms } from '../../api/rooms'
import { getGuests } from '../../api/guests'
import type { Reservation, Room, Guest } from '../../types/api'

export function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<{
    id: number
    type: 'cancel' | 'no-show'
  } | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [checkInModalOpen, setCheckInModalOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

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

  function handleCheckIn(res: Reservation) {
    setSelectedReservation(res)
    setCheckInModalOpen(true)
  }

  async function handleCancel(resId: number) {
    if (!confirm('Are you sure you want to cancel this reservation? Room will become available.')) return
    setActionLoading({ id: resId, type: 'cancel' })
    try {
      await cancelReservation(resId)
      fetchData()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to cancel reservation.'
      alert(msg)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleNoShow(resId: number) {
    if (!confirm('Mark guest as No-Show? Room will become available.')) return
    setActionLoading({ id: resId, type: 'no-show' })
    try {
      await markReservationNoShow(resId)
      fetchData()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to mark no-show.'
      alert(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredReservations = reservations.filter((r) => {
    const guest = guestMap.get(r.guest_id)
    const room = roomMap.get(r.room_id)
    return (
      (guest?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (guest?.phone || '').includes(search) ||
      (room?.room_number || '').includes(search) ||
      String(r.id).includes(search)
    )
  })

  const statusTone: Record<string, BadgeTone> = {
    RESERVED: 'expected',
    CHECKED_IN: 'occupied',
    CANCELLED: 'inactive',
    NO_SHOW: 'inactive',
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
        const isActionLoading = actionLoading?.id === r.id
        if (r.status === 'RESERVED') {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="primary"
                size="xs"
                isLoading={isActionLoading}
                onClick={() => handleCheckIn(r)}
                className="gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Check In
              </Button>
              <Button
                variant="outline"
                size="xs"
                leftIcon={<X className="w-3.5 h-3.5" />}
                isLoading={actionLoading?.id === r.id && actionLoading.type === 'cancel'}
                disabled={isActionLoading}
                onClick={() => handleCancel(r.id)}
                className="text-neutral-600 hover:text-rose-600"
              >
                {actionLoading?.id === r.id && actionLoading.type === 'cancel' ? 'Cancelling...' : 'Cancel'}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<Ban className="w-3.5 h-3.5" />}
                isLoading={actionLoading?.id === r.id && actionLoading.type === 'no-show'}
                disabled={isActionLoading}
                onClick={() => handleNoShow(r.id)}
                className="text-neutral-400 hover:text-amber-600"
              >
                {actionLoading?.id === r.id && actionLoading.type === 'no-show' ? 'Marking...' : 'No-Show'}
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
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Reservation
          </Button>
        }
      />

      {/* Search */}
      <div className="w-full sm:w-80">
        <Input
          placeholder="Search by guest, room, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <Table
          columns={columns}
          data={filteredReservations}
          keyExtractor={(r) => r.id}
          isLoading={loading}
          loadingLabel="Loading reservations..."
          emptyMessage="No reservations found matching your criteria."
        />
      </div>

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
    </div>
  )
}
