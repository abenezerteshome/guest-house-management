import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  BedDouble,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../common/Avatar'
import { Modal } from '../common/Modal'

interface NavItem {
  label: string
  to: string
  icon: typeof LayoutDashboard
  roles: string[]
  badge?: string
}

interface NavSection {
  title: string
  roles: string[]
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Operations',
    roles: ['ADMIN', 'RECEPTION'],
    items: [
      { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'RECEPTION'] },
      { label: 'Reservations', to: '/reservations', icon: CalendarDays, roles: ['ADMIN', 'RECEPTION'] },
      { label: 'Rooms', to: '/rooms', icon: BedDouble, roles: ['ADMIN', 'RECEPTION'] },
      { label: 'Guests', to: '/guests', icon: Users, roles: ['ADMIN', 'RECEPTION'] },
      { label: 'Stays', to: '/stays', icon: ClipboardList, roles: ['ADMIN', 'RECEPTION'] },
    ],
  },
  {
    title: 'Management',
    roles: ['ADMIN'],
    items: [
      { label: 'Expenses', to: '/expenses', icon: Wallet, roles: ['ADMIN'] },
      { label: 'Reports', to: '/reports', icon: BarChart3, roles: ['ADMIN'] },
    ],
  },
  {
    title: 'Administration',
    roles: ['ADMIN'],
    items: [
      { label: 'Audit Log', to: '/audit-log', icon: History, roles: ['ADMIN'] },
      { label: 'Settings', to: '/settings', icon: Settings, roles: ['ADMIN'] },
    ],
  },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter sections and items based on user role
  const userRole = user?.role ?? 'RECEPTION'
  const visibleSections = navSections
    .filter((section) => section.roles.includes(userRole))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(userRole)),
    }))

  // Derive current page title from path
  const currentItem = navSections
    .flatMap((s) => s.items)
    .find((item) => item.to === location.pathname)

  return (
    <div className="min-h-screen flex bg-white text-[#222222]">
      {/* Mobile Sidebar Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Light Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-[#DDDDDD] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="h-[72px] px-6 flex items-center justify-between border-b border-[#EEEEEE]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF385C] flex items-center justify-center text-white shadow-xs">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <span className="block text-base font-bold text-[#222222] tracking-tight leading-tight">
                  Haven House
                </span>
                <span className="block text-[11px] font-medium text-[#717171]">
                  Property Management
                </span>
              </div>
            </div>
            <button
              type="button"
              className="md:hidden p-1.5 text-[#717171] hover:text-[#222222] rounded-lg hover:bg-[#F7F7F7]"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
            {visibleSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#717171]">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-[#FFF0F2] text-[#222222] font-semibold'
                            : 'text-[#555555] hover:bg-[#F7F7F7] hover:text-[#222222]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3">
                            <Icon
                              size={18}
                              className={`transition-colors ${
                                isActive
                                  ? 'text-[#FF385C]'
                                  : 'text-[#717171] group-hover:text-[#222222]'
                              }`}
                            />
                            <span>{item.label}</span>
                          </div>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF385C]" />
                          )}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-[#EEEEEE] space-y-3">
            <div className="px-3 py-2 rounded-xl bg-[#F7F7F7] border border-[#EBEBEB] flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#008A05] shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-[#222222] truncate">
                  {user?.role === 'ADMIN' ? 'Property Host Mode' : 'Front Desk Mode'}
                </span>
                <span className="block text-[11px] text-[#717171] truncate">
                  {user?.role === 'ADMIN' ? 'Full operations' : 'Speed-optimized'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#717171] hover:text-[#C13515] hover:bg-[#FFF7F5] transition-colors duration-150"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean Top Bar */}
        <header className="sticky top-0 z-30 h-[72px] bg-white border-b border-[#DDDDDD] px-4 sm:px-8 flex items-center justify-between gap-4">
          {/* Left: Mobile trigger & Page context */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              className="md:hidden p-2 text-[#222222] rounded-xl hover:bg-[#F7F7F7] border border-[#DDDDDD]"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={19} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#717171]">
              <span className="font-medium text-[#222222]">
                {currentItem?.label || 'Haven House'}
              </span>
              <span>/</span>
              <span>
                {new Intl.DateTimeFormat('en', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                }).format(new Date())}
              </span>
            </div>
          </div>

          {/* Center: Search pill button */}
          <div className="flex-1 max-w-xs sm:max-w-md">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-full border border-[#DDDDDD] bg-[#F7F7F7] hover:bg-white hover:border-[#CCCCCC] hover:shadow-xs transition-all text-left text-xs text-[#717171]"
            >
              <span className="flex items-center gap-2 truncate">
                <Search size={14} className="text-[#717171] shrink-0" />
                <span className="truncate">Search reservations, rooms, guests...</span>
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-[#717171] bg-white rounded border border-[#DDDDDD]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Operational Status + User Avatar */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF9EB] text-[#008A05] text-xs font-medium border border-[#BFE4C1]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#008A05] animate-pulse-subtle" />
              <span>Live Desk</span>
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[#EEEEEE] hover:bg-[#F7F7F7] py-1.5 px-2 rounded-xl transition text-left cursor-pointer"
                aria-label="User account menu"
              >
                <Avatar
                  name={user?.full_name || 'Staff User'}
                  role={user?.role}
                  size="sm"
                />
                <div className="hidden sm:block text-left">
                  <span className="block text-xs font-semibold text-[#222222] leading-tight truncate max-w-[120px]">
                    {user?.full_name}
                  </span>
                  <span className="block text-[11px] text-[#717171] leading-tight capitalize">
                    {user?.role === 'ADMIN' ? 'Administrator' : 'Receptionist'}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-[#717171] transition-transform duration-200 ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#DDDDDD] shadow-[0_10px_35px_rgba(0,0,0,0.1)] py-2 z-50 animate-fade-in text-xs">
                  <div className="px-3.5 py-2 border-b border-[#F0F0F0]">
                    <span className="block font-bold text-xs text-[#222222] truncate">
                      {user?.full_name}
                    </span>
                    <span className="block text-[11px] text-[#717171]">
                      @{user?.username} · {user?.role === 'ADMIN' ? 'Administrator' : 'Receptionist'}
                    </span>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-[#222222] hover:bg-[#F7F7F7] transition"
                    >
                      <Settings size={14} className="text-[#717171]" />
                      <span>Property Settings</span>
                    </Link>
                  )}
                  <div className="border-t border-[#F0F0F0] my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      window.location.href = '/login'
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-[#C13515] hover:bg-[#FFF7F5] font-semibold text-left transition cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Global Quick Search Modal */}
      <Modal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Quick Search"
        description="Search across guest house rooms, active reservations, and guest files."
      >
        <div className="space-y-4">
          <div className="relative flex items-center h-12 rounded-xl border border-[#DDDDDD] bg-white px-3.5 focus-within:border-[#222222] focus-within:ring-1 focus-within:ring-[#222222]">
            <Search size={16} className="text-[#717171] mr-2.5" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by room (e.g. 101), guest name, or booking ID…"
              className="w-full bg-transparent text-sm text-[#222222] placeholder:text-[#999999] focus:outline-none"
            />
          </div>

          <div className="py-2 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171]">
              Quick Shortcuts
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <NavLink
                to="/rooms"
                onClick={() => setSearchOpen(false)}
                className="p-3 rounded-xl border border-[#DDDDDD] hover:border-[#222222] hover:bg-[#F7F7F7] transition-all flex items-center gap-3 text-xs font-semibold text-[#222222]"
              >
                <BedDouble size={16} className="text-[#FF385C]" />
                <span>View All Rooms</span>
              </NavLink>
              <NavLink
                to="/reservations"
                onClick={() => setSearchOpen(false)}
                className="p-3 rounded-xl border border-[#DDDDDD] hover:border-[#222222] hover:bg-[#F7F7F7] transition-all flex items-center gap-3 text-xs font-semibold text-[#222222]"
              >
                <CalendarDays size={16} className="text-[#FF385C]" />
                <span>View Reservations</span>
              </NavLink>
              <NavLink
                to="/guests"
                onClick={() => setSearchOpen(false)}
                className="p-3 rounded-xl border border-[#DDDDDD] hover:border-[#222222] hover:bg-[#F7F7F7] transition-all flex items-center gap-3 text-xs font-semibold text-[#222222]"
              >
                <Users size={16} className="text-[#FF385C]" />
                <span>Guest Registry</span>
              </NavLink>
              <NavLink
                to="/stays"
                onClick={() => setSearchOpen(false)}
                className="p-3 rounded-xl border border-[#DDDDDD] hover:border-[#222222] hover:bg-[#F7F7F7] transition-all flex items-center gap-3 text-xs font-semibold text-[#222222]"
              >
                <ClipboardList size={16} className="text-[#FF385C]" />
                <span>Active In-House Stays</span>
              </NavLink>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}