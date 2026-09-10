import { useState, useEffect, useMemo } from 'react'
import { CircleDollarSign, KeyRound, ShieldAlert, UserCheck } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { IdPhotoCapture } from '../common/IdPhotoCapture'
import type { Room } from '../../types/api'
import { createGuest } from '../../api/guests'
import { createReservation } from '../../api/reservations'
import { checkInReservation } from '../../api/stays'
import { recordManualPayment } from '../../api/payments'
import { getApiError } from '../../api/client'

interface CheckInModalProps {
  isOpen: boolean
  onClose: () => void
  availableRooms: Room[]
  allRooms?: Room[]
  selectedRoomId?: number
  initialGuest?: {
    fullName?: string
    phone?: string
    idNumber?: string
    nationality?: string | null
    idPhotoUrl?: string | null
  }
  onSuccess: () => void
}

export function CheckInModal({
  isOpen,
  onClose,
  availableRooms,
  allRooms,
  selectedRoomId,
  initialGuest,
  onSuccess,
}: CheckInModalProps) {
  const selectableRooms = useMemo(() => {
    const list = [...availableRooms]
    if (selectedRoomId && allRooms) {
      const selected = allRooms.find((r) => r.id === selectedRoomId)
      if (selected && !list.some((r) => r.id === selectedRoomId)) {
        list.push(selected)
      }
    }
    return list
      .filter((r) => r.status !== 'MAINTENANCE' || r.id === selectedRoomId)
      .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }))
  }, [availableRooms, allRooms, selectedRoomId])

  const [roomId, setRoomId] = useState<number>(
    selectedRoomId || selectableRooms[0]?.id || 0
  )
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [idPhoto, setIdPhoto] = useState<string | null>(null)
  const [checkInDate, setCheckInDate] = useState(() => new Date().toISOString().slice(0, 16))
  const [checkoutDate, setCheckoutDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(11, 0, 0, 0)
    return tomorrow.toISOString().slice(0, 16)
  })
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER' | 'CREDIT'>('CASH')
  const [amountPaid, setAmountPaid] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (selectedRoomId) {
      setRoomId(selectedRoomId)
    } else if (selectableRooms.length > 0 && (!roomId || !selectableRooms.some(r => r.id === roomId))) {
      setRoomId(selectableRooms[0].id)
    }
  }, [selectedRoomId, selectableRooms, isOpen])

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      setCheckInDate(now.toISOString().slice(0, 16))
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(11, 0, 0, 0)
      setCheckoutDate(tomorrow.toISOString().slice(0, 16))
      if (initialGuest) {
        setFullName(initialGuest.fullName || '')
        setPhone(initialGuest.phone || '')
        setIdNumber(initialGuest.idNumber || '')
        setIdPhoto(initialGuest.idPhotoUrl || null)
      } else {
        setIdPhoto(null)
      }
      setError('')
    }
  }, [isOpen, initialGuest])

  const activeRoom = selectableRooms.find((r) => r.id === roomId) || selectableRooms[0]
  const roomPricePerNight = Number(activeRoom?.price || 0)

  // Calculate duration description & total room charge by night
  const checkInTimestamp = new Date(checkInDate).getTime()
  const checkoutTimestamp = new Date(checkoutDate).getTime()
  const diffDays = Math.round((checkoutTimestamp - checkInTimestamp) / (1000 * 60 * 60 * 24))
  const stayNights = Math.max(1, isNaN(diffDays) ? 1 : diffDays)
  const totalRoomCharge = stayNights * roomPricePerNight
  const durationDescription = `${stayNights} Night${stayNights > 1 ? 's' : ''} (${stayNights} × ETB ${roomPricePerNight.toLocaleString()})`

  const paid = paymentMethod === 'CREDIT' ? 0 : Number(amountPaid || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roomId) {
      setError('Please select an available room.')
      return
    }
    const checkInTime = new Date(checkInDate)
    const checkOutTime = new Date(checkoutDate)
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    if (checkInTime < startOfToday || checkInTime > endOfToday) {
      setError('Check-in is only permitted for the current day.')
      return
    }
    if (checkOutTime <= checkInTime) {
      setError('Expected checkout must be after check-in date and time.')
      return
    }
    setError('')
    setLoading(true)

    try {
      // 1. Create Guest (including captured/uploaded passport or ID photo)
      const guest = await createGuest({
        full_name: fullName.trim(),
        id_number: idNumber.trim(),
        phone: phone.trim(),
        id_photo_url: idPhoto || undefined,
      })

      // 2. Create Reservation
      const reservation = await createReservation({
        guest_id: guest.id,
        room_id: roomId,
        expected_arrival: checkInTime.toISOString(),
        expected_checkout: checkOutTime.toISOString(),
        expected_amount: totalRoomCharge,
      })

      // 3. Convert to active Stay
      const stay = await checkInReservation(reservation.id)

      // 4. Record Payment if provided
      if (paid > 0 && paymentMethod !== 'CREDIT' && stay?.id) {
        await recordManualPayment({
          stay_id: stay.id,
          amount: paid,
          payment_method: paymentMethod,
          reference: `Check-in payment (${paymentMethod})`,
        })
      }

      setFullName('')
      setPhone('')
      setIdNumber('')
      setIdPhoto(null)
      setAmountPaid('')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(getApiError(err, 'Unable to complete check-in.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guest Check-in & Room Assignment"
      description="Register guest, assign room, and record initial payment or credit."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-sm text-[#222222]">
        {error && (
          <div className="p-3.5 rounded-xl bg-[#FFF7F5] border border-[#F2D1CA] text-xs text-[#C13515] flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Room Selection & Stay Dates */}
        <div className="p-4 rounded-2xl bg-[#F7F7F7] border border-[#DDDDDD] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171] flex items-center gap-1.5">
              <KeyRound size={14} className="text-[#FF385C]" />
              1. Room Assignment & Stay Pricing
            </span>
            {activeRoom && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#FF385C] bg-[#FF385C]/10 px-2.5 py-1 rounded-full">
                  ETB {Number(activeRoom.price).toLocaleString()} / night
                </span>
                {activeRoom.hourly_price && (
                  <span className="text-xs font-semibold text-neutral-600 bg-neutral-200/70 px-2.5 py-1 rounded-full">
                    ETB {Number(activeRoom.hourly_price).toLocaleString()} / hr
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222222] mb-1">
              Select Available Room (Rates set by Admin)
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(Number(e.target.value))}
              className="w-full h-11 px-3 rounded-xl border border-[#DDDDDD] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#222222] focus:ring-1 focus:ring-[#222222]"
              required
            >
              {selectableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  Room {room.room_number} — {room.room_type} (ETB {Number(room.price).toLocaleString()} / night)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[#222222] mb-1">
                Check-in Date & Time
              </label>
              <input
                type="datetime-local"
                value={checkInDate}
                min={`${new Date().toISOString().slice(0, 10)}T00:00`}
                max={`${new Date().toISOString().slice(0, 10)}T23:59`}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#DDDDDD] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#222222]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222222] mb-1">
                Expected Checkout Date & Time
              </label>
              <input
                type="datetime-local"
                value={checkoutDate}
                min={checkInDate}
                onChange={(e) => setCheckoutDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#DDDDDD] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#222222]"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-[#717171] border-t border-[#EAEAEA]">
            <span>Stay Duration & Pricing:</span>
            <span className="font-bold text-[#222222] bg-white px-2.5 py-1 rounded-lg border border-[#DDDDDD]">
              {durationDescription}
            </span>
          </div>
        </div>

        {/* Step 2: Guest Details & Identification */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171] flex items-center gap-1.5">
            <UserCheck size={14} className="text-[#008A05]" />
            2. Guest Information & Document Verification
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Guest Full Name *"
              required
              placeholder="e.g. Abebe Kebede"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Phone Number *"
              required
              placeholder="e.g. +251 91 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="ID / Passport Number *"
              required
              placeholder="e.g. EP1234567"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
            />
          </div>

          {/* Passport / ID Document Photo Capture & Upload */}
          <div className="pt-1">
            <IdPhotoCapture
              value={idPhoto}
              onChange={setIdPhoto}
              label="Passport / National ID Photo"
              helperText="Upload an image of the guest's passport or national ID."
            />
          </div>
        </div>

        {/* Step 3: Payment & Credit Calculation */}
        <div className="p-4 rounded-2xl bg-[#FFF0F2]/40 border border-[#FFD2D9] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171] flex items-center gap-1.5">
              <CircleDollarSign size={14} className="text-[#FF385C]" />
              3. Payment & Credit Calculation
            </span>
            {totalRoomCharge > 0 && paymentMethod !== 'CREDIT' && (
              <button
                type="button"
                onClick={() => setAmountPaid(String(totalRoomCharge))}
                className="text-[11px] font-bold text-[#FF385C] hover:underline"
              >
                Pay Full (ETB {totalRoomCharge.toLocaleString()})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#222222] mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                className="w-full h-11 px-3 rounded-xl border border-[#DDDDDD] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#222222]"
              >
                <option value="CASH">Cash</option>
                <option value="TELEBIRR">Telebirr</option>
                <option value="CBE_BIRR">CBE Birr</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CREDIT">Credit (Unpaid / Pay Later)</option>
              </select>
            </div>

            <Input
              label="Amount Paid Now (ETB)"
              type="number"
              min="0"
              max={totalRoomCharge}
              placeholder={paymentMethod === 'CREDIT' ? '0 (Credit)' : `e.g. ${totalRoomCharge}`}
              disabled={paymentMethod === 'CREDIT'}
              value={paymentMethod === 'CREDIT' ? '' : amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              helperText={paymentMethod === 'CREDIT' ? 'Full stay amount will be recorded as outstanding credit' : undefined}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0F0F0]">
          <Button variant="ghost" size="md" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            loading={loading}
            leftIcon={<KeyRound size={16} />}
          >
            Confirm Check-in
          </Button>
        </div>
      </form>
    </Modal>
  )
}
