import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BedDouble,
  CalendarDays,
  CircleDollarSign,
  Download,
  Plus,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { PageHeader } from '../components/common/PageHeader'
import { Button } from '../components/common/Button'
import { RoomCard, type RoomCardData } from '../components/common/RoomCard'
import { Table, type Column } from '../components/common/Table'
import { EmptyState } from '../components/common/StatePanel'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Modal } from '../components/common/Modal'
import { useAuth } from '../hooks/useAuth'
import { getAuditLogs } from '../api/audit'
import type { AuditLog } from '../types/api'

export interface PlaceholderPageProps {
  id?: string
  title: string
  description: string
  icon: LucideIcon
}

export function PlaceholderPage({ id, title, description, icon: Icon }: PlaceholderPageProps) {
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [roomFilter, setRoomFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'>('ALL')
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  // Derive module key from id or title
  const moduleKey = id || title.toLowerCase()

  useEffect(() => {
    if (!moduleKey.includes('audit')) return
    setAuditLoading(true)
    getAuditLogs()
      .then(setAuditLogs)
      .catch(() => setAuditLogs([]))
      .finally(() => setAuditLoading(false))
  }, [moduleKey])

  // Sample architectural room models for the Rooms view
  const sampleRooms: RoomCardData[] = [
    {
      id: '101',
      roomNumber: 'Room 101',
      roomType: 'Deluxe King Suite',
      pricePerNight: 1800,
      status: 'AVAILABLE',
      capacity: 2,
      bedType: '1 King Bed',
    },
    {
      id: '102',
      roomNumber: 'Room 102',
      roomType: 'Classic Queen Suite',
      pricePerNight: 1400,
      status: 'OCCUPIED',
      capacity: 2,
      bedType: '1 Queen Bed',
    },
    {
      id: '103',
      roomNumber: 'Room 103',
      roomType: 'Garden Twin Studio',
      pricePerNight: 1600,
      status: 'CLEANING',
      capacity: 2,
      bedType: '2 Single Beds',
    },
    {
      id: '201',
      roomNumber: 'Room 201',
      roomType: 'Executive Balcony Suite',
      pricePerNight: 2400,
      status: 'AVAILABLE',
      capacity: 3,
      bedType: '1 King Bed + 1 Sofa',
    },
    {
      id: '202',
      roomNumber: 'Room 202',
      roomType: 'Standard Double',
      pricePerNight: 1200,
      status: 'MAINTENANCE',
      capacity: 2,
      bedType: '1 Double Bed',
    },
    {
      id: '203',
      roomNumber: 'Room 203',
      roomType: 'Penthouse Panorama',
      pricePerNight: 3200,
      status: 'RESERVED',
      capacity: 4,
      bedType: '2 King Beds',
    },
  ]

  const filteredRooms = sampleRooms.filter((r) => {
    if (roomFilter === 'ALL') return true
    return r.status === roomFilter
  })

  // Module-specific renders
  const renderModuleContent = () => {
    if (moduleKey.includes('room')) {
      return (
        <div className="space-y-6">
          {/* Room Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#F7F7F7] rounded-2xl border border-[#DDDDDD]">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['ALL', 'AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setRoomFilter(filter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    roomFilter === filter
                      ? 'bg-white text-[#222222] shadow-xs'
                      : 'text-[#717171] hover:text-[#222222]'
                  }`}
                >
                  {filter === 'ALL' ? 'All Rooms' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="text-xs text-[#717171] px-3">
              Showing {filteredRooms.length} room layouts
            </div>
          </div>

          {/* Grid of Room Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                actionSlot={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalOpen(true)}
                  >
                    Manage
                  </Button>
                }
              />
            ))}
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#DDDDDD] text-center text-xs text-[#717171]">
            <span className="font-semibold text-[#222222]">Phase 5.1 Architecture:</span>{' '}
            Visual property cards ready. Live room statuses will connect to the room repository in Phase 5.2.
          </div>
        </div>
      )
    }

    if (moduleKey.includes('reservation')) {
      const reservationColumns: Column<Record<string, unknown>>[] = [
        { header: 'Reservation ID', accessorKey: 'code' },
        { header: 'Guest Name', accessorKey: 'guest' },
        { header: 'Room Type', accessorKey: 'room' },
        { header: 'Dates', accessorKey: 'dates' },
        { header: 'Nights', accessorKey: 'nights' },
        {
          header: 'Status',
          cell: () => <Badge tone="expected">Expected</Badge>,
        },
        { header: 'Total (ETB)', accessorKey: 'total', align: 'right' },
      ]

      return (
        <div className="space-y-6">
          <Table
            columns={reservationColumns}
            data={[]}
            emptyMessage="No reservations found."
          />
          <EmptyState
            title="No reservations yet"
            description="Reservations will appear here when guests are booked. Create your first guest booking to get started."
            actionLabel="Create reservation"
            onAction={() => setModalOpen(true)}
          />
        </div>
      )
    }

    if (moduleKey.includes('guest')) {
      const guestColumns: Column<Record<string, unknown>>[] = [
        { header: 'Full Name', accessorKey: 'name' },
        { header: 'Phone Number', accessorKey: 'phone' },
        { header: 'ID / Passport #', accessorKey: 'idDoc' },
        { header: 'Total Stays', accessorKey: 'stays' },
        { header: 'Status', cell: () => <Badge tone="available">Registered</Badge> },
      ]

      return (
        <div className="space-y-6">
          <Table
            columns={guestColumns}
            data={[]}
            emptyMessage="No guests registered."
          />
          <EmptyState
            title="No guests registered yet"
            description="Guest files with contact info and government IDs will be stored here during check-in."
            actionLabel="Register new guest"
            onAction={() => setModalOpen(true)}
          />
        </div>
      )
    }

    if (moduleKey.includes('stay')) {
      const stayColumns: Column<Record<string, unknown>>[] = [
        { header: 'Stay Reference', accessorKey: 'stayRef' },
        { header: 'Guest', accessorKey: 'guest' },
        { header: 'Room Assigned', accessorKey: 'room' },
        { header: 'Check-in Time', accessorKey: 'checkin' },
        { header: 'Balance (ETB)', accessorKey: 'balance', align: 'right' },
        { header: 'Status', cell: () => <Badge tone="occupied">In-House</Badge> },
      ]

      return (
        <div className="space-y-6">
          <Table
            columns={stayColumns}
            data={[]}
            emptyMessage="No active stays."
          />
          <EmptyState
            title="No active stays at the moment"
            description="Checked-in guests, occupied rooms, and room keys will be actively monitored here."
            actionLabel="Check in guest"
            onAction={() => setModalOpen(true)}
          />
        </div>
      )
    }

    if (moduleKey.includes('payment')) {
      const paymentColumns: Column<Record<string, unknown>>[] = [
        { header: 'Receipt #', accessorKey: 'receipt' },
        { header: 'Date & Time', accessorKey: 'date' },
        { header: 'Stay / Guest', accessorKey: 'guest' },
        { header: 'Method', accessorKey: 'method' },
        { header: 'Amount (ETB)', accessorKey: 'amount', align: 'right' },
        { header: 'Status', cell: () => <Badge tone="available">Verified</Badge> },
      ]

      return (
        <div className="space-y-6">
          <Table
            columns={paymentColumns}
            data={[]}
            emptyMessage="No payments recorded."
          />
          <EmptyState
            title="No payments recorded yet"
            description="Cash receipts, mobile money, and bank transfer settlements will be listed here."
            actionLabel="Record payment"
            onAction={() => setModalOpen(true)}
          />
        </div>
      )
    }

    if (moduleKey.includes('expense')) {
      const expenseColumns: Column<Record<string, unknown>>[] = [
        { header: 'Voucher #', accessorKey: 'voucher' },
        { header: 'Date', accessorKey: 'date' },
        { header: 'Category', accessorKey: 'category' },
        { header: 'Description', accessorKey: 'desc' },
        { header: 'Amount (ETB)', accessorKey: 'amount', align: 'right' },
        { header: 'Recorded By', accessorKey: 'staff' },
      ]

      return (
        <div className="space-y-6">
          <Table
            columns={expenseColumns}
            data={[]}
            emptyMessage="No expenses recorded."
          />
          <EmptyState
            title="No expenses logged yet"
            description="Track operational expenses, utility bills, maintenance fees, and supplies."
            actionLabel="Record expense"
            onAction={() => setModalOpen(true)}
          />
        </div>
      )
    }

    if (moduleKey.includes('report')) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card hover padding="md" onClick={() => setModalOpen(true)}>
              <div className="w-10 h-10 rounded-xl bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center mb-3">
                <CircleDollarSign size={20} />
              </div>
              <h3 className="text-sm font-semibold text-[#222222]">Revenue Summary</h3>
              <p className="text-xs text-[#717171] mt-1">Daily & monthly income vs expenses breakdown.</p>
              <div className="mt-4 pt-3 border-t border-[#F0F0F0] text-xs font-semibold text-[#FF385C] flex items-center gap-1">
                <Download size={13} /> Export PDF / CSV
              </div>
            </Card>

            <Card hover padding="md" onClick={() => setModalOpen(true)}>
              <div className="w-10 h-10 rounded-xl bg-[#EBF9EB] text-[#008A05] flex items-center justify-center mb-3">
                <BedDouble size={20} />
              </div>
              <h3 className="text-sm font-semibold text-[#222222]">Occupancy & RevPAR</h3>
              <p className="text-xs text-[#717171] mt-1">Room utilization percentage and average daily rates.</p>
              <div className="mt-4 pt-3 border-t border-[#F0F0F0] text-xs font-semibold text-[#008A05] flex items-center gap-1">
                <Download size={13} /> Export PDF / CSV
              </div>
            </Card>

            <Card hover padding="md" onClick={() => setModalOpen(true)}>
              <div className="w-10 h-10 rounded-xl bg-[#FFF6EB] text-[#C76A00] flex items-center justify-center mb-3">
                <CalendarDays size={20} />
              </div>
              <h3 className="text-sm font-semibold text-[#222222]">Stay Duration & Demographics</h3>
              <p className="text-xs text-[#717171] mt-1">Average guest stay length and repeat guest rates.</p>
              <div className="mt-4 pt-3 border-t border-[#F0F0F0] text-xs font-semibold text-[#C76A00] flex items-center gap-1">
                <Download size={13} /> Export PDF / CSV
              </div>
            </Card>

            <Card hover padding="md" onClick={() => setModalOpen(true)}>
              <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] text-[#0073E6] flex items-center justify-center mb-3">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-sm font-semibold text-[#222222]">Tax & Compliance Statement</h3>
              <p className="text-xs text-[#717171] mt-1">Ethiopian Birr tax schedules and invoice records.</p>
              <div className="mt-4 pt-3 border-t border-[#F0F0F0] text-xs font-semibold text-[#0073E6] flex items-center gap-1">
                <Download size={13} /> Export PDF / CSV
              </div>
            </Card>
          </div>

          <EmptyState
            title="Reporting engine ready"
            description="Historical reporting queries will compute live metrics from the database in Phase 5.2."
          />
        </div>
      )
    }

    if (moduleKey.includes('user')) {
      interface StaffUser {
        name: string
        username: string
        role: string
        status: string
      }
      const userColumns: Column<StaffUser>[] = [
        { header: 'Full Name', accessorKey: 'name' },
        { header: 'Username', accessorKey: 'username' },
        {
          header: 'Role',
          cell: (item: StaffUser) => (
            <Badge tone={item.role === 'ADMIN' ? 'occupied' : 'info'}>
              {item.role === 'ADMIN' ? 'Administrator' : 'Receptionist'}
            </Badge>
          ),
        },
        {
          header: 'Status',
          cell: () => <Badge tone="available">Active Staff</Badge>,
        },
      ]

      const staffData = [
        {
          name: user?.full_name || 'System Administrator',
          username: user?.username || 'admin',
          role: user?.role || 'ADMIN',
          status: 'Active',
        },
        {
          name: 'Reception Desk Staff',
          username: 'reception',
          role: 'RECEPTION',
          status: 'Active',
        },
      ]

      return (
        <div className="space-y-6">
          <Table
            columns={userColumns}
            data={staffData}
          />
          <div className="p-4 bg-white rounded-2xl border border-[#DDDDDD] text-center text-xs text-[#717171]">
            Role-Based Access Control active: Administrators have complete management controls; Receptionists have desk-focused operations.
          </div>
        </div>
      )
    }

    if (moduleKey.includes('audit')) {
      const auditColumns: Column<AuditLog>[] = [
        {
          header: 'Timestamp',
          render: (item) => new Date(item.timestamp).toLocaleString(),
        },
        { header: 'Staff Actor', render: (item) => item.actor_name || 'System' },
        { header: 'Action', accessorKey: 'action' },
        {
          header: 'Entity',
          render: (item) => `${item.entity_type} #${item.entity_id}`,
        },
        { header: 'Result', cell: () => <Badge tone="available">Success</Badge> },
      ]

      return (
        <div className="space-y-6">
          <Table
            columns={auditColumns}
            data={auditLogs}
            isLoading={auditLoading}
            emptyMessage="No audit logs recorded."
          />
          <EmptyState
            title="Audit trail active"
            description="Critical operational, financial, and room state changes are persistently logged by the backend."
          />
        </div>
      )
    }

    if (moduleKey.includes('setting')) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card padding="md">
            <h3 className="text-base font-semibold text-[#222222] mb-1">Property Profile</h3>
            <p className="text-xs text-[#717171] mb-4">Core guest house attributes and local business identity.</p>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F7F7F7] rounded-xl border border-[#EEEEEE] flex justify-between">
                <span className="text-[#717171]">Property Name</span>
                <span className="font-semibold text-[#222222]">Haven House</span>
              </div>
              <div className="p-3 bg-[#F7F7F7] rounded-xl border border-[#EEEEEE] flex justify-between">
                <span className="text-[#717171]">Base Currency</span>
                <span className="font-semibold text-[#222222]">ETB (Ethiopian Birr)</span>
              </div>
              <div className="p-3 bg-[#F7F7F7] rounded-xl border border-[#EEEEEE] flex justify-between">
                <span className="text-[#717171]">Timezone</span>
                <span className="font-semibold text-[#222222]">Africa/Addis_Ababa (UTC+3)</span>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <h3 className="text-base font-semibold text-[#222222] mb-1">Operational Policies</h3>
            <p className="text-xs text-[#717171] mb-4">Standard front-desk deadlines and grace periods.</p>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F7F7F7] rounded-xl border border-[#EEEEEE] flex justify-between">
                <span className="text-[#717171]">Check-in Standard</span>
                <span className="font-semibold text-[#222222]">02:00 PM</span>
              </div>
              <div className="p-3 bg-[#F7F7F7] rounded-xl border border-[#EEEEEE] flex justify-between">
                <span className="text-[#717171]">Checkout Standard</span>
                <span className="font-semibold text-[#222222]">11:00 AM</span>
              </div>
              <div className="p-3 bg-[#F7F7F7] rounded-xl border border-[#EEEEEE] flex justify-between">
                <span className="text-[#717171]">Late Checkout Penalty</span>
                <span className="font-semibold text-[#222222]">ETB 600.00 / hour</span>
              </div>
            </div>
          </Card>
        </div>
      )
    }

    // Default fallback
    return (
      <Card padding="lg">
        <EmptyState
          icon={<Icon size={24} className="text-[#FF385C]" />}
          title={`${title} Module Ready`}
          description={description}
          actionLabel="Open options"
          onAction={() => setModalOpen(true)}
        />
      </Card>
    )
  }

  // Derive contextual action button
  const getHeaderActions = () => {
    if (moduleKey.includes('room')) {
      return (
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={15} />}
          onClick={() => setModalOpen(true)}
        >
          + Add Room
        </Button>
      )
    }
    if (moduleKey.includes('reservation')) {
      return (
        <Button
          variant="primary"
          size="sm"
          leftIcon={<CalendarDays size={15} />}
          onClick={() => setModalOpen(true)}
        >
          + New Reservation
        </Button>
      )
    }
    if (moduleKey.includes('guest')) {
      return (
        <Button
          variant="primary"
          size="sm"
          leftIcon={<UserPlus size={15} />}
          onClick={() => setModalOpen(true)}
        >
          + Add Guest
        </Button>
      )
    }
    if (moduleKey.includes('payment')) {
      return (
        <Button
          variant="primary"
          size="sm"
          leftIcon={<CircleDollarSign size={15} />}
          onClick={() => setModalOpen(true)}
        >
          + Record Payment
        </Button>
      )
    }
    if (moduleKey.includes('expense')) {
      return (
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={15} />}
          onClick={() => setModalOpen(true)}
        >
          + Record Expense
        </Button>
      )
    }
    return undefined
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        kicker="Hospitality Operations"
        title={title}
        description={description}
        actions={getHeaderActions()}
      />

      {renderModuleContent()}

      {/* Action preview modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${title} Action`}
        description="Phase 5.1 Hospitality UI Redesign"
      >
        <div className="space-y-3 text-xs text-[#717171]">
          <p className="leading-relaxed">
            This module has been upgraded to the modern Airbnb-inspired hospitality design system. The form modals and interactive mutations will connect to backend endpoints in Phase 5.2.
          </p>
          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}