import { useState, useEffect, useMemo } from 'react'
import { KeyRound, ShieldAlert, UserCheck, Banknote } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { IdPhotoCapture } from '../common/IdPhotoCapture'
import type { Room, Guest, Reservation, Stay } from '../../types/api'
import { createGuest, getGuest, updateGuest } from '../../api/guests'
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
  onLoadingChange?: (roomId: number, loading: boolean) => void
}

type ReceivedViaMethod = 'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER' | 'CREDIT'

export function CheckInModal({
  isOpen,
  onClose,
  availableRooms,
  allRooms,
  selectedRoomId,
  existingReservation,
  initialGuest,
  onSuccess,
  onLoadingChange,
}: CheckInModalProps) {
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null)

  const selectableRooms = useMemo(() => {
    const list = [...availableRooms]
    const targetRoomId = existingReservation?.room_id || selectedRoomId
    if (targetRoomId && allRooms) {
      const selected = allRooms.find((r) => r.id === targetRoomId)
      if (selected && selected.status !== 'CLEANING' && !list.some((r) => r.id === targetRoomId)) {
        list.push(selected)
      }
    }
    return list.sort((a, b) =>
      a.room_number.localeCompare(b.room_number, undefined, { numeric: true })
    )
  }, [availableRooms, allRooms, selectedRoomId, existingReservation])

  const [roomId, setRoomId] = useState<number>(
    existingReservation?.room_id || selectedRoomId || selectableRooms[0]?.id || 0
  )
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idPhoto, setIdPhoto] = useState<string | null>(null)
  const [receivedVia, setReceivedVia] = useState<ReceivedViaMethod>('CASH')
  const [checkInDate, setCheckInDate] = useState(() => new Date().toISOString().slice(0, 16))
  const [checkoutDate, setCheckoutDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(11, 0, 0, 0)
    return tomorrow.toISOString().slice(0, 16)
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (existingReservation?.room_id) {
      setRoomId(existingReservation.room_id)
    } else if (selectedRoomId) {
      setRoomId(selectedRoomId)
    } else if (
      selectableRooms.length > 0 &&
      (!roomId || !selectableRooms.some((r) => r.id === roomId))
    ) {
      setRoomId(selectableRooms[0].id)
    }
  }, [selectedRoomId, selectableRooms, existingReservation, isOpen])

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      setCheckInDate(now.toISOString().slice(0, 16))
      setActiveReservation(existingReservation || null)
      setReceivedVia('CASH')

      if (existingReservation) {
        // Pre-fill from existing reservation
        setRoomId(existingReservation.room_id)
        if (existingReservation.expected_checkout) {
          const exp = new Date(existingReservation.expected_checkout)
          setCheckoutDate(exp.toISOString().slice(0, 16))
        }

        // Only the name and phone number is fetched and filled already from the reservation
        getGuest(existingReservation.guest_id)
          .then((g) => {
            setFullName(g.full_name || '')
            setPhone(g.phone || '')
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
          setIdPhoto(initialGuest.idPhotoUrl || null)
        } else {
          setFullName('')
          setPhone('')
          setIdPhoto(null)
        }
      }

      setError('')
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
    if (!fullName.trim() || !phone.trim()) {
      setError('Please fill in Guest Full Name and Phone Number.')
      return
    }

    setError('')
    setLoading(true)
    onLoadingChange?.(roomId, true)

    try {
      let stay: Stay | undefined

      if (activeReservation) {
        // If guest photo was uploaded during check-in, save to guest profile
        if (idPhoto) {
          try {
            await updateGuest(activeReservation.guest_id, {
              id_photo_url: idPhoto,
            })
          } catch (e) {
            console.warn('Could not update guest profile during check-in:', e)
          }
        }

        // Direct check-in of existing reservation
        stay = await checkInReservation(activeReservation.id)
      } else {
        // Walk-in flow: create new Guest, create Reservation, then check-in
        const guest = await createGuest({
          full_name: fullName.trim(),
          id_number: 'PENDING_ON_ARRIVAL',
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

      // Record payment immediately if not on credit
      if (stay && receivedVia !== 'CREDIT' && totalRoomCharge > 0) {
        try {
          await recordManualPayment({
            stay_id: stay.id,
            amount: totalRoomCharge,
            payment_method: receivedVia,
            reference: `Check-in payment (${receivedVia})`,
          })
        } catch (payErr) {
          console.error('Check-in was successful but recording payment failed:', payErr)
        }
      }

      setFullName('')
      setPhone('')
      setIdPhoto(null)
      setReceivedVia('CASH')
      setActiveReservation(null)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(getApiError(err, 'Unable to complete check-in.'))
    } finally {
      setLoading(false)
      onLoadingChange?.(roomId, false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Check In Guest"
      description="Enter guest information and confirm check-in."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm text-[#222222]">
        {error && (
          <div className="p-3.5 rounded-xl bg-[#FFF7F5] border border-[#F2D1CA] text-xs text-[#C13515] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Expected Checkout Date & Time Card */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-800">
              Expected Checkout Date & Time *
            </label>
            <span className="text-xs font-bold text-neutral-800 bg-neutral-100 px-3 py-1 rounded-lg border border-neutral-200">
              {durationDescription} = ETB {totalRoomCharge.toLocaleString()}
            </span>
          </div>

          <input
            type="datetime-local"
            value={checkoutDate}
            min={checkInDate}
            onChange={(e) => setCheckoutDate(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-white text-sm font-medium text-neutral-900 focus:outline-none focus:border-neutral-900"
            required
          />
        </div>

        {/* 2. GUEST INFORMATION Card */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              2. GUEST INFORMATION
            </span>
          </div>

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
              placeholder="e.g. 0911 234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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

        {/* 3. RECEIVED VIA Card */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote size={16} className="text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                3. RECEIVED VIA *
              </span>
            </div>
            <span className="text-xs font-bold text-neutral-800 bg-neutral-100 px-3 py-1 rounded-lg border border-neutral-200">
              Total Charge: ETB {totalRoomCharge.toLocaleString()}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Received Via *
            </label>
            <select
              value={receivedVia}
              onChange={(e) =>
                setReceivedVia(e.target.value as ReceivedViaMethod)
              }
              className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-white text-sm font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
              required
            >
              <option value="CASH">Cash</option>
              <option value="TELEBIRR">Telebirr</option>
              <option value="CBE_BIRR">CBE Birr</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CREDIT">On Credit (Pay Later)</option>
            </select>
          </div>

          {receivedVia === 'CREDIT' ? (
            <p className="text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
              Room charge of ETB {totalRoomCharge.toLocaleString()} will remain on credit to be settled at checkout.
            </p>
          ) : (
            <p className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
              Payment of ETB {totalRoomCharge.toLocaleString()} will be recorded as received via {
                receivedVia === 'CASH'
                  ? 'Cash'
                  : receivedVia === 'TELEBIRR'
                  ? 'Telebirr'
                  : receivedVia === 'CBE_BIRR'
                  ? 'CBE Birr'
                  : 'Bank Transfer'
              }.
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
          {loading && (
            <p
              className="mr-auto text-xs font-semibold text-neutral-500"
              role="status"
              aria-live="polite"
            >
              Completing check-in and recording payment...
            </p>
          )}
          <Button
            variant="ghost"
            size="md"
            type="button"
            onClick={onClose}
            disabled={loading}
            className="font-semibold text-neutral-700 hover:text-neutral-900"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            loading={loading}
            leftIcon={<KeyRound size={16} />}
            className="bg-[#FF385C] hover:bg-[#E03150] text-white font-bold rounded-xl px-5 py-2.5 shadow-xs"
          >
            {loading ? 'Checking In...' : 'Confirm & Check In Guest'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
