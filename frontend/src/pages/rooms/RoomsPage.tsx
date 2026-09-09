import { useState, useEffect, useCallback } from 'react'
import { Plus, KeyRound, CalendarPlus, LogIn, LogOut, UserCheck, Wrench, Sparkles } from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { RoomCard } from '../../components/common/RoomCard'
import { StatePanel } from '../../components/common/StatePanel'
import { CheckInModal } from '../../components/modals/CheckInModal'
import { ReservationModal } from '../../components/modals/ReservationModal'
import { CheckOutModal } from '../../components/modals/CheckOutModal'
import { AddRoomModal } from '../../components/modals/AddRoomModal'
import { getRooms, updateRoomStatus } from '../../api/rooms'
import { getStays } from '../../api/stays'
import { useAuth } from '../../hooks/useAuth'
import type { Room, RoomStatusType, Stay } from '../../types/api'

export function RoomsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [rooms, setRooms] = useState<Room[]>([])
  const [activeStays, setActiveStays] = useState<Stay[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modals state
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [checkOutOpen, setCheckOutOpen] = useState(false)
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined)
  const [selectedStay, setSelectedStay] = useState<Stay | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [roomsData, staysData] = await Promise.all([
        getRooms(),
        getStays('CHECKED_IN').catch(() => []),
      ])
      setRooms(roomsData)
      setActiveStays(staysData)
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
  const maintenanceRooms = rooms.filter((r) => r.status === 'MAINTENANCE')

  const filteredRooms = rooms.filter((r) => {
    return (
      r.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.room_type.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  function handleRoomCheckIn(roomId: number) {
    setSelectedRoomId(roomId)
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

  async function handleToggleMaintenance(roomId: number, currentStatus: RoomStatusType) {
    const nextStatus: RoomStatusType = currentStatus === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE'
    try {
      await updateRoomStatus(roomId, nextStatus)
      fetchData()
    } catch (err) {
      console.error('Failed to update room status:', err)
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
            const isMaintenance = room.status === 'MAINTENANCE'

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
                        Arrive Guest
                      </Button>
                    )}

                    {room.status === 'CLEANING' && (
                      <Button
                        variant="outline"
                        size="xs"
                        leftIcon={<Sparkles size={13} />}
                        className="flex-1 whitespace-nowrap text-amber-700 border-amber-300 hover:bg-amber-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleMaintenance(room.id, 'CLEANING')
                        }}
                      >
                        Clear Cleaning
                      </Button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        title={isMaintenance ? 'Mark as Available' : 'Mark as Maintenance'}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleMaintenance(room.id, room.status)
                        }}
                        className={`h-7 px-2 rounded-full border transition-all flex items-center justify-center gap-1 text-[11px] font-medium shrink-0 ${
                          isMaintenance
                            ? 'bg-[#EBF9EB] border-[#BFE4C1] text-[#008A05] hover:bg-[#DDF4DF]'
                            : 'border-[#DDDDDD] hover:border-[#222222] text-[#717171] hover:text-[#222222] bg-white'
                        }`}
                      >
                        <Wrench size={12} />
                        <span>{isMaintenance ? 'Activate' : 'Maint.'}</span>
                      </button>
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
        onClose={() => setCheckInOpen(false)}
        availableRooms={availableRooms}
        selectedRoomId={selectedRoomId}
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
    </div>
  )
}
