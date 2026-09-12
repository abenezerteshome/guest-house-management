import { useState, useEffect, useMemo } from 'react'
import { CircleDollarSign, KeyRound, ShieldAlert, UserCheck, Search, X, CalendarCheck } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { IdPhotoCapture } from '../common/IdPhotoCapture'
import type { Room, Guest, Reservation } from '../../types/api'
import { createGuest, getGuests, getGuest, updateGuest } from '../../api/guests'
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
  existingReservation?: Reservation | null
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
  existingReservation,
  initialGuest,
  onSuccess,
}: CheckInModalProps) {
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null)

  const selectableRooms = useMemo(() => {
    const list = [...availableRooms]
    const targetRoomId = existingReservation?.room_id || selectedRoomId
    if (targetRoomId && allRooms) {
      const selected = allRooms.find((r) => r.id === targetRoomId)
      if (selected && !list.some((r) => r.id === targetRoomId)) {
        list.push(selected)
      }
    }
    return list
      .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }))
  }, [availableRooms, allRooms, selectedRoomId, existingReservation])

  const [roomId, setRoomId] = useState<number>(
    existingReservation?.room_id || selectedRoomId || selectableRooms[0]?.id || 0
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

  // Returning guest auto-search
  const [existingGuests, setExistingGuests] = useState<Guest[]>([])
  const [guestSearch, setGuestSearch] = useState('')
  const [isSearchingGuest, setIsSearchingGuest] = useState(false)

  useEffect(() => {
    if (existingReservation?.room_id) {
      setRoomId(existingReservation.room_id)
    } else if (selectedRoomId) {
      setRoomId(selectedRoomId)
    } else if (selectableRooms.length > 0 && (!roomId || !selectableRooms.some(r => r.id === roomId))) {
      setRoomId(selectableRooms[0].id)
    }
  }, [selectedRoomId, selectableRooms, existingReservation, isOpen])

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      setCheckInDate(now.toISOString().slice(0, 16))
      setActiveReservation(existingReservation || null)

      if (existingReservation) {
        // Pre-fill from existing reservation
        setRoomId(existingReservation.room_id)
        if (existingReservation.expected_checkout) {
          const exp = new Date(existingReservation.expected_checkout)
          setCheckoutDate(exp.toISOString().slice(0, 16))
        }

        // Fetch and pre-fill guest info
        getGuest(existingReservation.guest_id)
          .then((g) => {
            setFullName(g.full_name || '')
            setPhone(g.phone || '')
            if (g.id_number && g.id_number !== 'PENDING_ON_ARRIVAL') {
              setIdNumber(g.id_number)
            } else {
              setIdNumber('')
            }
            setIdPhoto(g.id_photo_url || null)
          })
          .catch((err) => {
            console.error('Failed to fetch reservation guest details:', err)
          })
      } else {
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
          setFullName('')
          setPhone('')
          setIdNumber('')
          setIdPhoto(null)
        }
      }

      setGuestSearch('')
      setIsSearchingGuest(false)
      setError('')

      // Load existing guests for quick returning search
      getGuests().then(setExistingGuests).catch(() => setExistingGuests([]))
    }
  }, [isOpen, existingReservation, initialGuest])

  const activeRoom = selectableRooms.find((r) => r.id === roomId) || selectableRooms[0]
  const roomPricePerNight = Number(activeRoom?.price || 0)

  // Calculate duration & total room charge by night
  const checkInTimestamp = new Date(checkInDate).getTime()
  const checkoutTimestamp = new Date(checkoutDate).getTime()
  const diffDays = Math.round((checkoutTimestamp - checkInTimestamp) / (1000 * 60 * 60 * 24))
  const stayNights = Math.max(1, isNaN(diffDays) ? 1 : diffDays)
  const totalRoomCharge = stayNights * roomPricePerNight
  const durationDescription = `${stayNights} Night${stayNights > 1 ? 's' : ''} (${stayNights} × ETB ${roomPricePerNight.toLocaleString()})`

  // Automatically pre-fill full payment by default so receptionists never have to type the amount
  useEffect(() => {
    if (paymentMethod === 'CREDIT') {
      setAmountPaid('')
    } else {
      setAmountPaid(String(totalRoomCharge))
    }
  }, [totalRoomCharge, paymentMethod])

  const paid = paymentMethod === 'CREDIT' ? 0 : Number(amountPaid || 0)

  const filteredGuests = useMemo(() => {
    if (!guestSearch.trim()) return []
    const q = guestSearch.toLowerCase()
    return existingGuests.filter(
      (g) =>
        g.full_name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        g.id_number.toLowerCase().includes(q)
    ).slice(0, 5)
  }, [existingGuests, guestSearch])

  function handleSelectExistingGuest(guest: Guest) {
    setFullName(guest.full_name)
    setPhone(guest.phone)
    setIdNumber(guest.id_number)
    setIdPhoto(guest.id_photo_url || null)
    setGuestSearch('')
    setIsSearchingGuest(false)
  }

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
      let stay: any

      if (activeReservation) {
        // 1. If guest ID number or photo was provided or updated, save to guest profile
        if (idNumber.trim() || idPhoto) {
          try {
            await updateGuest(activeReservation.guest_id, {
              id_number: idNumber.trim() || undefined,
              id_photo_url: idPhoto || undefined,
            })
          } catch (e) {
            console.warn('Could not update guest profile during check-in:', e)
          }
        }

        // 2. Direct check-in of existing reservation
        stay = await checkInReservation(activeReservation.id)
      } else {
        // Walk-in flow: create new Guest, create Reservation, then check-in
        const guest = await createGuest({
          full_name: fullName.trim(),
          id_number: idNumber.trim() || 'PENDING_ON_ARRIVAL',
          phone: phone.trim(),
          id_photo_url: idPhoto || undefined,
        })

        const reservation = await createReservation({
          guest_id: guest.id,
          room_id: roomId,
          expected_arrival: checkInTime.toISOString(),
          expected_checkout: checkOutTime.toISOString(),
          expected_amount: totalRoomCharge,
        })

        stay = await checkInReservation(reservation.id)
      }

      // Record Payment if provided
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
      setActiveReservation(null)
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
      title={activeReservation ? "Check In Reserved Guest" : "Check In Guest"}
      description={
        activeReservation
          ? `Completing check-in for Booking #${activeReservation.id}. Verify guest ID and collect payment.`
          : "Select room, enter guest information, and confirm check-in."
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm text-[#222222]">
        {error && (
          <div className="p-3.5 rounded-xl bg-[#FFF7F5] border border-[#F2D1CA] text-xs text-[#C13515] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Reservation Banner */}
        {activeReservation && (
          <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold">
                <CalendarCheck size={16} />
              </div>
              <div>
                <p className="font-bold text-amber-950">
                  Checking In Booking #{activeReservation.id}
                </p>
                <p className="text-amber-800 text-[11px]">
                  Guest details & booking dates have been fetched and filled already.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 font-extrabold text-[10px] uppercase tracking-wide">
              Reserved Booking
            </span>
          </div>
        )}

        {/* 1. Room Selection & Stay Dates */}
        <div className="p-3.5 rounded-2xl bg-[#F7F7F7] border border-[#DDDDDD] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <KeyRound size={14} className="text-[#FF385C]" />
              1. Room & Stay Duration
            </span>
            {activeRoom && (
              <span className="text-xs font-bold text-[#FF385C] bg-[#FF385C]/10 px-2.5 py-1 rounded-full">
                ETB {Number(activeRoom.price).toLocaleString()} / night
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222222] mb-1">
              Select Room *
            </label>
            <select
              value={roomId}
              disabled={!!activeReservation}
              onChange={(e) => setRoomId(Number(e.target.value))}
              className="w-full h-11 px-3 rounded-xl border border-[#DDDDDD] bg-white text-sm font-medium text-[#222222] focus:outline-none focus:border-[#222222] disabled:bg-neutral-100 disabled:cursor-not-allowed"
              required
            >
              {selectableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  Room {room.room_number} — {room.room_type} (ETB {Number(room.price).toLocaleString()} / night)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222222] mb-1">
              Expected Checkout Date & Time *
            </label>
            <input
              type="datetime-local"
              value={checkoutDate}
              min={checkInDate}
              onChange={(e) => setCheckoutDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-[#DDDDDD] bg-white text-sm font-medium text-[#222222] focus:outline-none focus:border-[#222222]"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-neutral-600 border-t border-[#EAEAEA]">
            <span>Total Duration:</span>
            <span className="font-bold text-neutral-900 bg-white px-2.5 py-1 rounded-lg border border-[#DDDDDD]">
              {durationDescription} = ETB {totalRoomCharge.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 2. Guest Information */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#DDDDDD] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <UserCheck size={14} className="text-emerald-600" />
              2. Guest Information
            </span>

            {/* Quick toggle for returning guest search */}
            {existingGuests.length > 0 && (
              <button
                type="button"
                onClick={() => setIsSearchingGuest(!isSearchingGuest)}
                className="text-xs font-bold text-neutral-700 hover:text-black flex items-center gap-1"
              >
                <Search size={13} className="text-[#FF385C]" />
                {isSearchingGuest ? 'Close Search' : 'Returning Guest?'}
              </button>
            )}
          </div>

          {/* Quick Returning Guest Autocomplete Search */}
          {isSearchingGuest && (
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Type name, phone, or ID to find previous guest..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 rounded-lg border border-neutral-300 bg-white text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
                {guestSearch && (
                  <button
                    type="button"
                    onClick={() => setGuestSearch('')}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {filteredGuests.length > 0 && (
                <div className="border border-neutral-200 rounded-lg bg-white divide-y divide-neutral-100 overflow-hidden shadow-xs">
                  {filteredGuests.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleSelectExistingGuest(g)}
                      className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center justify-between text-xs transition"
                    >
                      <span className="font-bold text-neutral-900">{g.full_name}</span>
                      <span className="text-neutral-500 font-mono">{g.phone} ({g.id_number})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
              placeholder="e.g. 0911 234567"
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

          <div className="pt-1">
            <IdPhotoCapture
              value={idPhoto}
              onChange={setIdPhoto}
              label="Passport / National ID Photo"
              helperText="Upload a photo of the guest's ID or Passport."
            />
          </div>
        </div>

        {/* 3. Payment Section (Pre-filled by default) */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <CircleDollarSign size={14} className="text-emerald-700" />
              3. Payment (Pre-Filled)
            </span>
            <span className="text-xs font-bold text-emerald-900">
              Total: ETB {totalRoomCharge.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-950 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                className="w-full h-11 px-3 rounded-xl border border-emerald-300 bg-white text-sm font-medium text-neutral-900 focus:outline-none focus:border-emerald-500"
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
              placeholder={paymentMethod === 'CREDIT' ? '0 (On Credit)' : String(totalRoomCharge)}
              disabled={paymentMethod === 'CREDIT'}
              value={paymentMethod === 'CREDIT' ? '' : amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              helperText={paymentMethod === 'CREDIT' ? 'Will be recorded as unpaid credit balance' : 'Pre-filled with full room charge'}
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
            Confirm & Check In Guest
          </Button>
        </div>
      </form>
    </Modal>
  )
}
