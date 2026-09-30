import { useState, useEffect, useMemo } from 'react'
import { Calendar, AlertCircle, Building2, Banknote, Check } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { toLocalDatetimeInput, todayLocalDateString } from '../../utils/dateUtils'
import { sortRoomsAscending } from '../../utils/roomUtils'
import type { Room, Guest } from '../../types/api'
import { getGuests, createGuest } from '../../api/guests'
import { createReservation } from '../../api/reservations'
import { getApiError } from '../../api/client'

interface ReservationModalProps {
  isOpen: boolean
  onClose: () => void
  availableRooms: Room[]
  selectedRoomId?: number
  initialGuest?: {
    id?: number
    fullName?: string
    phone?: string
    nationality?: string | null
    idNumber?: string | null
  }
  onSuccess: () => void
}

export function ReservationModal({
  isOpen,
  onClose,
  availableRooms,
  selectedRoomId,
  initialGuest,
  onSuccess,
}: ReservationModalProps) {
  const [existingGuests, setExistingGuests] = useState<Guest[]>([])
  const [selectedGuestId, setSelectedGuestId] = useState<number | null>(null)
  const [guestSearch, setGuestSearch] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)

  // Guest fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('Ethiopian')

  const sortedAvailableRooms = useMemo(() => sortRoomsAscending(availableRooms), [availableRooms])
  const [roomId, setRoomId] = useState<number>(selectedRoomId || sortedAvailableRooms[0]?.id || 0)
  const [arrivalDate, setArrivalDate] = useState(() => {
    const now = new Date()
    now.setHours(14, 0, 0, 0)
    return toLocalDatetimeInput(now)
  })
  const [checkoutDate, setCheckoutDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(11, 0, 0, 0)
    return toLocalDatetimeInput(tomorrow)
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Payment Method & Advance Deposit fields
  type ReceivedViaMethod = 'CREDIT' | 'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER' | 'OTHER'
  const [receivedVia, setReceivedVia] = useState<ReceivedViaMethod>('CREDIT')
  const [depositAmount, setDepositAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [depositReference, setDepositReference] = useState('')

  useEffect(() => {
    if (selectedRoomId && sortedAvailableRooms.some((r) => r.id === selectedRoomId)) {
      setRoomId(selectedRoomId)
    } else if (sortedAvailableRooms.length > 0 && (!roomId || !sortedAvailableRooms.some((r) => r.id === roomId))) {
      setRoomId(sortedAvailableRooms[0].id)
    }
  }, [selectedRoomId, sortedAvailableRooms, roomId, isOpen])

  // Fetch all guests on open to enable instant auto-fill and search
  useEffect(() => {
    if (isOpen) {
      getGuests().then(setExistingGuests).catch(console.error)
      if (initialGuest) {
        setFullName(initialGuest.fullName || '')
        setPhone(initialGuest.phone || '')
        setNationality(initialGuest.nationality || 'Ethiopian')
        setSelectedGuestId(initialGuest.id || null)
      } else {
        setFullName('')
        setPhone('')
        setNationality('Ethiopian')
        setSelectedGuestId(null)
      }
      setGuestSearch('')
      setShowSearchDropdown(false)
      setReceivedVia('CREDIT')
      setDepositAmount('')
      setBankName('')
      setDepositReference('')
      setError('')
    }
  }, [isOpen, initialGuest])

  // Handle auto-matching when phone number is typed
  function handlePhoneChange(newPhone: string) {
    setPhone(newPhone)
    const cleanPhone = newPhone.replace(/\s+/g, '')
    if (cleanPhone.length >= 4) {
      const match = existingGuests.find(
        (g) => g.phone.replace(/\s+/g, '') === cleanPhone
      )
      if (match) {
        setFullName(match.full_name)
        if (match.nationality) setNationality(match.nationality)
        setSelectedGuestId(match.id)
        return
      }
    }
    // If phone was changed away from a match
    if (selectedGuestId) {
      setSelectedGuestId(null)
    }
  }

  function handleSelectGuest(guest: Guest) {
    setFullName(guest.full_name)
    setPhone(guest.phone)
    if (guest.nationality) setNationality(guest.nationality)
    setSelectedGuestId(guest.id)
    setGuestSearch('')
    setShowSearchDropdown(false)
  }

  function handleClearSelectedGuest() {
    setSelectedGuestId(null)
    setFullName('')
    setPhone('')
    setNationality('Ethiopian')
  }

  const filteredGuests = existingGuests.filter((g) => {
    if (!guestSearch.trim()) return false
    const q = guestSearch.toLowerCase()
    return (
      g.full_name.toLowerCase().includes(q) ||
      g.phone.includes(q) ||
      g.id_number.toLowerCase().includes(q)
    )
  }).slice(0, 6)

  const selectedGuestObj = selectedGuestId ? existingGuests.find((g) => g.id === selectedGuestId) : null

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

      if (selectedGuestId) {
        guestId = selectedGuestId
      } else {
        if (!fullName.trim() || !phone.trim()) {
          setError('Please fill in Guest Full Name and Phone Number.')
          setLoading(false)
          return
        }
        // Check once more in existing guests by exact phone match to prevent duplicates
        const existing = existingGuests.find(
          (g) => g.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, '')
        )
        if (existing) {
          guestId = existing.id
        } else {
          const newGuest = await createGuest({
            full_name: fullName.trim(),
            phone: phone.trim(),
            id_number: 'PENDING_ON_ARRIVAL',
            nationality: nationality.trim() || 'Ethiopian',
          })
          guestId = newGuest.id
        }
      }

      const isAdvancePaid = receivedVia !== 'CREDIT'
      const numericDeposit = isAdvancePaid
        ? (depositAmount ? parseFloat(depositAmount) : calculatedExpectedAmount)
        : 0

      if (isAdvancePaid && (isNaN(numericDeposit) || numericDeposit <= 0)) {
        setError('Please enter a valid amount paid or select "Pay at Check-In".')
        setLoading(false)
        return
      }

      if (isAdvancePaid && receivedVia === 'OTHER' && !bankName.trim()) {
        setError('Please enter the name of the bank.')
        setLoading(false)
        return
      }

      const finalDepositRef =
        isAdvancePaid && receivedVia === 'OTHER'
          ? depositReference.trim()
            ? `${bankName.trim()} - ${depositReference.trim()}`
            : `Other: ${bankName.trim()}`
          : depositReference.trim() || undefined

      await createReservation({
        guest_id: guestId,
        room_id: roomId,
        expected_arrival: arr.toISOString(),
        expected_checkout: dep.toISOString(),
        expected_amount: calculatedExpectedAmount,
        deposit_amount: isAdvancePaid ? numericDeposit : 0,
        deposit_method: isAdvancePaid ? receivedVia : undefined,
        deposit_reference: isAdvancePaid ? finalDepositRef : undefined,
        reason: 'Reservation',
      })

      // Reset form
      setFullName('')
      setPhone('')
      setSelectedGuestId(null)
      setReceivedVia('CREDIT')
      setDepositAmount('')
      setBankName('')
      setDepositReference('')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to create reservation. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Reservation" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Room selection glance */}
        <div className="rounded-2xl bg-neutral-50 p-3.5 border border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF385C]/10 text-[#FF385C] flex items-center justify-center font-bold text-sm">
              <Building2 className="w-4 h-4" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              {sortedAvailableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  Room {room.room_number} ({room.room_type} - {Number(room.price).toLocaleString()} ETB)
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
              min={todayLocalDateString() + 'T00:00'}
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
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-blue-50/80 border border-blue-200 text-xs">
          <span className="text-blue-900 font-medium">Duration & Total:</span>
          <span className="font-bold text-blue-950 bg-white px-2.5 py-1 rounded-lg border border-blue-200">
            {durationDescription} = ETB {calculatedExpectedAmount.toLocaleString()}
          </span>
        </div>

        {/* Guest Information with instant auto-fetch & pre-fill */}
        <div className="border-t border-neutral-100 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Guest Details
            </h4>
            {selectedGuestObj && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>Registered Guest</span>
                <button
                  type="button"
                  onClick={handleClearSelectedGuest}
                  className="text-emerald-800 hover:text-rose-600 font-bold ml-1 text-xs cursor-pointer"
                  title="Clear guest details"
                >
                  ✕
                </button>
              </span>
            )}
          </div>

          {/* Quick search input */}
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search guest by name, phone, or ID..."
                value={guestSearch}
                onChange={(e) => {
                  setGuestSearch(e.target.value)
                  setShowSearchDropdown(true)
                }}
                onFocus={() => setShowSearchDropdown(true)}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs bg-neutral-50/70 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#FF385C]"
              />
              {guestSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setGuestSearch('')
                    setShowSearchDropdown(false)
                  }}
                  className="absolute right-3 top-2 text-xs text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              )}
            </div>

            {showSearchDropdown && filteredGuests.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border border-neutral-200 shadow-lg py-1 divide-y divide-neutral-100 max-h-48 overflow-y-auto">
                {filteredGuests.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectGuest(g)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#FF385C]/5 flex items-center justify-between transition cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-neutral-900">{g.full_name}</span>
                      <span className="text-neutral-500 ml-2">{g.phone}</span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {g.id_number}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Guest Name *"
              placeholder="e.g. Hanna Girma"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Phone *"
              placeholder="e.g. 0912 345678"
              required
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
            />
          </div>
        </div>

        {/* Payment Method Card - identical to CheckInModal */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote size={16} className="text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                Payment Method
              </span>
            </div>
            <span className="text-xs font-bold text-neutral-800 bg-neutral-100 px-3 py-1 rounded-lg border border-neutral-200">
              Total Charge: ETB {calculatedExpectedAmount.toLocaleString()}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Received Via *
            </label>
            <select
              value={receivedVia}
              onChange={(e) => {
                const next = e.target.value as ReceivedViaMethod
                setReceivedVia(next)
                if (next !== 'CREDIT' && (!depositAmount || Number(depositAmount) === 0)) {
                  setDepositAmount(String(calculatedExpectedAmount))
                }
              }}
              className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-white text-sm font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
              required
            >
              <option value="CREDIT">Pay on Arrival / On Credit</option>
              <option value="CASH">Cash</option>
              <option value="TELEBIRR">Telebirr</option>
              <option value="CBE_BIRR">CBE Birr</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {receivedVia === 'OTHER' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Bank Name *
              </label>
              <Input
                placeholder="e.g. Awash Bank, Dashen Bank, Bank of Abyssinia"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          {receivedVia === 'CREDIT' ? (
            <p className="text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
              Room charge of ETB {calculatedExpectedAmount.toLocaleString()} will remain on credit to be settled at check-in.
            </p>
          ) : (
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Amount Paid (ETB) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDepositAmount(String(calculatedExpectedAmount))}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        parseFloat(depositAmount) === calculatedExpectedAmount
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      Full Amount (ETB {calculatedExpectedAmount.toLocaleString()})
                    </button>
                    {resNights > 1 && (
                      <button
                        type="button"
                        onClick={() => setDepositAmount(String(roomPricePerNight))}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          parseFloat(depositAmount) === roomPricePerNight
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                        }`}
                      >
                        1 Night (ETB {roomPricePerNight.toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={String(calculatedExpectedAmount)}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-white text-sm font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
                  required
                />
              </div>

              <Input
                label="Reference / Transaction Note"
                placeholder="e.g. Telebirr Txn # / Receipt / Transfer Ref (Optional)"
                value={depositReference}
                onChange={(e) => setDepositReference(e.target.value)}
              />

              <p className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                Payment of ETB {Number(depositAmount || calculatedExpectedAmount).toLocaleString()} will be recorded as received via {
                  receivedVia === 'CASH'
                    ? 'Cash'
                    : receivedVia === 'TELEBIRR'
                    ? 'Telebirr'
                    : receivedVia === 'CBE_BIRR'
                    ? 'CBE Birr'
                    : receivedVia === 'BANK_TRANSFER'
                    ? 'Bank Transfer'
                    : bankName.trim()
                    ? bankName.trim()
                    : 'Other Bank'
                }.
              </p>
            </div>
          )}
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
            {loading ? 'Saving...' : 'Save Reservation'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
