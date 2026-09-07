import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Clock, MapPin, Printer, ShieldAlert, Bed, ArrowLeft, Phone } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import type { PublicBookingConfirmation } from '../../types/public'
import { lookupReservation } from '../../api/public'

export function BookingLookupPage() {
  const [searchParams] = useSearchParams()
  const initialRef = searchParams.get('ref') || ''

  const [searchQuery, setSearchQuery] = useState(initialRef)
  const [booking, setBooking] = useState<PublicBookingConfirmation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLookup = useCallback(async (queryToUse?: string) => {
    const q = (queryToUse || searchQuery).trim()
    if (!q) {
      setError('Please enter your Booking Reference (e.g. HVN-00002) or phone number.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await lookupReservation(q)
      setBooking(data)
    } catch (err) {
      setBooking(null)
      setError(err instanceof Error ? err.message : 'No booking found. Please check your reference code.')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    if (initialRef) {
      handleLookup(initialRef)
    }
  }, [initialRef, handleLookup])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#717171] hover:text-[#222222] transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Haven House</span>
        </Link>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#222222] tracking-tight">
          Find Your Reservation
        </h1>
        <p className="text-sm text-[#717171] max-w-md mx-auto">
          Enter your Haven House reference code or phone number to check room status, stay details, and receipts.
        </p>
      </div>

      {/* Search Input Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#DDDDDD] shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="e.g. HVN-00002 or +251 9..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          />
        </div>
        <Button
          variant="primary"
          onClick={() => handleLookup()}
          disabled={loading}
          className="w-full sm:w-auto rounded-full gap-2 px-6"
        >
          <Search size={15} />
          <span>{loading ? 'Searching...' : 'Find Booking'}</span>
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#FFF7F5] border border-[#F2D1CA] text-xs text-[#C13515] flex items-center gap-2.5">
          <ShieldAlert size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Booking Details Card */}
      {booking && (
        <div className="bg-white rounded-3xl border border-[#DDDDDD] overflow-hidden shadow-md animate-fade-in">
          {/* Header Banner */}
          <div className="p-6 sm:p-8 bg-[#FAFAFA] border-b border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#717171]">
                  Booking Reference
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EBF9EB] text-[#008A05] border border-[#BFE4C1]">
                  ● {booking.status}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold font-mono text-[#222222] tracking-wider">
                {booking.booking_reference}
              </h2>
            </div>

            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
              <Printer size={15} />
              <span>Print Guest Pass</span>
            </Button>
          </div>

          {/* Details Body */}
          <div className="p-6 sm:p-8 space-y-6 text-sm text-[#222222]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#717171]">
                  Stay Information
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2.5 text-[#222222]">
                    <Bed size={16} className="text-[#FF385C]" />
                    <span className="font-semibold">
                      Room {booking.room_number} — {booking.room_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#717171]">
                    <Clock size={16} className="text-[#FF385C]" />
                    <span>
                      Arrival: {new Date(booking.expected_arrival).toLocaleDateString()} (02:00 PM)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#717171]">
                    <Clock size={16} className="text-[#FF385C]" />
                    <span>
                      Departure: {new Date(booking.expected_checkout).toLocaleDateString()} (04:00 AM deadline)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#717171]">
                    <MapPin size={16} className="text-[#FF385C]" />
                    <span>Cameroon St, Bole, Addis Ababa</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#717171]">
                  Guest & Folio Summary
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#F0F0F0]">
                    <span className="text-[#717171]">Guest Name</span>
                    <span className="font-semibold text-[#222222]">{booking.guest_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F0F0F0]">
                    <span className="text-[#717171]">Contact Phone</span>
                    <span className="font-semibold text-[#222222]">{booking.phone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F0F0F0]">
                    <span className="text-[#717171]">Nightly Rate</span>
                    <span className="font-semibold text-[#222222]">
                      {Number(booking.price_per_night).toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 text-sm font-bold pt-2">
                    <span className="text-[#222222]">Total Estimated</span>
                    <span className="text-[#FF385C]">
                      {Number(booking.total_estimated).toLocaleString()} ETB
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Check-in policy reminder */}
            <div className="p-4 rounded-2xl bg-[#FFF6EB] border border-[#FAD9B5] text-xs text-[#C76A00] space-y-1">
              <strong className="block font-bold">Checkout Deadline: 04:00 AM</strong>
              <p className="opacity-95 leading-relaxed">
                Please note that room checkout must be completed by 04:00 AM on your departure date.
                To request an extension, please contact the front desk.
              </p>
            </div>

            {/* Support CTA */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#717171] border-t border-[#F0F0F0]">
              <span>Need to modify or cancel your booking?</span>
              <a
                href="tel:+251116180000"
                className="inline-flex items-center gap-1.5 font-bold text-[#FF385C] hover:underline"
              >
                <Phone size={13} />
                <span>Call Front Desk: +251 11 618 0000</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
