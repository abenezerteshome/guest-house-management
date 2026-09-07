import { useState, useEffect } from 'react'
import { Calendar, CheckCircle2, ShieldAlert, ExternalLink, Printer } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { useGuestAuth } from '../../hooks/useGuestAuth'
import type { PublicRoom, PublicBookingConfirmation } from '../../types/public'
import { createPublicReservation } from '../../api/public'

interface GuestBookingModalProps {
  isOpen: boolean
  onClose: () => void
  room: PublicRoom | null
  initialDates?: { checkIn: string; checkOut: string }
  onBookingSuccess?: (confirmation: PublicBookingConfirmation) => void
}

export function GuestBookingModal({
  isOpen,
  onClose,
  room,
  initialDates,
  onBookingSuccess,
}: GuestBookingModalProps) {
  const { guestUser, loginWithGoogle } = useGuestAuth()

  // Form State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [nationality, setNationality] = useState('Ethiopian')
  const [specialRequests, setSpecialRequests] = useState('')
  const [paymentOption, setPaymentOption] = useState<'ONLINE_CHAPA' | 'PAY_AT_RECEPTION'>('ONLINE_CHAPA')

  // Dates
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const [checkInDate, setCheckInDate] = useState(initialDates?.checkIn || todayStr)
  const [checkOutDate, setCheckOutDate] = useState(initialDates?.checkOut || tomorrowStr)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<PublicBookingConfirmation | null>(null)

  // Auto-populate when guest user is connected
  useEffect(() => {
    if (guestUser) {
      if (guestUser.name) setFullName(guestUser.name)
      if (guestUser.email) setEmail(guestUser.email)
      if (guestUser.phone) setPhone(guestUser.phone)
    }
  }, [guestUser])

  useEffect(() => {
    if (initialDates) {
      setCheckInDate(initialDates.checkIn)
      setCheckOutDate(initialDates.checkOut)
    }
    setError('')
    setConfirmation(null)
  }, [initialDates, isOpen, room])

  if (!room) return null

  // Calculate nights and total
  const d1 = new Date(checkInDate)
  const d2 = new Date(checkOutDate)
  const diffTime = d2.getTime() - d1.getTime()
  const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  const nightlyPrice = Number(room.price)
  const totalPrice = nightlyPrice * nights

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!room) return
    if (!fullName.trim()) return setError('Please enter your full name.')
    if (!phone.trim()) return setError('Please enter your phone number.')
    if (d2 <= d1) return setError('Checkout date must be after check-in date.')

    setLoading(true)
    setError('')

    try {
      const res = await createPublicReservation({
        room_id: room.id,
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        id_number: idNumber.trim() || undefined,
        nationality: nationality.trim() || undefined,
        expected_arrival: `${checkInDate}T14:00:00Z`,
        expected_checkout: `${checkOutDate}T11:00:00Z`,
        special_requests: specialRequests.trim() || undefined,
        google_id_token: guestUser ? (guestUser.token || 'demo-user-token') : undefined,
      })

      setConfirmation(res)
      if (onBookingSuccess) {
        onBookingSuccess(res)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete your booking.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={confirmation ? 'Booking Confirmed!' : `Reserve ${room.room_type}`}
      description={
        confirmation
          ? `Your stay in Room ${confirmation.room_number} is booked and saved.`
          : 'Complete your booking details and receive your instant reservation pass.'
      }
      maxWidth="md"
    >
      {confirmation ? (
        /* Confirmation State */
        <div className="space-y-6 text-sm text-[#222222]">
          <div className="p-5 rounded-2xl bg-[#EBF9EB] border border-[#BFE4C1] text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#008A05] text-white flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="text-lg font-bold text-[#008A05]">Reservation Confirmed</h4>
            <p className="text-xs text-[#008A05]/90">
              We look forward to welcoming you to Haven House.
            </p>
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-[#717171] uppercase tracking-wider block">
                Booking Reference Code
              </span>
              <span className="text-2xl font-mono font-extrabold text-[#222222] tracking-wider">
                {confirmation.booking_reference}
              </span>
            </div>
          </div>

          <div className="bg-[#F7F7F7] p-4 rounded-2xl border border-[#EBEBEB] space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-[#E5E5E5]">
              <span className="text-[#717171]">Guest Name</span>
              <span className="font-semibold text-[#222222]">{confirmation.guest_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E5E5]">
              <span className="text-[#717171]">Room Allocated</span>
              <span className="font-semibold text-[#222222]">
                Room {confirmation.room_number} ({confirmation.room_type})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E5E5]">
              <span className="text-[#717171]">Duration</span>
              <span className="font-semibold text-[#222222]">
                {nights} {nights === 1 ? 'Night' : 'Nights'} ({checkInDate} to {checkOutDate})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E5E5]">
              <span className="text-[#717171]">Checkout Deadline</span>
              <span className="font-semibold text-[#222222]">04:00 AM (Late checkout rule applies)</span>
            </div>
            <div className="flex justify-between py-1 text-sm font-bold pt-1">
              <span className="text-[#222222]">Total Estimated Price</span>
              <span className="text-[#FF385C]">{Number(confirmation.total_estimated).toLocaleString()} ETB</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer size={15} />
              <span>Print Pass</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onClose()
                window.location.href = `/lookup?ref=${confirmation.booking_reference}`
              }}
              className="gap-2"
            >
              <span>View in My Bookings</span>
              <ExternalLink size={14} />
            </Button>
          </div>
        </div>
      ) : (
        /* Booking Form */
        <form onSubmit={handleSubmit} className="space-y-5 text-sm text-[#222222]">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#FFF7F5] border border-[#F2D1CA] text-xs text-[#C13515] flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Guest Account / Quick Auth Banner */}
          {guestUser ? (
            <div className="p-3.5 rounded-2xl bg-[#EBF9EB] border border-[#BFE4C1] flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#008A05] block">
                  ✓ Booking as {guestUser.name}
                </span>
                <span className="text-[11px] text-[#717171]">
                  Account: {guestUser.email} {guestUser.phone ? `· ${guestUser.phone}` : ''}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-[#008A05] bg-white px-2.5 py-1 rounded-full border border-[#BFE4C1]">
                Verified Guest
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#F7F7F7] border border-[#DDDDDD] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-xs font-bold text-[#222222] block">
                  Fast Booking & Auto-Fill
                </span>
                <span className="text-[11px] text-[#717171]">
                  Connect with Google or fill out your contact details below
                </span>
              </div>
              <button
                type="button"
                onClick={loginWithGoogle}
                className="inline-flex items-center gap-2 bg-white border border-[#DDDDDD] hover:border-[#222222] px-3 py-1.5 rounded-full text-xs font-semibold text-[#222222] transition duration-150 shadow-xs"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {/* Dates & Price Calculation */}
          <div className="p-4 rounded-2xl bg-[#FFF0F2]/50 border border-[#FFD2D9] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Check-in Date
                </label>
                <Input
                  type="date"
                  value={checkInDate}
                  min={todayStr}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Check-out Date
                </label>
                <Input
                  type="date"
                  value={checkOutDate}
                  min={checkInDate || todayStr}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#FFD2D9]">
              <span className="text-[#717171]">
                {nightlyPrice.toLocaleString()} ETB × {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
              <strong className="text-sm font-bold text-[#222222]">
                Total: {totalPrice.toLocaleString()} ETB
              </strong>
            </div>
          </div>

          {/* Guest Information */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#717171]">
              Guest Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  Full Name *
                </label>
                <Input
                  placeholder="e.g. Abebe Kebede"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  Phone Number (for SMS confirmation) *
                </label>
                <Input
                  placeholder="+251 9..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  Email Address (optional)
                </label>
                <Input
                  type="email"
                  placeholder="guest@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  Passport / Kebele ID (optional online)
                </label>
                <Input
                  placeholder="ID or Passport number"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#222222] mb-1">
                Nationality
              </label>
              <Input
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="Ethiopian"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#222222] mb-1">
                Special Requests or Arrival Notes
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Airport shuttle pickup time, quiet floor, early check-in, etc."
                rows={2}
                className="w-full text-xs p-3 rounded-xl border border-[#DDDDDD] focus:border-[#222222] focus:outline-none transition resize-none"
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#717171]">
              Payment Preference
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  paymentOption === 'ONLINE_CHAPA'
                    ? 'border-[#FF385C] bg-[#FFF0F2]/40'
                    : 'border-[#DDDDDD] hover:border-[#CCCCCC]'
                }`}
              >
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentOption === 'ONLINE_CHAPA'}
                  onChange={() => setPaymentOption('ONLINE_CHAPA')}
                  className="mt-1 accent-[#FF385C]"
                />
                <div>
                  <strong className="block text-xs font-bold text-[#222222]">
                    Pay Online via Chapa
                  </strong>
                  <span className="block text-[11px] text-[#717171] leading-tight mt-0.5">
                    Instant confirmation via Credit Card, Telebirr, or CBE Birr.
                  </span>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  paymentOption === 'PAY_AT_RECEPTION'
                    ? 'border-[#FF385C] bg-[#FFF0F2]/40'
                    : 'border-[#DDDDDD] hover:border-[#CCCCCC]'
                }`}
              >
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentOption === 'PAY_AT_RECEPTION'}
                  onChange={() => setPaymentOption('PAY_AT_RECEPTION')}
                  className="mt-1 accent-[#FF385C]"
                />
                <div>
                  <strong className="block text-xs font-bold text-[#222222]">
                    Reserve & Pay at Check-In
                  </strong>
                  <span className="block text-[11px] text-[#717171] leading-tight mt-0.5">
                    Pay in Cash, Telebirr, or Bank Transfer upon arrival at front desk.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-[#F0F0F0]">
            <div>
              <span className="text-[11px] text-[#717171] block">Total for {nights} nights:</span>
              <strong className="text-base font-bold text-[#FF385C]">
                {totalPrice.toLocaleString()} ETB
              </strong>
            </div>

            <div className="flex items-center gap-2.5">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={loading} className="gap-2">
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Calendar size={15} />
                    <span>Confirm Reservation</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
