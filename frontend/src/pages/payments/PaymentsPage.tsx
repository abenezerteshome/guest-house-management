import { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  CircleDollarSign,
  RefreshCw,
  Receipt,
  Plus,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Badge } from '../../components/common/Badge'
import { Table, type TableColumn } from '../../components/common/Table'
import { KpiCard } from '../../components/common/KpiCard'
import { RecordPaymentModal } from '../../components/modals/RecordPaymentModal'
import { getStays, getStayFinancialSummary } from '../../api/stays'
import { getRooms } from '../../api/rooms'
import { getGuests } from '../../api/guests'
import type { Stay, Room, Guest, FinancialSummary } from '../../types/api'

interface StayBillingItem extends Stay {
  room?: Room
  guest?: Guest
  summary?: FinancialSummary
}

export function PaymentsPage() {
  const [items, setItems] = useState<StayBillingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterBalance, setFilterBalance] = useState<'ALL' | 'UNPAID' | 'SETTLED'>('ALL')

  const [selectedStay, setSelectedStay] = useState<StayBillingItem | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

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

      const withSummaries: StayBillingItem[] = await Promise.all(
        staysData.map(async (s) => {
          let summary: FinancialSummary | undefined
          try {
            summary = await getStayFinancialSummary(s.id)
          } catch {
            // ignore
          }
          return {
            ...s,
            room: rMap.get(s.room_id),
            guest: gMap.get(s.guest_id),
            summary,
          }
        })
      )

      setItems(withSummaries)
    } catch (err) {
      console.error('Failed to load billing records:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalCollected = items.reduce(
    (acc, item) => acc + Number(item.summary?.total_paid || 0),
    0
  )
  const totalOutstanding = items.reduce(
    (acc, item) => acc + Number(item.summary?.balance || 0),
    0
  )
  const unpaidCount = items.filter((item) => Number(item.summary?.balance || 0) > 0).length

  const filteredItems = items.filter((item) => {
    const bal = Number(item.summary?.balance || 0)
    if (filterBalance === 'UNPAID' && bal <= 0) return false
    if (filterBalance === 'SETTLED' && bal > 0) return false

    const q = search.toLowerCase()
    const guestName = item.guest?.full_name || ''
    const roomNum = item.room?.room_number || ''
    return guestName.toLowerCase().includes(q) || roomNum.includes(q) || String(item.id).includes(q)
  })

  const columns: TableColumn<StayBillingItem>[] = [
    {
      key: 'id',
      header: 'Stay #',
      render: (item) => <span className="font-mono text-xs font-bold text-neutral-900">#{item.id}</span>,
    },
    {
      key: 'room',
      header: 'Room',
      render: (item) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-[#FF385C]/10 text-[#FF385C]">
          Room {item.room?.room_number || item.room_id}
        </span>
      ),
    },
    {
      key: 'guest',
      header: 'Guest Name',
      render: (item) => (
        <div>
          <p className="font-bold text-sm text-neutral-900">{item.guest?.full_name || `Guest #${item.guest_id}`}</p>
          <p className="text-xs text-neutral-500">{item.guest?.phone || 'No phone'}</p>
        </div>
      ),
    },
    {
      key: 'charges',
      header: 'Total Charges',
      render: (item) => (
        <span className="text-xs font-semibold text-neutral-800">
          {Number(item.summary?.total_due || 0).toLocaleString()} ETB
        </span>
      ),
    },
    {
      key: 'paid',
      header: 'Amount Paid',
      render: (item) => (
        <span className="text-xs font-bold text-emerald-600">
          {Number(item.summary?.total_paid || 0).toLocaleString()} ETB
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Outstanding Balance',
      render: (item) => {
        const bal = Number(item.summary?.balance || 0)
        return (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              bal > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {bal > 0 ? `${bal.toLocaleString()} ETB Due` : 'Settled'}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Stay Status',
      render: (item) => (
        <Badge tone={item.status === 'CHECKED_IN' ? 'occupied' : 'neutral'} size="sm">
          {item.status === 'CHECKED_IN' ? 'In House' : 'Checked Out'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <Button
          variant="outline"
          size="xs"
          onClick={() => {
            setSelectedStay(item)
            setPaymentModalOpen(true)
          }}
          className="gap-1"
        >
          <Receipt className="w-3.5 h-3.5" />
          Record Payment
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments & Folio Transactions"
        subtitle="Manage guest settlements, view outstanding balances, and record payments via Cash, Telebirr, CBE Birr, Bank or Chapa."
        action={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={() => fetchData()} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const first = items.find((i) => i.status === 'CHECKED_IN') || items[0]
                if (first) {
                  setSelectedStay(first)
                  setPaymentModalOpen(true)
                } else {
                  alert('No stays available.')
                }
              }}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Payment
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Total Settlements Collected"
          value={`${totalCollected.toLocaleString()} ETB`}
          subtitle="Lifetime guest payments received"
          icon={<CircleDollarSign className="w-5 h-5" />}
          tone="success"
        />
        <KpiCard
          title="Total Outstanding Credit"
          value={`${totalOutstanding.toLocaleString()} ETB`}
          subtitle={`${unpaidCount} guest folios with pending balance`}
          icon={<CreditCard className="w-5 h-5" />}
          tone={totalOutstanding > 0 ? 'warning' : 'neutral'}
        />
        <KpiCard
          title="Payment Channels Supported"
          value="5 Methods"
          subtitle="Cash, Telebirr, CBE Birr, Bank, Chapa"
          icon={<Receipt className="w-5 h-5" />}
          tone="neutral"
        />
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          {[
            { id: 'ALL', label: 'All Folios', count: items.length },
            { id: 'UNPAID', label: 'Pending Balance', count: unpaidCount },
            { id: 'SETTLED', label: 'Fully Settled', count: items.length - unpaidCount },
          ].map((tab) => {
            const active = filterBalance === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setFilterBalance(tab.id as typeof filterBalance)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  active
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
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
            placeholder="Search guest, room, stay #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <Table
          columns={columns}
          data={filteredItems}
          keyExtractor={(i) => i.id}
          isLoading={loading}
          emptyMessage="No billing records match your search."
        />
      </div>

      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        stayId={selectedStay?.id || null}
        guestName={selectedStay?.guest?.full_name}
        roomNumber={selectedStay?.room?.room_number}
        onSuccess={() => fetchData()}
      />
    </div>
  )
}
