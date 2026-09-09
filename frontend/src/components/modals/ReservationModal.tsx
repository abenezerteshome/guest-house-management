import { useState, useEffect } from 'react'
import { Calendar, AlertCircle, Building2 } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import type { Room, Guest } from '../../types/api'
import { getGuests, createGuest } from '../../api/guests'
import { createReservation } from '../../api/reservations'
import { getApiError } from '../../api/client'

interface ReservationModalProps {
  isOpen: boolean
  onClose: () => void
  availableRooms: Room[]
  selectedRoomId?: number
  onSuccess: () => void
}

export function ReservationModal({
  isOpen,
  onClose,
  availableRooms,
  selectedRoomId,
  onSuccess,
}: ReservationModalProps) {
  const [useExistingGuest, setUseExistingGuest] = useState(false)
  const [existingGuests, setExistingGuests] = useState<Guest[]>([])
  const [selectedGuestId, setSelectedGuestId] = useState<number | ''>('')
  const [guestSearch, setGuestSearch] = useState('')

  // New guest fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [nationality, setNationality] = useState('Ethiopian')

  // Booking fields
  const [roomId, setRoomId] = useState<number>(selectedRoomId || availableRooms[0]?.id || 0)
  const [arrivalDate, setArrivalDate] = useState(() => {
    const now = new Date()
    now.setHours(14, 0, 0, 0)
    return now.toISOString().slice(0, 16)
  })
  const [checkoutDate, setCheckoutDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(11, 0, 0, 0)
    return tomorrow.toISOString().slice(0, 16)
  })
  const [expectedAmount, setExpectedAmount] = useState('')
  const [reason, setReason] = useState('Reservation')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (selectedRoomId) {
      setRoomId(selectedRoomId)
    } else if (availableRooms.length > 0 && (!roomId || !availableRooms.some((r) => r.id === roomId))) {
      setRoomId(availableRooms[0].id)
    }
  }, [selectedRoomId, availableRooms, roomId, isOpen])

  useEffect(() => {
    if (isOpen && useExistingGuest) {
      getGuests().then(setExistingGuests).catch(console.error)
    }
  }, [isOpen, useExistingGuest])

  const filteredGuests = existingGuests.filter(
    (g) =>
      g.full_name.toLowerCase().includes(guestSearch.toLowerCase()) ||
      g.phone.includes(guestSearch) ||
      g.id_number.toLowerCase().includes(guestSearch.toLowerCase())
  )

  const selectedRoom = availableRooms.find((r) => r.id === roomId)
  const roomPricePerNight = Number(selectedRoom?.price || 0)

  // Calculate stay duration & expected amount by night
  const arr = new Date(arrivalDate)
  const dep = new Date(checkoutDate)
  const diffDays = Math.round((dep.getTime() - arr.getTime()) / (1000 * 60 * 60 * 24))
  const resNights = Math.max(1, isNaN(diffDays) ? 1 : diffDays)
  const calculatedExpectedAmount = resNights * roomPricePerNight
  const durationDescription = `${resNights} Night${resNights > 1 ? 's' : ''} (${resNights} × ETB ${roomPricePerNight.toLocaleString()})`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roomId) {
      setError('Please select an available room for the reservation.')
      return
    }

    const arr = new Date(arrivalDate)
    const dep = new Date(checkoutDate)
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (arr < startOfToday) {
      setError('Reservation arrival date cannot be in the past. Please select today or a future date.')
      return
    }
    if (dep <= arr) {
      setError('Expected checkout must be after expected arrival date and time.')
      return
    }

    setLoading(true)
    setError('')

    try {
      let guestId: number

      if (useExistingGuest) {
        if (!selectedGuestId) {
          setError('Please select an existing guest.')
          setLoading(false)
          return
        }
        guestId = Number(selectedGuestId)
      } else {
        if (!fullName.trim() || !phone.trim() || !idNumber.trim()) {
          setError('Please fill in all required guest fields (Name, Phone, ID).')
          setLoading(false)
          return
        }
        const newGuest = await createGuest({
          full_name: fullName.trim(),
          phone: phone.trim(),
          id_number: idNumber.trim(),
          nationality: nationality.trim() || undefined,
        })
        guestId = newGuest.id
      }

      await createReservation({
        guest_id: guestId,
        room_id: roomId,
        expected_arrival: arr.toISOString(),
        expected_checkout: dep.toISOString(),
        expected_amount: expectedAmount ? Number(expectedAmount) : calculatedExpectedAmount,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      // Reset form
      setFullName('')
      setPhone('')
      setIdNumber('')
      setExpectedAmount('')
      setNotes('')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to create reservation. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Reservation (Expected Guest)" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Room selection glance */}
        <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF385C]/10 text-[#FF385C] flex items-center justify-center font-bold text-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Selected Room</p>
              <p className="text-sm font-bold text-neutral-900">
                {selectedRoom ? `Room ${selectedRoom.room_number} • ${selectedRoom.room_type}` : 'Choose Room Below'}
              </p>
            </div>
          </div>
          {selectedRoom && (
            <div className="text-right">
              <span className="text-xs text-neutral-500">Rate</span>
              <p className="text-sm font-bold text-neutral-900">{Number(selectedRoom.price).toLocaleString()} ETB / night</p>
            </div>
          )}
        </div>

        {/* Room & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
              Available Room *
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(Number(e.target.value))}
              required
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
            >
              {availableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  Room {room.room_number} ({room.room_type} - {Number(room.price).toLocaleString()} ETB{room.hourly_price ? ` • ETB ${Number(room.hourly_price).toLocaleString()}/hr` : ''})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
              Expected Arrival *
            </label>
            <input
              type="datetime-local"
              required
              value={arrivalDate}
              min={new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString().slice(0, 10) + 'T00:00'}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
              Expected Checkout *
            </label>
            <input
              type="datetime-local"
              required
              value={checkoutDate}
              min={arrivalDate}
              onChange={(e) => setCheckoutDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
            />
          </div>
        </div>

        {/* Calculation badge */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-neutral-100/70 border border-neutral-200 text-xs">
          <span className="text-neutral-600">Duration & Pricing:</span>
          <span className="font-bold text-neutral-900">
            {durationDescription} = ETB {calculatedExpectedAmount.toLocaleString()}
          </span>
        </div>

        {/* Reservation Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Expected Amount (ETB)"
            type="number"
            min="0"
            step="0.01"
            placeholder={String(calculatedExpectedAmount)}
            helperText={`Defaults to calculated total (ETB ${calculatedExpectedAmount.toLocaleString()}) if left blank`}
            value={expectedAmount}
            onChange={(e) => setExpectedAmount(e.target.value)}
          />
          <Input
            label="Booking Reference / Reason"
            placeholder="Reservation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Guest selector toggle */}
        <div className="border-t border-neutral-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Guest Information</h4>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setUseExistingGuest(false)}
                className={`px-3 py-1 rounded-full font-medium transition ${
                  !useExistingGuest
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                + New Guest
              </button>
              <button
                type="button"
                onClick={() => setUseExistingGuest(true)}
                className={`px-3 py-1 rounded-full font-medium transition ${
                  useExistingGuest
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Select Existing
              </button>
            </div>
          </div>

          {useExistingGuest ? (
            <div className="space-y-3">
              <Input
                placeholder="Search existing guests by name, phone or ID..."
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
              />
              <select
                value={selectedGuestId}
                onChange={(e) => setSelectedGuestId(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              >
                <option value="">-- Choose guest from directory --</option>
                {filteredGuests.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.full_name} • {g.phone} ({g.id_number})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Guest Full Name *"
                placeholder="Abebe Bikila"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label="Phone Number *"
                placeholder="+251 911 234567"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="ID / Passport Number *"
                placeholder="ID-987654"
                required
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
              />
              <Input
                label="Nationality"
                placeholder="Ethiopian"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
            Special Requests / Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Late check-in expected, airport pickup request, VIP..."
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={loading} className="gap-2">
            <Calendar className="w-4 h-4" />
            Confirm Reservation
          </Button>
        </div>
      </form>
    </Modal>
  )
}
