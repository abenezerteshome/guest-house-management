import { useState, useEffect, useMemo } from 'react'
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
  AlertCircle,
  Clock,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { AddPropertyModal } from '../../components/modals/AddPropertyModal'
import { getProperties, getSuperAdminStats, togglePropertyStatus } from '../../api/superAdmin'
import { getApiError } from '../../api/client'
import type { Property, SuperAdminStats } from '../../types/api'

export function SuperAdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Status toggle confirmation modal state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  async function loadData() {
    setLoading(true)
    setErrorMsg('')
    try {
      const [propsData, statsData] = await Promise.all([
        getProperties(),
        getSuperAdminStats(),
      ])
      setProperties(propsData)
      setStats(statsData)
    } catch (err) {
      setErrorMsg(getApiError(err, 'Failed to fetch property clients and metrics.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      const matchesSearch =
        prop.name.toLowerCase().includes(search.toLowerCase()) ||
        prop.code.toLowerCase().includes(search.toLowerCase()) ||
        (prop.contact_phone && prop.contact_phone.includes(search))

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && prop.is_active) ||
        (statusFilter === 'SUSPENDED' && !prop.is_active)

      return matchesSearch && matchesStatus
    })
  }, [properties, search, statusFilter])

  function handlePromptToggle(property: Property) {
    setSelectedProperty(property)
    setIsToggleModalOpen(true)
  }

  async function handleConfirmToggle() {
    if (!selectedProperty) return
    setIsToggling(true)
    try {
      const updated = await togglePropertyStatus(selectedProperty.id, !selectedProperty.is_active)
      setProperties((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, is_active: updated.is_active } : p))
      )
      setSuccessMsg(
        `Property "${updated.name}" is now ${updated.is_active ? 'Active' : 'Suspended'}.`
      )
      setTimeout(() => setSuccessMsg(''), 4000)
      setIsToggleModalOpen(false)
      setSelectedProperty(null)
      // refresh stats
      getSuperAdminStats().then(setStats).catch(() => {})
    } catch (err) {
      setErrorMsg(getApiError(err, 'Failed to update property status.'))
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Property Clients & Multi-Tenancy"
          subtitle="Platform-level directory of guest house tenants, account isolation, and one-click access control."
        />
        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard New Property</span>
        </Button>
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

      {/* Platform Metric Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
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

        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3.5 col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xl font-bold text-neutral-900 leading-tight">
              {stats?.total_reservations ?? 0}
            </span>
            <span className="block text-[11px] font-medium text-neutral-500">Total Bookings</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by property name, code, phone..."
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
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
                            <Phone className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{prop.contact_phone}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">No phone logged</span>
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
                        <div className="text-center" title="Reservations">
                          <span className="block font-bold text-neutral-900">
                            {prop.total_reservations ?? 0}
                          </span>
                          <span className="block text-[10px] text-neutral-400">Bookings</span>
                        </div>
                        <div className="w-px h-5 bg-neutral-200" />
                        <div className="text-center" title="Staff Users">
                          <span className="block font-bold text-neutral-900">
                            {prop.total_users ?? 0}
                          </span>
                          <span className="block text-[10px] text-neutral-400">Staff</span>
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
                      <button
                        type="button"
                        onClick={() => handlePromptToggle(prop)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          prop.is_active
                            ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                            : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{prop.is_active ? 'Suspend Access' : 'Activate Access'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Onboard Property Modal */}
      <AddPropertyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadData()
          setSuccessMsg('New property client onboarded and provisioned successfully!')
          setTimeout(() => setSuccessMsg(''), 4000)
        }}
      />

      {/* Confirmation Modal for Suspending / Activating */}
      {selectedProperty && (
        <Modal
          isOpen={isToggleModalOpen}
          onClose={() => {
            if (!isToggling) {
              setIsToggleModalOpen(false)
              setSelectedProperty(null)
            }
          }}
          title={
            selectedProperty.is_active
              ? `Suspend "${selectedProperty.name}"?`
              : `Reactivate "${selectedProperty.name}"?`
          }
          description={
            selectedProperty.is_active
              ? 'Suspending this property will immediately revoke login access for all its receptionists and administrators. Database records will remain preserved.'
              : 'Reactivating this property will immediately restore access for its administrators and staff.'
          }
          size="md"
        >
          <div className="space-y-4 pt-2">
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                selectedProperty.is_active
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              {selectedProperty.is_active ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>
                {selectedProperty.is_active
                  ? 'All staff tokens will be rejected on subsequent requests with 403 Forbidden.'
                  : 'Staff can sign in and resume operations immediately.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsToggleModalOpen(false)
                  setSelectedProperty(null)
                }}
                disabled={isToggling}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={selectedProperty.is_active ? 'danger' : 'primary'}
                onClick={handleConfirmToggle}
                isLoading={isToggling}
                className="gap-2"
              >
                <Power className="w-4 h-4" />
                <span>
                  {selectedProperty.is_active ? 'Confirm Suspension' : 'Confirm Activation'}
                </span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
