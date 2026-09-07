import { Check, Clock, ShieldCheck, Users, Bed, Sparkles, MapPin } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import type { PublicRoom } from '../../types/public'

interface RoomDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  room: PublicRoom | null
  onBookNow: (room: PublicRoom) => void
}

export function RoomDetailsModal({ isOpen, onClose, room, onBookNow }: RoomDetailsModalProps) {
  if (!room) return null

  const isAvailable = room.status === 'AVAILABLE'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${room.room_type} — Room ${room.room_number}`}
      description="Spacious boutique guest accommodations designed for tranquil relaxation."
      maxWidth="lg"
    >
      <div className="space-y-6 text-sm text-[#222222]">
        {/* Room Photo Gallery Hero */}
        <div className="relative rounded-2xl overflow-hidden aspect-video border border-[#DDDDDD] shadow-sm">
          <img
            src={room.image_url || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'}
            alt={room.room_type}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-200 text-xs font-bold text-[#222222] shadow-sm flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isAvailable ? 'bg-[#008A05]' : 'bg-[#C76A00]'
              }`}
            />
            <span>{isAvailable ? 'Available for Booking' : room.status}</span>
          </div>
          <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold">
            {room.capacity} {room.capacity === 1 ? 'Guest' : 'Guests max'}
          </div>
        </div>

        {/* Price and Overview Bar */}
        <div className="p-4 rounded-2xl bg-[#F7F7F7] border border-[#EBEBEB] flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-[#717171] uppercase tracking-wider block">
              Nightly Rate
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-[#222222]">
                {Number(room.price).toLocaleString()} ETB
              </span>
              <span className="text-xs text-[#717171]">/ night</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-[#717171]">
            <div className="flex items-center gap-1.5">
              <Users size={16} className="text-[#FF385C]" />
              <span>Up to {room.capacity} guests</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bed size={16} className="text-[#FF385C]" />
              <span>Premium bedding</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={16} className="text-[#FF385C]" />
              <span>Bole, Addis Ababa</span>
            </div>
          </div>
        </div>

        {/* Amenities List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#717171] mb-3 flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#FF385C]" />
            <span>Room Features & Amenities</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {room.amenities.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[#F0F0F0] bg-white text-xs font-medium text-[#222222]"
              >
                <div className="w-5 h-5 rounded-full bg-[#EBF9EB] text-[#008A05] flex items-center justify-center shrink-0">
                  <Check size={12} />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* House Policies & 4:00 AM Rule Notice */}
        <div className="p-4 rounded-2xl bg-[#FFF6EB] border border-[#FAD9B5] text-xs text-[#C76A00] space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <Clock size={16} />
            <span>Check-in & Checkout Policy</span>
          </div>
          <p className="leading-relaxed opacity-95">
            Check-in starts at 02:00 PM. Standard checkout deadline is <strong>04:00 AM</strong>. Guests remaining past 04:00 AM will have a 600 ETB late checkout fee applied unless an extension is requested at reception.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#F0F0F0]">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            disabled={!isAvailable}
            onClick={() => {
              onClose()
              onBookNow(room)
            }}
            className="gap-2"
          >
            <ShieldCheck size={16} />
            <span>{isAvailable ? 'Book This Room' : 'Currently Unavailable'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
