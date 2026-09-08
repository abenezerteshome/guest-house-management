import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  BedDouble,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../common/Avatar'

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
      { label: 'Daily Logbook', to: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'RECEPTION'] },
      { label: 'Reservations', to: '/reservations', icon: CalendarDays, roles: ['ADMIN', 'RECEPTION'] },
      { label: 'Rooms', to: '/rooms', icon: BedDouble, roles: ['ADMIN', 'RECEPTION'] },
      { label: 'Guests', to: '/guests', icon: Users, roles: ['ADMIN', 'RECEPTION'] },
    ],
  },
  {
    title: 'Management',
    roles: ['ADMIN'],
    items: [
      { label: 'Stays Archive', to: '/stays', icon: ClipboardList, roles: ['ADMIN'] },
      { label: 'Expenses', to: '/expenses', icon: Wallet, roles: ['ADMIN'] },
      { label: 'Reports', to: '/reports', icon: BarChart3, roles: ['ADMIN'] },
      { label: 'Settings', to: '/settings', icon: Settings, roles: ['ADMIN'] },
    ],
  },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
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
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-[#DDDDDD] flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
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
                  Guest House Management
                </span>
              </div>
            </div>
            <button
              type="button"
              className="lg:hidden p-1.5 text-[#717171] hover:text-[#222222] rounded-lg hover:bg-[#F7F7F7]"
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
              <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {user?.full_name?.charAt(0) || (user?.role === 'ADMIN' ? 'A' : 'R')}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-[#222222] truncate">
                  {user?.full_name || (user?.role === 'ADMIN' ? 'Administrator' : 'Reception Staff')}
                </span>
                <span className="block text-[11px] text-[#717171] truncate">
                  {user?.role === 'ADMIN' ? 'Administrator' : 'Reception Desk'}
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
        {/* Clean Top Bar */}
        <header className="sticky top-0 z-30 h-[64px] sm:h-[72px] bg-white border-b border-[#DDDDDD] px-4 sm:px-8 flex items-center justify-between gap-4">
          {/* Left: Mobile trigger & Page context */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              className="lg:hidden p-2 text-[#222222] rounded-xl hover:bg-[#F7F7F7] border border-[#DDDDDD]"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={19} />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#717171]">
              <span className="font-bold text-sm text-[#222222]">
                {currentItem?.label || 'Haven House Guest House'}
              </span>
              <span className="text-[#CCCCCC]">/</span>
              <span>
                {new Intl.DateTimeFormat('en', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).format(new Date())}
              </span>
            </div>
          </div>

          {/* Right: User Avatar Dropdown */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 py-1.5 px-3 rounded-xl hover:bg-[#F7F7F7] border border-[#EEEEEE] transition text-left cursor-pointer"
                aria-label="User account menu"
              >
                <Avatar
                  name={user?.full_name || 'Staff User'}
                  role={user?.role}
                  size="sm"
                />
                <div className="hidden sm:block text-left">
                  <span className="block text-xs font-semibold text-[#222222] leading-tight truncate max-w-[140px]">
                    {user?.full_name}
                  </span>
                  <span className="block text-[11px] text-[#717171] leading-tight capitalize">
                    {user?.role === 'ADMIN' ? 'Administrator' : 'Reception Desk'}
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
                      @{user?.username} · {user?.role === 'ADMIN' ? 'Administrator' : 'Reception Desk'}
                    </span>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-[#222222] hover:bg-[#F7F7F7] transition"
                    >
                      <Settings size={14} className="text-[#717171]" />
                      <span>Guest House Settings</span>
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
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}