import { useState, useEffect } from 'react'
import { CircleDollarSign, KeyRound, ShieldAlert, UserCheck } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
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
  selectedRoomId?: number
  initialGuest?: {
    fullName?: string
    phone?: string
    idNumber?: string
    nationality?: string | null
  }
  onSuccess: () => void
}

export function CheckInModal({
  isOpen,
  onClose,
  availableRooms,
  selectedRoomId,
  initialGuest,
  onSuccess,
}: CheckInModalProps) {
  const [roomId, setRoomId] = useState<number>(
    selectedRoomId || availableRooms[0]?.id || 0
  )
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [nationality, setNationality] = useState('Ethiopian')
  const [checkoutDate, setCheckoutDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(11, 0, 0, 0)
    return tomorrow.toISOString().slice(0, 16)
  })
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER' | 'CREDIT'>('CASH')
  const [amountPaid, setAmountPaid] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (selectedRoomId) {
      setRoomId(selectedRoomId)
    } else if (availableRooms.length > 0 && (!roomId || !availableRooms.some(r => r.id === roomId))) {
      setRoomId(availableRooms[0].id)
    }
  }, [selectedRoomId, availableRooms, isOpen])

  useEffect(() => {
    if (isOpen) {
      if (initialGuest) {
        setFullName(initialGuest.fullName || '')
        setPhone(initialGuest.phone || '')
        setIdNumber(initialGuest.idNumber || '')
        setNationality(initialGuest.nationality || 'Ethiopian')
      }
      setError('')
    }
  }, [isOpen, initialGuest])

  const activeRoom = availableRooms.find((r) => r.id === roomId) || availableRooms[0]
  const roomPrice = Number(activeRoom?.price || 0)
  const paid = Number(amountPaid || 0)
  const remainingCredit = Math.max(0, roomPrice - paid)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roomId) {
      setError('Please select an available room.')
      return
    }
    setError('')
    setLoading(true)

    try {
      // 1. Create Guest
      const guest = await createGuest({
        full_name: fullName.trim(),
        id_number: idNumber.trim(),
        phone: phone.trim(),
        nationality: nationality.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      // 2. Create Reservation
      const now = new Date().toISOString()
      const reservation = await createReservation({
        guest_id: guest.id,
        room_id: roomId,
        expected_arrival: now,
        expected_checkout: new Date(checkoutDate).toISOString(),
        notes: notes.trim() || undefined,
      })

      // 3. Convert to active Stay
      const stay = await checkInReservation(reservation.id)

      // 4. Record Payment if provided
      if (paid > 0 && paymentMethod !== 'CREDIT' && stay?.id) {
        await recordManualPayment({
          stay_id: stay.id,
          amount: paid,
          payment_method: paymentMethod,
          reference: `Check-in deposit (${paymentMethod})`,
        })
      }

      setFullName('')
      setPhone('')
      setIdNumber('')
      setAmountPaid('')
      setNotes('')
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

        {/* Step 1: Room Selection & Rate */}
        <div className="p-4 rounded-2xl bg-[#F7F7F7] border border-[#DDDDDD] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171] flex items-center gap-1.5">
              <KeyRound size={14} className="text-[#FF385C]" />
              1. Room Assignment
            </span>
            {activeRoom && (
              <span className="text-xs font-bold text-[#FF385C]">
                ETB {Number(activeRoom.price).toLocaleString()} / night
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#222222] mb-1">
                Select Available Room
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border border-[#DDDDDD] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#222222] focus:ring-1 focus:ring-[#222222]"
                required
              >
                {availableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.room_number} — {room.room_type} (ETB {Number(room.price).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222222] mb-1">
                Expected Checkout Date & Time
              </label>
              <input
                type="datetime-local"
                value={checkoutDate}
                onChange={(e) => setCheckoutDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#DDDDDD] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#222222] focus:ring-1 focus:ring-[#222222]"
                required
              />
            </div>
          </div>
        </div>

        {/* Step 2: Guest Details */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171] flex items-center gap-1.5">
            <UserCheck size={14} className="text-[#008A05]" />
            2. Guest Information
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="ID / Passport Number *"
              required
              placeholder="e.g. EP1234567"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
            />
            <Input
              label="Nationality / Address"
              placeholder="e.g. Ethiopian"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
            />
          </div>
        </div>

        {/* Step 3: Payment & Credit Calculation */}
        <div className="p-4 rounded-2xl bg-[#FFF0F2]/40 border border-[#FFD2D9] space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171] flex items-center gap-1.5">
            <CircleDollarSign size={14} className="text-[#FF385C]" />
            3. Payment & Credit Calculation
          </span>

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
              placeholder={`e.g. ${roomPrice}`}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              helperText={paymentMethod === 'CREDIT' ? 'Guest will pay remaining balance later' : undefined}
            />
          </div>

          {/* Automatic Credit / Balance Breakdown */}
          <div className="p-3 bg-white rounded-xl border border-[#DDDDDD] flex items-center justify-between text-xs">
            <div>
              <span className="text-[#717171]">Room Charge: </span>
              <strong className="text-[#222222]">ETB {roomPrice.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[#717171]">Paid: </span>
              <strong className="text-[#008A05]">ETB {paid.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[#717171]">Remaining Credit: </span>
              <strong className={remainingCredit > 0 ? 'text-[#C13515]' : 'text-[#008A05]'}>
                ETB {remainingCredit.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Notes */}
        <Input
          label="Internal Notes / Special Requests"
          placeholder="e.g. Extra pillows requested, airport drop-off at 8 AM"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

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
