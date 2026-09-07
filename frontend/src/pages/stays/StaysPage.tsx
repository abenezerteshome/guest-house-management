import { useState, useEffect, useCallback } from 'react'
import {
  CalendarPlus,
  CreditCard,
  DoorClosed,
  KeyRound,
  RefreshCw,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Badge } from '../../components/common/Badge'
import { Table, type TableColumn } from '../../components/common/Table'
import { ExtendStayModal } from '../../components/modals/ExtendStayModal'
import { RecordPaymentModal } from '../../components/modals/RecordPaymentModal'
import { CheckOutModal } from '../../components/modals/CheckOutModal'
import { CheckInModal } from '../../components/modals/CheckInModal'
import { getStays, getStayFinancialSummary } from '../../api/stays'
import { getRooms } from '../../api/rooms'
import { getGuests } from '../../api/guests'
import type { Stay, Room, Guest, FinancialSummary } from '../../types/api'

interface StayWithDetails extends Stay {
  guest?: Guest
  room?: Room
  summary?: FinancialSummary
}

export function StaysPage() {
  const [stays, setStays] = useState<StayWithDetails[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('CHECKED_IN')
  const [search, setSearch] = useState('')

  // Modals state
  const [extendStayItem, setExtendStayItem] = useState<StayWithDetails | null>(null)
  const [paymentStayItem, setPaymentStayItem] = useState<StayWithDetails | null>(null)
  const [checkoutStayItem, setCheckoutStayItem] = useState<StayWithDetails | null>(null)
  const [checkInOpen, setCheckInOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [staysData, roomsData, guestsData] = await Promise.all([
        getStays(),
        getRooms(),
        getGuests().catch(() => []),
      ])

      const rMap = new Map(roomsData.map((r) => [r.id, r]))
      const gMap = new Map(guestsData.map((g) => [g.id, g]))

      // Load financial summaries for checked-in stays
      const withDetails: StayWithDetails[] = await Promise.all(
        staysData.map(async (stay) => {
          let summary: FinancialSummary | undefined
          if (stay.status === 'CHECKED_IN') {
            try {
              summary = await getStayFinancialSummary(stay.id)
            } catch {
              // ignore summary error
            }
          }
          return {
            ...stay,
            room: rMap.get(stay.room_id),
            guest: gMap.get(stay.guest_id),
            summary,
          }
        })
      )

      setStays(withDetails)
      setRooms(roomsData)
    } catch (err) {
      console.error('Failed to fetch stays:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE')

  const filteredStays = stays.filter((s) => {
    const matchesFilter = filterStatus === 'ALL' || s.status === filterStatus
    const guestName = s.guest?.full_name || ''
    const roomNum = s.room?.room_number || ''
    const matchesSearch =
      guestName.toLowerCase().includes(search.toLowerCase()) ||
      roomNum.includes(search) ||
      String(s.id).includes(search)
    return matchesFilter && matchesSearch
  })

  const checkedInCount = stays.filter((s) => s.status === 'CHECKED_IN').length
  const completedCount = stays.filter((s) => s.status === 'CHECKED_OUT').length

  const columns: TableColumn<StayWithDetails>[] = [
    {
      key: 'id',
      header: 'Stay #',
      render: (s) => <span className="font-mono text-xs font-bold text-neutral-900">#{s.id}</span>,
    },
    {
      key: 'room',
      header: 'Room',
      render: (s) => (
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-[#FF385C]/10 text-[#FF385C]">
            Room {s.room?.room_number || s.room_id}
          </span>
          <p className="text-[11px] text-neutral-500 mt-0.5">{s.room?.room_type || 'Standard'}</p>
        </div>
      ),
    },
    {
      key: 'guest',
      header: 'Guest',
      render: (s) => (
        <div>
          <p className="font-bold text-neutral-900 text-sm">{s.guest?.full_name || `Guest #${s.guest_id}`}</p>
          <p className="text-xs text-neutral-500">{s.guest?.phone || 'No phone'}</p>
        </div>
      ),
    },
    {
      key: 'timeline',
      header: 'Stay Timeline',
      render: (s) => {
        const inDate = new Date(s.check_in_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        const outDate = new Date(s.expected_checkout).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        return (
          <div className="text-xs text-neutral-700">
            <p className="font-medium text-neutral-900">In: {inDate}</p>
            <p className="text-neutral-500">Exp Out: {outDate}</p>
          </div>
        )
      },
    },
    {
      key: 'folio',
      header: 'Folio Balance',
      render: (s) => {
        if (!s.summary) {
          return <span className="text-xs text-neutral-400">—</span>
        }
        const bal = Number(s.summary.balance)
        const total = Number(s.summary.total_due)
        const paid = Number(s.summary.total_paid)

        return (
          <div className="text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <span className={bal > 0 ? 'text-[#FF385C]' : 'text-emerald-600'}>
                {bal > 0 ? `${bal.toLocaleString()} ETB Due` : 'Settled (0 ETB)'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Total {total.toLocaleString()} • Paid {paid.toLocaleString()}
            </p>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <Badge tone={s.status === 'CHECKED_IN' ? 'occupied' : 'neutral'} size="sm">
          {s.status === 'CHECKED_IN' ? 'In House' : 'Checked Out'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => {
        if (s.status === 'CHECKED_IN') {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setExtendStayItem(s)}
                className="gap-1"
                title="Extend stay (+1 day room rate)"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Extend
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setPaymentStayItem(s)}
                className="gap-1"
                title="Record Payment"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Pay
              </Button>
              <Button
                variant="primary"
                size="xs"
                onClick={() => setCheckoutStayItem(s)}
                className="gap-1 bg-neutral-900 hover:bg-neutral-800 text-white"
                title="Check out guest"
              >
                <DoorClosed className="w-3.5 h-3.5" />
                Checkout
              </Button>
            </div>
          )
        }
        return <span className="text-xs text-neutral-400">—</span>
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guest Stays & Folios"
        subtitle="Live resident guests, folio ledgers, stay extensions, and late checkout audits."
        action={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={() => fetchData()} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCheckInOpen(true)}
              className="gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Check In Guest
            </Button>
          </div>
        }
      />

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'CHECKED_IN', label: 'In House (Active)', count: checkedInCount },
            { id: 'CHECKED_OUT', label: 'Completed (Checked Out)', count: completedCount },
            { id: 'ALL', label: 'All Stays', count: stays.length },
          ].map((tab) => {
            const active = filterStatus === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  active
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    active ? 'bg-neutral-700 text-white' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search stay #, guest, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <Table
          columns={columns}
          data={filteredStays}
          keyExtractor={(s) => s.id}
          isLoading={loading}
          emptyMessage="No guest stays found matching this view."
        />
      </div>

      {/* Modals */}
      <ExtendStayModal
        isOpen={Boolean(extendStayItem)}
        onClose={() => setExtendStayItem(null)}
        stay={extendStayItem}
        guestName={extendStayItem?.guest?.full_name}
        roomNumber={extendStayItem?.room?.room_number}
        roomPrice={extendStayItem?.room ? Number(extendStayItem.room.price) : undefined}
        onSuccess={() => fetchData()}
      />

      <RecordPaymentModal
        isOpen={Boolean(paymentStayItem)}
        onClose={() => setPaymentStayItem(null)}
        stayId={paymentStayItem?.id || null}
        guestName={paymentStayItem?.guest?.full_name}
        roomNumber={paymentStayItem?.room?.room_number}
        onSuccess={() => fetchData()}
      />

      <CheckOutModal
        isOpen={Boolean(checkoutStayItem)}
        onClose={() => setCheckoutStayItem(null)}
        stay={checkoutStayItem}
        roomNumber={checkoutStayItem?.room?.room_number}
        onSuccess={() => fetchData()}
      />

      <CheckInModal
        isOpen={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        availableRooms={availableRooms}
        onSuccess={() => fetchData()}
      />
    </div>
  )
}
