import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BedDouble,
  CalendarDays,
  Users,
  Phone,
  MapPin,
  Power,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Clock,
  TrendingUp,
  Wallet,
  BarChart3,
  ArrowUpRight,
  Pencil,
  Trash2,
  KeyRound,
  Mail,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { Avatar } from '../../components/common/Avatar'
import { AddPropertyModal } from '../../components/modals/AddPropertyModal'
import { EditPropertyModal } from '../../components/modals/EditPropertyModal'
import { DeletePropertyModal } from '../../components/modals/DeletePropertyModal'
import { ManagePropertyUsersModal } from '../../components/modals/ManagePropertyUsersModal'
import { AddUserModal } from '../../components/modals/AddUserModal'
import { EditUserModal } from '../../components/modals/EditUserModal'
import { ChangePasswordModal } from '../../components/modals/ChangePasswordModal'
import { ConfirmDeleteUserModal } from '../../components/modals/ConfirmDeleteUserModal'
import { getProperties, getSuperAdminStats, togglePropertyStatus } from '../../api/superAdmin'
import { listUsers, activateUser, deactivateUser } from '../../api/users'
import { getApiError } from '../../api/client'
import type { Property, SuperAdminStats, User } from '../../types/api'

export function SuperAdminPropertiesPage() {
  const [activeTab, setActiveTab] = useState<'PROPERTIES' | 'USERS'>('PROPERTIES')

  // Properties state
  const [properties, setProperties] = useState<Property[]>([])
  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL')
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false)

  // Property Modals
  const [selectedPropertyForEdit, setSelectedPropertyForEdit] = useState<Property | null>(null)
  const [selectedPropertyForDelete, setSelectedPropertyForDelete] = useState<Property | null>(null)
  const [selectedPropertyForUsers, setSelectedPropertyForUsers] = useState<Property | null>(null)

  // Status toggle confirmation modal state
  const [selectedPropertyForToggle, setSelectedPropertyForToggle] = useState<Property | null>(null)
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  // Global Users state for the User & Password Management Tab
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userPropertyFilter, setUserPropertyFilter] = useState<number | 'ALL'>('ALL')
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'ADMIN' | 'RECEPTION'>('ALL')
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL')

  // User Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null)
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null)
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<User | null>(null)

  async function loadData() {
    setLoading(true)
    setErrorMsg('')
    try {
      const [propsData, statsData, usersData] = await Promise.all([
        getProperties(),
        getSuperAdminStats(),
        listUsers(),
      ])
      setProperties(propsData)
      setStats(statsData)
      setUsers(usersData)
    } catch (err) {
      setErrorMsg(getApiError(err, 'Failed to fetch platform metrics and data.'))
    } finally {
      setLoading(false)
    }
  }

  async function reloadUsers() {
    setUsersLoading(true)
    try {
      const usersData = await listUsers()
      setUsers(usersData)
    } catch (err) {
      setErrorMsg(getApiError(err, 'Failed to refresh user accounts.'))
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      const q = search.toLowerCase()
      const matchesSearch =
        prop.name.toLowerCase().includes(q) ||
        prop.code.toLowerCase().includes(q) ||
        (prop.contact_phone && prop.contact_phone.includes(q)) ||
        (prop.contact_email && prop.contact_email.toLowerCase().includes(q))

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && prop.is_active) ||
        (statusFilter === 'SUSPENDED' && !prop.is_active)

      return matchesSearch && matchesStatus
    })
  }, [properties, search, statusFilter])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.toLowerCase()
      const matchesSearch =
        u.username.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.property_name && u.property_name.toLowerCase().includes(q))

      const matchesProp =
        userPropertyFilter === 'ALL' || u.property_id === userPropertyFilter

      const matchesRole =
        userRoleFilter === 'ALL' || u.role === userRoleFilter

      const matchesStatus =
        userStatusFilter === 'ALL' ||
        (userStatusFilter === 'ACTIVE' && u.is_active) ||
        (userStatusFilter === 'DISABLED' && !u.is_active)

      return matchesSearch && matchesProp && matchesRole && matchesStatus
    })
  }, [users, userSearch, userPropertyFilter, userRoleFilter, userStatusFilter])

  function handlePromptToggle(property: Property) {
    setSelectedPropertyForToggle(property)
    setIsToggleModalOpen(true)
  }

  async function handleConfirmToggle() {
    if (!selectedPropertyForToggle) return
    setIsToggling(true)
    try {
      const updated = await togglePropertyStatus(
        selectedPropertyForToggle.id,
        !selectedPropertyForToggle.is_active
      )
      setProperties((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, is_active: updated.is_active } : p))
      )
      setSuccessMsg(
        `Property "${updated.name}" is now ${updated.is_active ? 'Active' : 'Suspended'}.`
      )
      setTimeout(() => setSuccessMsg(''), 4000)
      setIsToggleModalOpen(false)
      setSelectedPropertyForToggle(null)
      getSuperAdminStats().then(setStats).catch(() => {})
    } catch (err) {
      setErrorMsg(getApiError(err, 'Failed to update property status.'))
    } finally {
      setIsToggling(false)
    }
  }

  async function handleToggleUserStatus(u: User) {
    try {
      const updated = u.is_active ? await deactivateUser(u.id) : await activateUser(u.id)
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setSuccessMsg(`Account @${updated.username} is now ${updated.is_active ? 'Active' : 'Disabled'}.`)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setErrorMsg(getApiError(err, 'Failed to update user status.'))
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Properties & Accounts"
        />
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {activeTab === 'PROPERTIES' ? (
            <Button
              variant="primary"
              onClick={() => setIsAddPropertyModalOpen(true)}
              className="gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New Property</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setIsAddUserModalOpen(true)}
              className="gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Staff Account</span>
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setActiveTab('PROPERTIES')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
            activeTab === 'PROPERTIES'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Guest Houses & Tenants</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-100 text-neutral-600 font-semibold">
            {properties.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
            activeTab === 'USERS'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Usernames & Password Management</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-100 text-neutral-600 font-semibold">
            {users.length}
          </span>
        </button>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: PROPERTIES DIRECTORY */}
      {activeTab === 'PROPERTIES' && (
        <div className="space-y-6">
          {/* Platform Metric Overview Cards */}
          <div className="space-y-3">
            {/* Operational Scope Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xl font-bold text-neutral-900 leading-tight">
                    {stats?.total_properties ?? 0}
                  </span>
                  <span className="block text-[11px] font-medium text-neutral-500">Total Properties</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xl font-bold text-emerald-700 leading-tight">
                    {stats?.active_properties ?? 0}
                  </span>
                  <span className="block text-[11px] font-medium text-neutral-500">Active Clients</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xl font-bold text-rose-700 leading-tight">
                    {stats?.suspended_properties ?? 0}
                  </span>
                  <span className="block text-[11px] font-medium text-neutral-500">Suspended</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <BedDouble className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xl font-bold text-neutral-900 leading-tight">
                    {stats?.total_rooms ?? 0}
                  </span>
                  <span className="block text-[11px] font-medium text-neutral-500">Managed Rooms</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3.5 col-span-2 sm:col-span-1">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xl font-bold text-neutral-900 leading-tight">
                    {stats?.total_stays ?? 0}
                  </span>
                  <span className="block text-[11px] font-medium text-neutral-500">Total Stays</span>
                </div>
              </div>
            </div>

            {/* Financial Rollup Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                      Platform Gross Volume
                    </span>
                    <span className="block text-xl font-extrabold text-emerald-950 leading-tight">
                      ETB {Number(stats?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <Link
                  to="/reports"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5"
                >
                  <span>Reports</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
                      Platform Operating Expenses
                    </span>
                    <span className="block text-xl font-extrabold text-rose-950 leading-tight">
                      ETB {Number(stats?.total_expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">
                      Platform Net Cashflow
                    </span>
                    <span className="block text-xl font-extrabold text-indigo-950 leading-tight">
                      ETB {Number(stats?.total_net_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search property name, code, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {filter === 'ALL' ? 'All Clients' : filter === 'ACTIVE' ? 'Active' : 'Suspended'}
                </button>
              ))}
            </div>
          </div>

          {/* Properties Table */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-xs text-neutral-400">
                Loading tenant property directory...
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Building2 className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-sm font-semibold text-neutral-700">No properties found</p>
                <p className="text-xs text-neutral-400">
                  {search || statusFilter !== 'ALL'
                    ? 'Try adjusting your search query or filter.'
                    : 'Click "Onboard New Property" to add your first guest house client.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/70 text-neutral-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Property</th>
                      <th className="py-3 px-4">Contact & Location</th>
                      <th className="py-3 px-4">Configuration</th>
                      <th className="py-3 px-4 text-center">Managed Scope</th>
                      <th className="py-3 px-4">Financials</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {filteredProperties.map((prop) => (
                      <tr key={prop.id} className="hover:bg-neutral-50/50 transition-colors">
                        {/* Property Identification */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 font-bold shrink-0">
                              {prop.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-900 text-sm">{prop.name}</span>
                                <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] font-mono font-bold text-neutral-600">
                                  {prop.code}
                                </span>
                              </div>
                              <span className="text-[11px] text-neutral-400">
                                Onboarded {new Date(prop.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact & Location */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {prop.contact_phone ? (
                              <div className="flex items-center gap-1.5 text-neutral-600">
                                <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                <span>{prop.contact_phone}</span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 italic">No phone logged</span>
                            )}
                            {prop.contact_email && (
                              <div className="flex items-center gap-1.5 text-neutral-500">
                                <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                <span>{prop.contact_email}</span>
                              </div>
                            )}
                            {prop.address && (
                              <div className="flex items-center gap-1.5 text-neutral-500 truncate max-w-xs">
                                <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                <span className="truncate">{prop.address}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Configuration */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-neutral-600">
                              <span className="font-semibold text-neutral-900">{prop.currency}</span>
                              <span>currency</span>
                            </div>
                            <div className="flex items-center gap-1 text-neutral-500 text-[11px]">
                              <Clock className="w-3 h-3 text-neutral-400" />
                              <span>
                                {String(prop.checkout_deadline_hour).padStart(2, '0')}:
                                {String(prop.checkout_deadline_minute).padStart(2, '0')} cutoff
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Scope Counters */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-3">
                            <div className="text-center" title="Rooms">
                              <span className="block font-bold text-neutral-900">
                                {prop.total_rooms ?? 0}
                              </span>
                              <span className="block text-[10px] text-neutral-400">Rooms</span>
                            </div>
                            <div className="w-px h-5 bg-neutral-200" />
                            <div className="text-center" title="Active Stays">
                              <span className="block font-bold text-neutral-900">
                                {prop.active_stays ?? 0}
                              </span>
                              <span className="block text-[10px] text-neutral-400">Stays</span>
                            </div>
                            <div className="w-px h-5 bg-neutral-200" />
                            <div className="text-center" title="Staff Users">
                              <span className="block font-bold text-neutral-900">
                                {prop.staff_count ?? 0}
                              </span>
                              <span className="block text-[10px] text-neutral-400">Staff</span>
                            </div>
                          </div>
                        </td>

                        {/* Financial Summary */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 min-w-[130px]">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-neutral-400">Rev:</span>
                              <span className="font-semibold text-emerald-700">
                                {prop.currency} {Number(prop.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-neutral-400">Exp:</span>
                              <span className="font-medium text-rose-600">
                                {prop.currency} {Number(prop.total_expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-neutral-100">
                              <span className="text-neutral-400">Net:</span>
                              <span
                                className={`font-bold ${
                                  Number(prop.net_income || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {prop.currency} {Number(prop.net_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {prop.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Suspended
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Property */}
                            <button
                              type="button"
                              onClick={() => setSelectedPropertyForEdit(prop)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition border border-neutral-200 cursor-pointer"
                              title="Edit Property Settings & Details"
                            >
                              <Pencil className="w-3.5 h-3.5 text-neutral-500" />
                              <span className="hidden xl:inline">Edit</span>
                            </button>

                            {/* Staff & Logins */}
                            <button
                              type="button"
                              onClick={() => setSelectedPropertyForUsers(prop)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition border border-indigo-200 cursor-pointer"
                              title="Manage Staff Accounts & Reset Passwords"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Logins</span>
                            </button>

                            {/* Reports */}
                            <Link
                              to={`/reports?property_id=${prop.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition border border-neutral-200"
                              title="View Financial Reports"
                            >
                              <BarChart3 className="w-3.5 h-3.5 text-neutral-500" />
                              <span className="hidden xl:inline">Reports</span>
                            </Link>

                            {/* Suspend / Reactivate */}
                            <button
                              type="button"
                              onClick={() => handlePromptToggle(prop)}
                              title={prop.is_active ? 'Suspend Property Access' : 'Activate Property'}
                              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                                prop.is_active
                                  ? 'text-amber-700 hover:bg-amber-50 border border-amber-200'
                                  : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">{prop.is_active ? 'Suspend' : 'Activate'}</span>
                            </button>

                            {/* Delete Property */}
                            <button
                              type="button"
                              onClick={() => setSelectedPropertyForDelete(prop)}
                              className="inline-flex items-center p-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                              title="Delete Property Client"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STAFF & PASSWORD MANAGEMENT */}
      {activeTab === 'USERS' && (
        <div className="space-y-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xl font-bold text-neutral-900 leading-tight">
                  {users.length}
                </span>
                <span className="block text-[11px] font-medium text-neutral-500">Total User Accounts</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xl font-bold text-indigo-900 leading-tight">
                  {users.filter((u) => u.role === 'ADMIN').length}
                </span>
                <span className="block text-[11px] font-medium text-neutral-500">Property Admins</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xl font-bold text-blue-900 leading-tight">
                  {users.filter((u) => u.role === 'RECEPTION').length}
                </span>
                <span className="block text-[11px] font-medium text-neutral-500">Reception Staff</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xl font-bold text-emerald-700 leading-tight">
                  {users.filter((u) => u.is_active).length}
                </span>
                <span className="block text-[11px] font-medium text-neutral-500">Active Accounts</span>
              </div>
            </div>
          </div>

          {/* User Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search username, full name, email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>

              {/* Guest House Selector */}
              <div className="w-full sm:w-56">
                <select
                  value={userPropertyFilter}
                  onChange={(e) =>
                    setUserPropertyFilter(
                      e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                >
                  <option value="ALL">All Guest Houses</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-1">
                {(['ALL', 'ADMIN', 'RECEPTION'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUserRoleFilter(r)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      userRoleFilter === r
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {r === 'ALL' ? 'All Roles' : r === 'ADMIN' ? 'Admins' : 'Reception'}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 self-start sm:self-auto">
              {(['ALL', 'ACTIVE', 'DISABLED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setUserStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    userStatusFilter === st
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Disabled'}
                </button>
              ))}
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
            {usersLoading ? (
              <div className="py-16 text-center text-xs text-neutral-400">
                Loading user accounts...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Users className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-sm font-semibold text-neutral-700">No user accounts found</p>
                <p className="text-xs text-neutral-400">
                  {userSearch || userPropertyFilter !== 'ALL' || userRoleFilter !== 'ALL'
                    ? 'Try adjusting your filters or search terms.'
                    : 'Click "Provision Staff Account" to create a user.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/70 text-neutral-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Assigned Guest House</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions & Password Reset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {filteredUsers.map((u) => {
                      const prop = properties.find((p) => p.id === u.property_id)
                      return (
                        <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                          {/* Member */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={u.full_name} size="sm" />
                              <div>
                                <span className="font-bold text-neutral-900 block text-xs">
                                  {u.full_name}
                                </span>
                                <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-400">
                                  {u.phone && (
                                    <span className="text-neutral-600 font-medium">📞 {u.phone}</span>
                                  )}
                                  {u.email && <span>{u.email}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Username */}
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-neutral-100 font-mono font-bold text-neutral-800 text-xs">
                              @{u.username}
                            </span>
                          </td>

                          {/* Property */}
                          <td className="py-3.5 px-4">
                            {prop ? (
                              <div className="space-y-0.5">
                                <span className="font-semibold text-neutral-900 block">{prop.name}</span>
                                <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                                  {prop.code}
                                </span>
                              </div>
                            ) : u.role === 'SUPER_ADMIN' ? (
                              <span className="text-neutral-500 font-medium italic">
                                Platform-Wide (Super Admin)
                              </span>
                            ) : (
                              <span className="text-neutral-400 italic">Unassigned</span>
                            )}
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">
                            {u.role === 'SUPER_ADMIN' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                Super Admin
                              </span>
                            ) : u.role === 'ADMIN' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                                Administrator
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                                <UserCheck className="w-3.5 h-3.5 text-neutral-500" />
                                Reception Desk
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Disabled
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Reset Password Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedUserForPassword(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 transition border border-amber-200 cursor-pointer"
                                title="Reset Password for this User"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                <span>Reset Password</span>
                              </button>

                              {/* Edit User Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedUserForEdit(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition border border-neutral-200 cursor-pointer"
                                title="Edit Username & Account Details"
                              >
                                <Pencil className="w-3.5 h-3.5 text-neutral-500" />
                                <span>Edit</span>
                              </button>

                              {/* Toggle Active Button (cannot disable super admin if self) */}
                              {u.role !== 'SUPER_ADMIN' && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`inline-flex items-center gap-1 p-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                                    u.is_active
                                      ? 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                                      : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                                  }`}
                                  title={u.is_active ? 'Disable Account' : 'Activate Account'}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Account (cannot delete super admin) */}
                              {u.role !== 'SUPER_ADMIN' && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserForDelete(u)}
                                  className="inline-flex items-center p-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                                  title="Permanently Delete Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onboard Property Modal */}
      <AddPropertyModal
        isOpen={isAddPropertyModalOpen}
        onClose={() => setIsAddPropertyModalOpen(false)}
        onSuccess={() => {
          loadData()
          setSuccessMsg('New property client onboarded and provisioned successfully!')
          setTimeout(() => setSuccessMsg(''), 4000)
        }}
      />

      {/* Edit Property Modal */}
      <EditPropertyModal
        isOpen={Boolean(selectedPropertyForEdit)}
        property={selectedPropertyForEdit}
        onClose={() => setSelectedPropertyForEdit(null)}
        onSuccess={(updated) => {
          setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          setSuccessMsg(`Property "${updated.name}" updated successfully!`)
          setTimeout(() => setSuccessMsg(''), 4000)
        }}
      />

      {/* Delete Property Modal */}
      <DeletePropertyModal
        isOpen={Boolean(selectedPropertyForDelete)}
        property={selectedPropertyForDelete}
        onClose={() => setSelectedPropertyForDelete(null)}
        onSuccess={() => {
          if (selectedPropertyForDelete) {
            setProperties((prev) => prev.filter((p) => p.id !== selectedPropertyForDelete.id))
            setSuccessMsg(`Property "${selectedPropertyForDelete.name}" permanently deleted.`)
            setTimeout(() => setSuccessMsg(''), 4000)
            loadData()
          }
        }}
      />

      {/* Manage Property Users Modal (Dedicated to one property) */}
      <ManagePropertyUsersModal
        isOpen={Boolean(selectedPropertyForUsers)}
        property={selectedPropertyForUsers}
        onClose={() => setSelectedPropertyForUsers(null)}
        onUsersChanged={() => {
          reloadUsers()
          getProperties().then(setProperties).catch(() => {})
        }}
      />

      {/* Platform-wide Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        properties={properties}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={(newUser) => {
          setUsers((prev) => [...prev, newUser])
          setSuccessMsg(`User @${newUser.username} provisioned successfully!`)
          setTimeout(() => setSuccessMsg(''), 4000)
          getProperties().then(setProperties).catch(() => {})
        }}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={Boolean(selectedUserForEdit)}
        user={selectedUserForEdit}
        properties={properties}
        onClose={() => setSelectedUserForEdit(null)}
        onSuccess={(updated) => {
          setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
          setSuccessMsg(`Account @${updated.username} updated successfully!`)
          setTimeout(() => setSuccessMsg(''), 4000)
        }}
      />

      {/* Password Reset Modal */}
      {selectedUserForPassword && (
        <ChangePasswordModal
          user={selectedUserForPassword}
          adminReset={true}
          onClose={() => setSelectedUserForPassword(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
            setSuccessMsg(`Password for @${updated.username} reset successfully!`)
            setTimeout(() => setSuccessMsg(''), 4000)
          }}
        />
      )}

      {/* Delete User Modal */}
      <ConfirmDeleteUserModal
        isOpen={Boolean(selectedUserForDelete)}
        user={selectedUserForDelete}
        onClose={() => setSelectedUserForDelete(null)}
        onSuccess={() => {
          if (selectedUserForDelete) {
            setUsers((prev) => prev.filter((item) => item.id !== selectedUserForDelete.id))
            setSuccessMsg(`Account @${selectedUserForDelete.username} deleted successfully.`)
            setTimeout(() => setSuccessMsg(''), 4000)
            getProperties().then(setProperties).catch(() => {})
          }
        }}
      />

      {/* Confirmation Modal for Suspending / Activating Property */}
      {selectedPropertyForToggle && (
        <Modal
          isOpen={isToggleModalOpen}
          onClose={() => {
            if (!isToggling) {
              setIsToggleModalOpen(false)
              setSelectedPropertyForToggle(null)
            }
          }}
          title={
            selectedPropertyForToggle.is_active
              ? `Suspend "${selectedPropertyForToggle.name}"?`
              : `Reactivate "${selectedPropertyForToggle.name}"?`
          }
          size="md"
        >
          <div className="space-y-4 pt-2">
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                selectedPropertyForToggle.is_active
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              {selectedPropertyForToggle.is_active ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>
                {selectedPropertyForToggle.is_active
                  ? 'All staff tokens for this tenant will be rejected on subsequent requests with 403 Forbidden.'
                  : 'Staff can sign in and resume operations immediately.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsToggleModalOpen(false)
                  setSelectedPropertyForToggle(null)
                }}
                disabled={isToggling}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={selectedPropertyForToggle.is_active ? 'danger' : 'primary'}
                onClick={handleConfirmToggle}
                isLoading={isToggling}
                className="gap-2"
              >
                <Power className="w-4 h-4" />
                <span>
                  {selectedPropertyForToggle.is_active ? 'Confirm Suspension' : 'Confirm Activation'}
                </span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
