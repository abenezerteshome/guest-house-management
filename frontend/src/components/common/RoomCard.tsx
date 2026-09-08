import type { ReactNode } from 'react'
import { Badge, type BadgeTone } from './Badge'
import { Users, Bed, Wifi, Sparkles } from 'lucide-react'

export interface RoomCardData {
  id?: string
  roomNumber: string
  roomType: string
  pricePerNight: string | number
  hourlyPrice?: string | number | null
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' | 'RESERVED' | 'EXPECTED'
  capacity?: number
  bedType?: string
  amenities?: string[]
  imageUrl?: string
}

export interface RoomCardProps {
  room: RoomCardData
  onSelect?: (room: RoomCardData) => void
  actionSlot?: ReactNode
  className?: string
}

export function RoomCard({
  room,
  onSelect,
  actionSlot,
  className = '',
}: RoomCardProps) {
  const statusToneMap: Record<RoomCardData['status'], BadgeTone> = {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    CLEANING: 'cleaning',
    MAINTENANCE: 'maintenance',
    RESERVED: 'expected',
    EXPECTED: 'expected',
  }

  const statusLabelMap: Record<RoomCardData['status'], string> = {
    AVAILABLE: 'Available',
    OCCUPIED: 'Occupied',
    CLEANING: 'Cleaning',
    MAINTENANCE: 'Maintenance',
    RESERVED: 'Reserved',
    EXPECTED: 'Expected',
  }

  const formattedPrice =
    typeof room.pricePerNight === 'number'
      ? `ETB ${room.pricePerNight.toLocaleString()}`
      : room.pricePerNight.startsWith('ETB')
      ? room.pricePerNight
      : `ETB ${room.pricePerNight}`

  return (
    <div
      onClick={() => onSelect?.(room)}
      className={`group bg-white border border-[#DDDDDD] rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-[#CCCCCC] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-all duration-200 flex flex-col ${
        onSelect ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Visual Image / Architectural Illustration Container */}
      <div className="relative aspect-[16/10] bg-[#F7F7F7] overflow-hidden border-b border-[#EEEEEE]">
        {room.imageUrl ? (
          <img
            src={room.imageUrl}
            alt={`${room.roomNumber} - ${room.roomType}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#FDFDFD] to-[#F5F5F5] group-hover:bg-[#F2F2F2] transition-colors duration-200">
            {/* Architectural Room Illustration SVG */}
            <svg
              className="w-24 h-20 text-[#DDDDDD] group-hover:text-[#B0B0B0] transition-colors duration-200"
              viewBox="0 0 100 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Back Wall & Headboard */}
              <rect x="15" y="20" width="70" height="42" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
              <rect x="25" y="32" width="50" height="28" rx="3" fill="#EAEAEA" stroke="currentColor" strokeWidth="2" />
              {/* Pillows */}
              <rect x="30" y="36" width="16" height="10" rx="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
              <rect x="54" y="36" width="16" height="10" rx="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
              {/* Bed Duvet */}
              <path d="M25 48C25 46.8954 25.8954 46 27 46H73C74.1046 46 75 46.8954 75 48V60H25V48Z" fill="#F0F0F0" stroke="currentColor" strokeWidth="1.5" />
              {/* Side Tables & Lamps */}
              <line x1="18" y1="46" x2="25" y2="46" stroke="currentColor" strokeWidth="2" />
              <circle cx="21.5" cy="40" r="3" fill="#FFE5EA" stroke="#FF385C" strokeWidth="1.5" />
              <line x1="75" y1="46" x2="82" y2="46" stroke="currentColor" strokeWidth="2" />
              <circle cx="78.5" cy="40" r="3" fill="#FFE5EA" stroke="#FF385C" strokeWidth="1.5" />
              {/* Wall Art Frame */}
              <rect x="42" y="10" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M46 20L49 16L54 21" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-medium text-[#717171] mt-1.5 flex items-center gap-1">
              <Sparkles size={11} className="text-[#FF385C]" />
              Haven House Suite
            </span>
          </div>
        )}

        {/* Floating Status Badge */}
        <div className="absolute top-3 right-3">
          <Badge tone={statusToneMap[room.status]} size="sm">
            {statusLabelMap[room.status]}
          </Badge>
        </div>

        {/* Room Number Floating Pill */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-[#DDDDDD] shadow-xs">
          <span className="text-xs font-bold text-[#222222] tracking-tight">
            {room.roomNumber}
          </span>
        </div>
      </div>

      {/* Details Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-[#222222] leading-tight">
                {room.roomType}
              </h4>
              <p className="text-xs text-[#717171] mt-0.5">
                {room.bedType || 'Standard Queen Bed'}
              </p>
            </div>
          </div>

          {/* Amenities & Attributes */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F0F0F0] text-xs text-[#717171]">
            {room.capacity && (
              <span className="flex items-center gap-1">
                <Users size={13} />
                <span>{room.capacity} Guests</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Bed size={13} />
              <span>Ensuite</span>
            </span>
            <span className="flex items-center gap-1">
              <Wifi size={13} />
              <span>High-speed</span>
            </span>
          </div>
        </div>

        {/* Pricing and Action Footer */}
        <div className="mt-4 pt-3 border-t border-[#F0F0F0] space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-[#222222]">
                {formattedPrice}
              </span>
              <span className="text-xs text-[#717171] font-normal"> / night</span>
              {room.hourlyPrice && (
                <span className="ml-2 text-[11px] font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">
                  ETB {Number(room.hourlyPrice).toLocaleString()} / hr
                </span>
              )}
            </div>
          </div>
          {actionSlot && (
            <div className="w-full pt-0.5">
              {actionSlot}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
