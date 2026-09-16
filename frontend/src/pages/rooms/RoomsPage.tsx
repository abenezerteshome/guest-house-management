import { useState, useEffect, useCallback } from 'react'
import { Plus, CalendarPlus, LogIn, LogOut, UserCheck, Undo2 } from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { RoomCard } from '../../components/common/RoomCard'
import { StatePanel } from '../../components/common/StatePanel'
import { CheckInModal } from '../../components/modals/CheckInModal'
import { ReservationModal } from '../../components/modals/ReservationModal'
import { CheckOutModal } from '../../components/modals/CheckOutModal'
import { VoidCheckInModal } from '../../components/modals/VoidCheckInModal'
import { AddRoomModal } from '../../components/modals/AddRoomModal'
import { EditRoomModal } from '../../components/modals/EditRoomModal'
import { ConfirmDeleteModal } from '../../components/modals/ConfirmDeleteModal'
import { getRooms } from '../../api/rooms'
import { getStays } from '../../api/stays'
import { getReservations } from '../../api/reservations'
import { useAuth } from '../../hooks/useAuth'
import type { Room, Stay, Reservation } from '../../types/api'

export function RoomsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [rooms, setRooms] = useState<Room[]>([])
  const [activeStays, setActiveStays] = useState<Stay[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'EXPECTED'>('ALL')

  // Modals state
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [checkOutOpen, setCheckOutOpen] = useState(false)
  const [voidCheckInOpen, setVoidCheckInOpen] = useState(false)
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [editRoomOpen, setEditRoomOpen] = useState(false)
  const [deleteRoomOpen, setDeleteRoomOpen] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [selectedStay, setSelectedStay] = useState<Stay | null>(null)
  const [selectedRoomToEdit, setSelectedRoomToEdit] = useState<Room | null>(null)
  const [selectedRoomToDelete, setSelectedRoomToDelete] = useState<Room | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [roomsData, staysData, reservationsData] = await Promise.all([
        getRooms(),
        getStays('CHECKED_IN').catch(() => []),
        getReservations('RESERVED').catch(() => []),
      ])
      setRooms(roomsData)
      setActiveStays(staysData)
      setReservations(reservationsData)
    } catch (err) {
      console.error('Failed to load rooms:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE')
  const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED')
  const expectedRooms = rooms.filter((r) => r.status === 'EXPECTED')

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.room_type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === 'ALL' ||
      r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  function handleRoomCheckIn(roomId: number) {
    const matchedRes =
      reservations.find(
        (r) => r.room_id === roomId && (r.status === 'RESERVED' || r.status === 'PENDING')
      ) || null
    setSelectedRoomId(roomId)
    setSelectedReservation(matchedRes)
    setCheckInOpen(true)
  }

  function handleRoomReserve(roomId: number) {
    setSelectedRoomId(roomId)
    setReservationOpen(true)
  }

  function handleRoomManageStay(room: Room) {
    const stay = activeStays.find((s) => s.room_id === room.id)
    if (stay) {
      setSelectedStay(stay)
      setSelectedRoomId(room.id)
      setCheckOutOpen(true)
    }
  }

  function handleVoidCheckIn(room: Room) {
    const stay = activeStays.find((s) => s.room_id === room.id)
    if (stay) {
      setSelectedStay(stay)
      setSelectedRoomId(room.id)
      setVoidCheckInOpen(true)
    }
  }

  function handleEditRoom(room: Room) {
    setSelectedRoomToEdit(room)
    setEditRoomOpen(true)
  }

  function handleDeleteRoom(room: Room) {
    setSelectedRoomToDelete(room)
    setDeleteRoomOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Rooms"
        subtitle="Monitor availability, arrivals, and active stays."
        action={
          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddRoomOpen(true)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Room
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[
          { label: 'Total rooms', value: rooms.length, detail: 'Across the property' },
          { label: 'Available', value: availableRooms.length, detail: 'Ready for check-in' },
          { label: 'Occupied', value: occupiedRooms.length, detail: 'Active stays' },
          { label: 'Arriving today', value: expectedRooms.length, detail: 'Expected guests' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <span className="text-[11px] text-neutral-500">{item.label}</span>
            <strong className="block text-xl font-bold text-neutral-900 mt-0.5">{item.value}</strong>
            <span className="text-[10px] text-neutral-500">{item.detail}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search room or room type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'ALL' as const, label: 'All rooms', count: rooms.length },
            { id: 'AVAILABLE' as const, label: 'Available', count: availableRooms.length },
            { id: 'OCCUPIED' as const, label: 'Occupied', count: occupiedRooms.length },
            { id: 'EXPECTED' as const, label: 'Arriving', count: expectedRooms.length },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === filter.id
                  ? 'border border-neutral-200 bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {filter.label} {filter.count}
            </button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-64 rounded-2xl bg-neutral-100 animate-pulse border border-neutral-200"
            />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <StatePanel
          type="empty"
          title="No rooms match your criteria"
          message="Try changing your search keywords or switching filter categories."
          actionSlot={
            <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
              Clear Search
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredRooms.map((room) => {
            const isAvailable = room.status === 'AVAILABLE'
            const isOccupied = room.status === 'OCCUPIED'
            const isExpected = room.status === 'EXPECTED'

            const stay = activeStays.find((s) => s.room_id === room.id && s.status === 'CHECKED_IN')
            const res = reservations.find(
              (r) => r.room_id === room.id && (r.status === 'RESERVED' || r.status === 'PENDING')
            )

            const stayRecord = stay as (Stay & { guest?: { full_name?: string }; guest_name?: string; has_credit?: boolean; balance?: number }) | undefined
            const resRecord = res as (Reservation & { guest?: { full_name?: string }; guest_name?: string }) | undefined

            const guestName =
              stayRecord?.guest?.full_name ||
              stayRecord?.guest_name ||
              resRecord?.guest?.full_name ||
              resRecord?.guest_name
            const hasCredit = Boolean(stayRecord?.has_credit || (stayRecord?.balance ?? 0) > 0)

            return (
              <RoomCard
                key={room.id}
                room={{
                  id: String(room.id),
                  roomNumber: room.room_number,
                  roomType: room.room_type,
                  pricePerNight: Number(room.price),
                  hourlyPrice: room.hourly_price ? Number(room.hourly_price) : undefined,
                  status: room.status,
                  availableAfter: room.available_after,
                  bedType: 'Comfort Bed',
                  guestName,
                  hasCredit,
                  expectedCheckout: stay?.expected_checkout,
                  expectedArrival: res?.expected_arrival,
                }}
                isAdmin={isAdmin}
                onEdit={() => handleEditRoom(room)}
                onDelete={() => handleDeleteRoom(room)}
                actionSlot={
                  <div className="flex items-center gap-1.5 w-full">
                    {isAvailable && (
                      <>
                        <Button
                          variant="outline"
                          size="xs"
                          leftIcon={<CalendarPlus size={13} />}
                          className="flex-1 whitespace-nowrap"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRoomReserve(room.id)
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
                            handleRoomCheckIn(room.id)
                          }}
                        >
                          Check In
                        </Button>
                      </>
                    )}

                    {isOccupied && (
                      <div className="flex items-center gap-1.5 w-full">
                        <Button
                          variant="outline"
                          size="xs"
                          leftIcon={<LogOut size={13} />}
                          className="flex-1 whitespace-nowrap text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRoomManageStay(room)
                          }}
                        >
                          Checkout
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          leftIcon={<Undo2 size={13} />}
                          className="text-neutral-500 hover:text-rose-600 hover:bg-rose-50 px-2"
                          title="Void / Cancel Check-In"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVoidCheckIn(room)
                          }}
                        >
                          Void
                        </Button>
                      </div>
                    )}

                    {isExpected && (
                      <Button
                        variant="primary"
                        size="xs"
                        leftIcon={<UserCheck size={13} />}
                        className="flex-1 whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRoomCheckIn(room.id)
                        }}
                      >
                        Check In (Reserved)
                      </Button>
                    )}

                  </div>
                }
              />
            )
          })}
        </div>
      )}

      {/* Modals */}
      <CheckInModal
        isOpen={checkInOpen}
        onClose={() => {
          setCheckInOpen(false)
          setSelectedReservation(null)
        }}
        availableRooms={availableRooms}
        allRooms={rooms}
        selectedRoomId={selectedRoomId}
        existingReservation={selectedReservation}
        onSuccess={() => {
          fetchData()
        }}
      />

      <ReservationModal
        isOpen={reservationOpen}
        onClose={() => setReservationOpen(false)}
        availableRooms={availableRooms}
        selectedRoomId={selectedRoomId}
        onSuccess={() => {
          fetchData()
        }}
      />

      <CheckOutModal
        isOpen={checkOutOpen}
        onClose={() => setCheckOutOpen(false)}
        stay={selectedStay}
        onOpenVoidModal={(stay) => {
          setSelectedStay(stay)
          setVoidCheckInOpen(true)
        }}
        onSuccess={(checkedOutStay) => {
          const s = checkedOutStay || selectedStay
          if (s) {
            setActiveStays((prev) => prev.filter((item) => item.id !== s.id))
            setRooms((prev) =>
              prev.map((r) =>
                r.id === s.room_id
                  ? { ...r, status: 'AVAILABLE', available_after: null }
                  : r
              )
            )
          }
          fetchData()
        }}
      />

      <VoidCheckInModal
        isOpen={voidCheckInOpen}
        onClose={() => setVoidCheckInOpen(false)}
        stay={selectedStay}
        roomNumber={rooms.find((r) => r.id === selectedStay?.room_id)?.room_number}
        onSuccess={() => {
          fetchData()
        }}
      />

      <AddRoomModal
        isOpen={addRoomOpen}
        onClose={() => setAddRoomOpen(false)}
        onSuccess={() => {
          fetchData()
        }}
      />

      <EditRoomModal
        isOpen={editRoomOpen}
        onClose={() => {
          setEditRoomOpen(false)
          setSelectedRoomToEdit(null)
        }}
        room={selectedRoomToEdit}
        onSuccess={() => {
          fetchData()
        }}
        onDeleteRequest={(r) => {
          setSelectedRoomToDelete(r)
          setDeleteRoomOpen(true)
        }}
      />

      <ConfirmDeleteModal
        isOpen={deleteRoomOpen}
        onClose={() => {
          setDeleteRoomOpen(false)
          setSelectedRoomToDelete(null)
        }}
        room={selectedRoomToDelete}
        onSuccess={() => {
          fetchData()
        }}
      />
    </div>
  )
}
