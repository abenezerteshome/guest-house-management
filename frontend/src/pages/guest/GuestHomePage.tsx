import { useState, useEffect } from 'react'
import {
  Bed,
  Coffee,
  HeartHandshake,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react'
import { Button } from '../../components/common/Button'
import { GoogleMapView } from '../../components/common/GoogleMapView'
import { RoomDetailsModal } from '../../components/modals/RoomDetailsModal'
import { GuestBookingModal } from '../../components/modals/GuestBookingModal'
import type { PublicRoom } from '../../types/public'
import { getPublicRooms } from '../../api/public'

export function GuestHomePage() {
  const [rooms, setRooms] = useState<PublicRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [roomFilter, setRoomFilter] = useState<'ALL' | 'SINGLE' | 'DOUBLE' | 'SUITE'>('ALL')

  // Search Bar Dates
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const [searchCheckIn, setSearchCheckIn] = useState(todayStr)
  const [searchCheckOut, setSearchCheckOut] = useState(tomorrowStr)

  // Modals
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState<PublicRoom | null>(null)
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<PublicRoom | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

  useEffect(() => {
    fetchRooms()
  }, [])

  async function fetchRooms() {
    setLoading(true)
    try {
      const data = await getPublicRooms()
      setRooms(data)
    } catch (err) {
      console.error('Failed to load public rooms:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredRooms = rooms.filter((r) => {
    if (roomFilter === 'ALL') return true
    const type = r.room_type.toUpperCase()
    if (roomFilter === 'SINGLE') return type.includes('SINGLE')
    if (roomFilter === 'DOUBLE') return type.includes('DOUBLE') || type.includes('DELUXE')
    if (roomFilter === 'SUITE') return type.includes('SUITE') || type.includes('EXECUTIVE') || type.includes('PRESIDENTIAL')
    return true
  })

  function handleOpenBooking(room: PublicRoom) {
    setSelectedRoomForBooking(room)
    setBookingModalOpen(true)
  }

  function handleOpenDetails(room: PublicRoom) {
    setSelectedRoomForDetails(room)
    setDetailsModalOpen(true)
  }

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. HERO SECTION & SEARCH BAR */}
      <section className="relative pt-6 pb-12 sm:pt-10 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-900/90 to-neutral-800/80 min-h-[440px] sm:min-h-[500px] flex items-center justify-center text-center p-6 sm:p-12 shadow-xl">
          {/* Background image */}
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1800&q=80"
            alt="Haven House Exterior"
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
          />

          <div className="relative z-10 max-w-3xl space-y-6 text-white">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white border border-white/30 shadow-sm">
              <Sparkles size={14} className="text-[#FFD2D9]" />
              <span>Boutique Hospitality · Bole, Addis Ababa</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              A Warm Sanctuary in the Heart of Addis Ababa
            </h1>

            <p className="text-sm sm:text-base text-neutral-200 max-w-xl mx-auto leading-relaxed">
              Experience the warmth of Ethiopian hospitality, modern comfort, and effortless tranquility just 8 minutes from Bole International Airport.
            </p>

            {/* Airbnb-style Search Pill Bar */}
            <div className="mt-8 max-w-2xl mx-auto bg-white rounded-full p-2 sm:p-2.5 shadow-2xl border border-neutral-200 text-neutral-800 flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 w-full flex items-center divide-x divide-neutral-200">
                <div className="flex-1 px-4 py-1 text-left">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Check-in
                  </span>
                  <input
                    type="date"
                    value={searchCheckIn}
                    min={todayStr}
                    onChange={(e) => setSearchCheckIn(e.target.value)}
                    className="w-full text-xs font-semibold bg-transparent focus:outline-none text-[#222222]"
                  />
                </div>
                <div className="flex-1 px-4 py-1 text-left">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Checkout
                  </span>
                  <input
                    type="date"
                    value={searchCheckOut}
                    min={searchCheckIn || todayStr}
                    onChange={(e) => setSearchCheckOut(e.target.value)}
                    className="w-full text-xs font-semibold bg-transparent focus:outline-none text-[#222222]"
                  />
                </div>
              </div>

              <a href="#rooms" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  className="w-full sm:w-auto rounded-full gap-2 px-6 py-3 shadow-md"
                >
                  <Search size={15} />
                  <span>Check Availability</span>
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ROOM CATALOG MATRIX */}
      <section id="rooms" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FF385C]">
              <Bed size={15} />
              <span>Tailored Accommodations</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-1">
              Rooms & Private Suites
            </h2>
            <p className="text-sm text-[#717171] mt-1">
              Select your preferred space with live availability, transparent nightly pricing, and instant booking.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'All Rooms' },
              { id: 'SINGLE', label: 'Standard Single' },
              { id: 'DOUBLE', label: 'Deluxe Double' },
              { id: 'SUITE', label: 'Suites' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoomFilter(tab.id as typeof roomFilter)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                  roomFilter === tab.id
                    ? 'bg-[#222222] text-white shadow-sm'
                    : 'bg-[#F7F7F7] text-[#717171] hover:text-[#222222] hover:bg-[#EFEFEF]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Room Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-neutral-100" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-12 text-center bg-[#F7F7F7] rounded-3xl border border-[#DDDDDD]">
            <p className="text-sm text-[#717171]">No rooms match the selected category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredRooms.map((room) => {
              const isAvailable = room.status === 'AVAILABLE'

              return (
                <div
                  key={room.id}
                  className="group bg-white rounded-3xl border border-[#DDDDDD] overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Photo with status badge */}
                  <div
                    className="relative aspect-[4/3] overflow-hidden bg-neutral-100 cursor-pointer"
                    onClick={() => handleOpenDetails(room)}
                  >
                    <img
                      src={
                        room.image_url ||
                        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
                      }
                      alt={room.room_type}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Pill Status */}
                    <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-[#222222] shadow-sm flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isAvailable ? 'bg-[#008A05]' : 'bg-[#C76A00]'
                        }`}
                      />
                      <span>{isAvailable ? 'Available' : room.status}</span>
                    </div>

                    <div className="absolute bottom-3.5 right-3.5 bg-black/75 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-xs font-semibold">
                      {room.capacity} {room.capacity === 1 ? 'guest' : 'guests'}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3
                          onClick={() => handleOpenDetails(room)}
                          className="font-bold text-lg text-[#222222] tracking-tight hover:text-[#FF385C] cursor-pointer transition"
                        >
                          {room.room_type}
                        </h3>
                        <span className="text-xs font-semibold text-[#717171]">
                          Room {room.room_number}
                        </span>
                      </div>

                      {/* Amenities chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {room.amenities.slice(0, 3).map((a) => (
                          <span
                            key={a}
                            className="text-[11px] font-medium text-[#717171] bg-[#F7F7F7] px-2.5 py-1 rounded-md"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="pt-3 border-t border-[#F0F0F0] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#717171] uppercase tracking-wider block">
                          From
                        </span>
                        <div className="flex items-baseline gap-1">
                          <strong className="text-xl font-bold text-[#222222]">
                            {Number(room.price).toLocaleString()} ETB
                          </strong>
                          <span className="text-xs text-[#717171]">/ night</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetails(room)}
                          className="text-xs font-semibold"
                        >
                          Details
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={!isAvailable}
                          onClick={() => handleOpenBooking(room)}
                          className="rounded-full px-4 text-xs font-semibold"
                        >
                          {isAvailable ? 'Book' : 'Reserved'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 3. GOOGLE MAPS LOCATION SECTION */}
      <section id="location" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <GoogleMapView />
      </section>

      {/* 4. PROPERTY HIGHLIGHTS & AMENITIES */}
      <section id="amenities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FF385C]">
            <Sparkles size={14} />
            <span>Inclusive Boutique Amenities</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-[#222222] tracking-tight">
            Designed for Effortless Comfort
          </h2>
          <p className="text-sm text-[#717171]">
            Every stay at Haven House includes premium conveniences tailored for international travelers and local professionals.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'High-Speed Fiber Wi-Fi',
              desc: 'Dedicated enterprise connection for seamless remote work, streaming, and video calls.',
              icon: Wifi,
            },
            {
              title: '24/7 Uninterrupted Power',
              desc: 'Dual automatic backup generators and solar systems ensure constant power & hot water.',
              icon: Zap,
            },
            {
              title: 'Gourmet Ethiopian Breakfast',
              desc: 'Freshly roasted organic Sidama coffee, enjera, fresh juices, and international options.',
              icon: Coffee,
            },
            {
              title: 'Airport Transit Assistance',
              desc: 'Dedicated chauffeur pickup from Addis Ababa Bole International Airport directly to our lobby.',
              icon: MapPin,
            },
            {
              title: '24/7 Concierge & Security',
              desc: 'Round-the-clock front desk staff, secure perimeter, and private keycard access.',
              icon: ShieldCheck,
            },
            {
              title: 'Authentic Local Hospitality',
              desc: 'Personalized recommendations for Addis dining, galleries, and cultural excursions.',
              icon: HeartHandshake,
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="bg-[#FAFAFA] p-6 rounded-3xl border border-[#EBEBEB] space-y-3 hover:border-[#CCCCCC] transition"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-bold text-[#222222] tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-[#717171] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Interactive Modals */}
      <RoomDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        room={selectedRoomForDetails}
        onBookNow={handleOpenBooking}
      />

      <GuestBookingModal
        isOpen={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false)
          fetchRooms()
        }}
        room={selectedRoomForBooking}
        initialDates={{ checkIn: searchCheckIn, checkOut: searchCheckOut }}
        onBookingSuccess={() => {
          fetchRooms()
        }}
      />
    </div>
  )
}
