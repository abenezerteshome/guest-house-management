import { useState, useEffect, useCallback } from 'react'
import { Plus, KeyRound, CalendarPlus, LogIn, LogOut, UserCheck } from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { RoomCard } from '../../components/common/RoomCard'
import { StatePanel } from '../../components/common/StatePanel'
import { CheckInModal } from '../../components/modals/CheckInModal'
import { ReservationModal } from '../../components/modals/ReservationModal'
import { CheckOutModal } from '../../components/modals/CheckOutModal'
import { AddRoomModal } from '../../components/modals/AddRoomModal'
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

  // Modals state
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [checkOutOpen, setCheckOutOpen] = useState(false)
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [selectedStay, setSelectedStay] = useState<Stay | null>(null)

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
    return (
      r.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.room_type.toLowerCase().includes(searchTerm.toLowerCase())
    )
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


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Room Status Board"
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
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedRoomId(undefined)
                setSelectedReservation(null)
                setCheckInOpen(true)
              }}
              className="gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Check In Guest
            </Button>
          </div>
        }
      />

      {/* Search input */}
      <div className="w-full sm:w-80">
        <Input
          placeholder="Search room # or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredRooms.map((room) => {
            const isAvailable = room.status === 'AVAILABLE'
            const isOccupied = room.status === 'OCCUPIED'
            const isExpected = room.status === 'EXPECTED'

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
                }}
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

      <AddRoomModal
        isOpen={addRoomOpen}
        onClose={() => setAddRoomOpen(false)}
        onSuccess={() => {
          fetchData()
        }}
      />
    </div>
  )
}
