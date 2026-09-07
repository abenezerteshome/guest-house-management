import { useState } from 'react'
import { MapPin, Navigation, Compass, ExternalLink, Plane, Building2, ShoppingBag, TreePine } from 'lucide-react'
import { Button } from './Button'

interface Landmark {
  name: string
  distance: string
  driveTime: string
  icon: typeof Plane
}

const LANDMARKS: Landmark[] = [
  {
    name: 'Addis Ababa Bole International Airport (ADD)',
    distance: '3.2 km',
    driveTime: '8 mins',
    icon: Plane,
  },
  {
    name: 'Edna Mall & Medhane Alem Cathedral',
    distance: '1.4 km',
    driveTime: '4 mins',
    icon: ShoppingBag,
  },
  {
    name: 'Meskel Square & Friendship Park',
    distance: '3.5 km',
    driveTime: '10 mins',
    icon: TreePine,
  },
  {
    name: 'National Museum of Ethiopia (Lucy)',
    distance: '5.8 km',
    driveTime: '15 mins',
    icon: Building2,
  },
]

export function GoogleMapView() {
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap')

  const HAVEN_HOUSE_COORDS = {
    lat: 8.9892,
    lng: 38.7869,
    address: 'Cameroon Street, Bole Sub-City, Addis Ababa, Ethiopia',
  }

  // Direct Google Maps Link
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${HAVEN_HOUSE_COORDS.lat},${HAVEN_HOUSE_COORDS.lng}`

  return (
    <div className="bg-white rounded-3xl border border-[#DDDDDD] overflow-hidden shadow-sm">
      {/* Header Info */}
      <div className="p-6 sm:p-8 border-b border-[#F0F0F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FF385C]">
            <Compass size={16} />
            <span>Prime Hospitality Location</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#222222] tracking-tight">
            Where you'll be
          </h3>
          <p className="text-sm text-[#717171] flex items-center gap-1.5">
            <MapPin size={15} className="text-[#FF385C] shrink-0" />
            <span>{HAVEN_HOUSE_COORDS.address}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#F7F7F7] p-1 rounded-xl border border-[#EBEBEB] text-xs font-semibold text-[#717171]">
            <button
              onClick={() => setMapType('roadmap')}
              className={`px-3 py-1.5 rounded-lg transition ${
                mapType === 'roadmap' ? 'bg-white text-[#222222] shadow-sm' : 'hover:text-[#222222]'
              }`}
            >
              Street
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`px-3 py-1.5 rounded-lg transition ${
                mapType === 'satellite' ? 'bg-white text-[#222222] shadow-sm' : 'hover:text-[#222222]'
              }`}
            >
              Satellite
            </button>
          </div>

          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Navigation size={14} />
              <span>Get Directions</span>
              <ExternalLink size={12} className="text-[#717171]" />
            </Button>
          </a>
        </div>
      </div>

      {/* Map & Landmark Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Interactive Google Map Frame */}
        <div className="lg:col-span-2 h-[360px] sm:h-[420px] relative bg-neutral-100 border-b lg:border-b-0 lg:border-r border-[#F0F0F0]">
          <iframe
            title="Haven House Google Map"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${HAVEN_HOUSE_COORDS.lat},${HAVEN_HOUSE_COORDS.lng}&hl=en&z=15&t=${
              mapType === 'satellite' ? 'k' : 'm'
            }&output=embed`}
          />

          {/* Floating Marker Badge */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-[#DDDDDD] shadow-md flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#FF385C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              H
            </div>
            <div>
              <strong className="block text-xs font-bold text-[#222222]">Haven House</strong>
              <span className="block text-[10px] text-[#717171]">Bole, Addis Ababa</span>
            </div>
          </div>
        </div>

        {/* Nearby Attractions and Airport Distance */}
        <div className="p-6 sm:p-7 space-y-5 bg-[#FAFAFA]">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#717171] mb-1">
              Surroundings & Transit
            </h4>
            <p className="text-xs text-[#717171] leading-relaxed">
              Located in the secure, vibrant Bole diplomatic and hospitality corridor with easy access to embassies, dining, and transit.
            </p>
          </div>

          <div className="space-y-3">
            {LANDMARKS.map((landmark) => {
              const Icon = landmark.icon
              return (
                <div
                  key={landmark.name}
                  className="bg-white p-3.5 rounded-2xl border border-[#EBEBEB] flex items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center shrink-0">
                      <Icon size={16} />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-[#222222] line-clamp-1">
                        {landmark.name}
                      </h5>
                      <span className="text-[11px] text-[#717171]">{landmark.driveTime} drive</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#222222] bg-[#F7F7F7] px-2.5 py-1 rounded-full border border-[#E5E5E5] shrink-0">
                    {landmark.distance}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-[#EBF9EB] border border-[#BFE4C1] flex items-start gap-2.5 text-xs text-[#008A05]">
            <span className="text-base leading-none mt-0.5">🚐</span>
            <div>
              <strong className="block font-bold">Complimentary Airport Shuttle</strong>
              <span className="text-[11px] opacity-90">
                Direct pickup and drop-off available for Executive and Presidential suites.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
