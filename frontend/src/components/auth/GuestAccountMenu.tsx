import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  LogOut,
  ChevronDown,
  CalendarCheck,
  Compass,
  CheckCircle2,
  LayoutDashboard,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useGuestAuth } from '../../hooks/useGuestAuth'
import { GuestAuthModal } from '../modals/GuestAuthModal'

export function GuestAccountMenu() {
  const { user: staffUser, isAuthenticated: isStaffAuthenticated, logout: staffLogout } = useAuth()
  const { guestUser, isGuestAuthenticated, logout: guestLogout } = useGuestAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'signin' | 'register'>('signin')
  const [logoutNotice, setLogoutNotice] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleStaffLogout() {
    staffLogout()
    setMenuOpen(false)
    setLogoutNotice(true)
    setTimeout(() => setLogoutNotice(false), 3500)
  }

  function handleGuestLogout() {
    guestLogout()
    setMenuOpen(false)
    setLogoutNotice(true)
    setTimeout(() => setLogoutNotice(false), 3500)
  }

  function openAuth(mode: 'signin' | 'register') {
    setModalMode(mode)
    setModalOpen(true)
    setMenuOpen(false)
  }

  // 1. Staff / Admin is Authenticated
  if (isStaffAuthenticated && staffUser) {
    const firstName = staffUser.full_name.split(' ')[0]
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[#DDDDDD] hover:border-[#CCCCCC] hover:shadow-xs bg-white text-left transition duration-150"
        >
          <div className="w-7 h-7 rounded-full bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center text-xs font-bold">
            {staffUser.full_name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-[#222222] max-w-[100px] truncate hidden sm:inline-block">
            {firstName}
          </span>
          <ChevronDown
            size={13}
            className={`text-[#717171] transition-transform duration-200 ${
              menuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-[#EBEBEB] shadow-[0_10px_35px_rgba(0,0,0,0.1)] py-2 z-50 animate-fade-in text-xs">
            <div className="px-4 py-3 border-b border-[#F0F0F0] space-y-1">
              <span className="font-bold text-sm text-[#222222] truncate block">
                {staffUser.full_name}
              </span>
              <span className="text-[11px] text-[#717171] block truncate">
                @{staffUser.username} · {staffUser.role === 'ADMIN' ? 'Administrator' : 'Receptionist'}
              </span>
            </div>
            <div className="py-1">
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[#222222] hover:bg-[#F7F7F7] font-medium transition"
              >
                <LayoutDashboard size={14} className="text-[#FF385C]" />
                <span>Property Dashboard</span>
              </Link>
              <Link
                to="/rooms"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[#222222] hover:bg-[#F7F7F7] font-medium transition"
              >
                <Compass size={14} className="text-[#717171]" />
                <span>Room Status Board</span>
              </Link>
            </div>
            <div className="border-t border-[#F0F0F0] my-1" />
            <button
              type="button"
              onClick={handleStaffLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#C13515] hover:bg-[#FFF7F5] font-semibold text-left transition duration-150"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // 2. Guest is Authenticated
  if (isGuestAuthenticated && guestUser) {
    const firstName = guestUser.name.split(' ')[0]
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[#DDDDDD] hover:border-[#CCCCCC] hover:shadow-xs bg-white text-left transition duration-150"
        >
          {guestUser.picture ? (
            <img
              src={guestUser.picture}
              alt={guestUser.name}
              className="w-7 h-7 rounded-full object-cover border border-neutral-200"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center text-xs font-bold">
              {guestUser.name.charAt(0).toUpperCase()}
            </div>
          )}

          <span className="text-xs font-semibold text-[#222222] max-w-[100px] truncate hidden sm:inline-block">
            {firstName}
          </span>

          <ChevronDown
            size={13}
            className={`text-[#717171] transition-transform duration-200 ${
              menuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#EBEBEB] shadow-[0_10px_35px_rgba(0,0,0,0.1)] py-2 z-50 animate-fade-in text-xs">
            <div className="px-4 py-3 border-b border-[#F0F0F0] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#222222] truncate block">
                  {guestUser.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#008A05] bg-[#EBF9EB] px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} />
                  Guest
                </span>
              </div>
              <span className="text-[11px] text-[#717171] block truncate">
                {guestUser.email}
              </span>
              {guestUser.phone && (
                <span className="text-[10px] text-[#999999] block truncate">
                  {guestUser.phone}
                </span>
              )}
            </div>

            <div className="py-1">
              <Link
                to="/lookup"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[#222222] hover:bg-[#F7F7F7] font-medium transition"
              >
                <CalendarCheck size={14} className="text-[#FF385C]" />
                <span>My Bookings & Receipts</span>
              </Link>
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[#222222] hover:bg-[#F7F7F7] font-medium transition"
              >
                <Compass size={14} className="text-[#717171]" />
                <span>Explore Rooms & Rates</span>
              </Link>
            </div>

            <div className="border-t border-[#F0F0F0] my-1" />

            <button
              type="button"
              onClick={handleGuestLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#C13515] hover:bg-[#FFF7F5] font-semibold text-left transition duration-150"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // 3. Not Logged In: Show Sign In / Register Pill & Modal
  return (
    <>
      <div className="flex items-center gap-2">
        {logoutNotice && (
          <span className="text-xs text-[#008A05] font-medium animate-fade-in hidden sm:inline-block">
            ✓ Logged out successfully
          </span>
        )}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => openAuth('signin')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[#DDDDDD] hover:border-[#222222] bg-white text-xs font-semibold text-[#222222] transition duration-150 shadow-xs hover:shadow-sm"
          >
            <div className="w-5 h-5 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[#717171]">
              <User size={12} />
            </div>
            <span>Sign In / Register</span>
          </button>
        </div>
      </div>

      <GuestAuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMode={modalMode}
      />
    </>
  )
}
