import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MapPin, Phone, Mail, Shield } from 'lucide-react'
import { GuestAccountMenu } from '../auth/GuestAccountMenu'
import { GuestAuthProvider } from '../../context/GuestAuthContext'

interface GuestPortalLayoutProps {
  children: ReactNode
}

export function GuestPortalLayout({ children }: GuestPortalLayoutProps) {
  const location = useLocation()
  const isLookup = location.pathname === '/lookup'

  return (
    <GuestAuthProvider>
      <div className="min-h-screen flex flex-col bg-white text-[#222222] font-sans selection:bg-[#FFF0F2] selection:text-[#FF385C]">
      {/* Top Hospitality Nav Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EBEBEB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-[#FF385C] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(255,56,92,0.3)] transition-transform duration-200 group-hover:scale-105">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <span className="block text-lg font-bold text-[#222222] tracking-tight leading-tight group-hover:text-[#FF385C] transition-colors">
                Haven House
              </span>
              <span className="block text-[11px] font-medium text-[#717171] flex items-center gap-1">
                <MapPin size={11} className="text-[#FF385C]" />
                Boutique Lodge · Bole, Addis Ababa
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-[#717171]">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-full hover:text-[#222222] hover:bg-[#F7F7F7] transition ${
                !isLookup ? 'text-[#222222] font-semibold' : ''
              }`}
            >
              Explore Rooms
            </Link>
            <a
              href="/#location"
              className="px-3.5 py-2 rounded-full hover:text-[#222222] hover:bg-[#F7F7F7] transition"
            >
              Location & Map
            </a>
            <a
              href="/#amenities"
              className="px-3.5 py-2 rounded-full hover:text-[#222222] hover:bg-[#F7F7F7] transition"
            >
              Amenities
            </a>
            <Link
              to="/lookup"
              className={`px-3.5 py-2 rounded-full hover:text-[#222222] hover:bg-[#F7F7F7] transition ${
                isLookup ? 'text-[#FF385C] font-semibold bg-[#FFF0F2]' : ''
              }`}
            >
              My Booking
            </Link>
          </nav>

          {/* Actions: Guest Account & Session */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <GuestAccountMenu />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">{children}</main>

      {/* Guest Footer */}
      <footer className="bg-[#F7F7F7] border-t border-[#EBEBEB] pt-14 pb-12 text-sm text-[#717171]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#FF385C] flex items-center justify-center text-white text-xs font-bold">
                  H
                </div>
                <span className="font-bold text-[#222222] text-base">Haven House</span>
              </div>
              <p className="text-xs leading-relaxed">
                A sanctuary of warmth, elegance, and tranquility in the heart of Addis Ababa's vibrant Bole district.
              </p>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#222222] mb-3">
                Guest Services
              </h5>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/" className="hover:text-[#222222] transition">
                    Browse Room Catalog
                  </Link>
                </li>
                <li>
                  <Link to="/lookup" className="hover:text-[#222222] transition">
                    Booking Self-Service & Lookup
                  </Link>
                </li>
                <li>
                  <a href="/#location" className="hover:text-[#222222] transition">
                    Airport Shuttle Assistance
                  </a>
                </li>
                <li>
                  <a href="/#amenities" className="hover:text-[#222222] transition">
                    High-Speed Wi-Fi & Breakfast
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#222222] mb-3">
                Property Policies
              </h5>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-1.5">
                  <Shield size={14} className="text-[#FF385C] shrink-0 mt-0.5" />
                  <span>Check-in: 02:00 PM</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Shield size={14} className="text-[#FF385C] shrink-0 mt-0.5" />
                  <span>Checkout deadline: 04:00 AM</span>
                </li>
                <li>Late checkouts subject to 600 ETB rate</li>
                <li>24/7 Front desk support</li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#222222] mb-3">
                Contact & Reception
              </h5>
              <ul className="space-y-2.5 text-xs">
                <li className="flex items-center gap-2">
                  <Phone size={14} className="text-[#FF385C]" />
                  <span>+251 11 618 0000 / +251 911 000 111</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-[#FF385C]" />
                  <span>stay@havenhouse.et</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="text-[#FF385C] shrink-0 mt-0.5" />
                  <span>Cameroon Street, Bole Sub-City, Addis Ababa, Ethiopia</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>© {new Date().getFullYear()} Haven House Guest House Management. All rights reserved.</p>
            <p className="text-[#999999]">Boutique Hospitality & Lodging · Bole, Addis Ababa</p>
          </div>
        </div>
      </footer>
    </div>
    </GuestAuthProvider>
  )
}
