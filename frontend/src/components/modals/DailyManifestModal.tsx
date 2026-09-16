import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Printer,
  Calendar,
  Users,
  CheckCircle2,
  LogOut,
  Clock,
  Search,
  RefreshCw,
  Sparkles,
  CreditCard,
  Building,
  Phone,
  FileSpreadsheet,
} from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { getDailyManifest } from '../../api/reports'
import type { DailyManifestReport, DailyManifestItem } from '../../types/api'
import { useAuth } from '../../hooks/useAuth'

interface DailyManifestModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: string
}

type FilterActivity = 'ALL' | 'CHECKED_IN' | 'CHECKED_OUT' | 'RESERVED'

export function DailyManifestModal({
  isOpen,
  onClose,
  initialDate,
}: DailyManifestModalProps) {
  const { user } = useAuth()
  const [targetDate, setTargetDate] = useState<string>(() => {
    return initialDate || new Date().toISOString().slice(0, 10)
  })
  const [report, setReport] = useState<DailyManifestReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activityFilter, setActivityFilter] = useState<FilterActivity>('ALL')

  const fetchManifest = useCallback(async (dateToFetch: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDailyManifest(dateToFetch)
      setReport(data)
    } catch (err: unknown) {
      console.error('Failed to load daily manifest:', err)
      setError('Unable to load guest manifest data. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchManifest(targetDate)
    }
  }, [isOpen, targetDate, fetchManifest])

  const filteredItems = useMemo(() => {
    if (!report) return []
    return report.items.filter((item) => {
      // Activity filter
      if (activityFilter !== 'ALL' && item.activity_type !== activityFilter) {
        return false
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const nameMatch = item.guest_name.toLowerCase().includes(query)
        const phoneMatch = item.guest_phone.toLowerCase().includes(query)
        const roomMatch = item.room_number.toLowerCase().includes(query)
        const idMatch = (item.guest_id_number || '').toLowerCase().includes(query)
        return nameMatch || phoneMatch || roomMatch || idMatch
      }
      return true
    })
  }, [report, activityFilter, searchQuery])

  const handlePrint = () => {
    window.print()
  }

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return `${(num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`
  }

  const formatDateTime = (dtStr?: string | null) => {
    if (!dtStr) return '—'
    try {
      const d = new Date(dtStr)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dtStr
    }
  }

  const formatDateLabel = (dtStr?: string | null) => {
    if (!dtStr) return '—'
    try {
      const d = new Date(dtStr)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return dtStr
    }
  }

  const exportCSV = () => {
    if (!filteredItems.length) return
    const headers = [
      'Activity',
      'Guest Name',
      'Phone',
      'ID Number',
      'Room',
      'Room Type',
      'Days Count',
      'Amount Paid (ETB)',
      'Total Expected (ETB)',
      'Check-In Date',
      'Check-Out Date',
      'Status',
      'Notes',
    ]

    const rows = filteredItems.map((item) => [
      `"${item.activity_type}"`,
      `"${item.guest_name.replace(/"/g, '""')}"`,
      `"${item.guest_phone}"`,
      `"${item.guest_id_number || ''}"`,
      `"${item.room_number}"`,
      `"${item.room_type || ''}"`,
      item.days_count,
      item.amount_paid,
      item.expected_amount,
      `"${item.check_in_date || ''}"`,
      `"${item.checkout_date || ''}"`,
      `"${item.status}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Daily_Guest_Manifest_${targetDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      {/* Inline styles for clean print handling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #manifest-printable-area, #manifest-printable-area * {
            visibility: visible;
          }
          #manifest-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 16px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Today's Guest Activity & Manifest"
        description="Daily overview of checked in, checked out, and reserved guests with stay durations and payment tracking."
        size="5xl"
        footer={
          <div className="flex items-center justify-between w-full no-print">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                disabled={!filteredItems.length}
                className="gap-1.5 text-xs text-stone-700 hover:bg-stone-100"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                Export CSV
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                size="sm"
              >
                Close
              </Button>
              <Button
                onClick={handlePrint}
                size="sm"
                className="gap-1.5 bg-stone-900 hover:bg-stone-800 text-white font-medium shadow-sm"
              >
                <Printer size={15} />
                Print Manifest
              </Button>
            </div>
          </div>
        }
      >
        <div id="manifest-printable-area" className="space-y-5">
          {/* PRINT-ONLY OFFICIAL HEADER */}
          <div className="print-only border-b-2 border-stone-800 pb-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wider text-stone-900">
                  Family Guest House
                </h1>
                <p className="text-sm font-semibold text-stone-600">
                  Daily Guest Manifest & Shift Audit Report
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Official Logbook Record of Guest Check-Ins, Check-Outs & Reservations
                </p>
              </div>
              <div className="text-right text-xs text-stone-700">
                <p className="font-bold text-stone-900">Manifest Date: {targetDate}</p>
                <p>Printed: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                <p>Staff: {user?.full_name || user?.username || 'Reception'}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-stone-200 text-center">
              <div className="p-2 border border-stone-300 rounded">
                <p className="text-[10px] uppercase font-bold text-stone-500">Total Checked In</p>
                <p className="text-base font-bold text-stone-900">{report?.checked_in_count || 0}</p>
              </div>
              <div className="p-2 border border-stone-300 rounded">
                <p className="text-[10px] uppercase font-bold text-stone-500">Total Checked Out</p>
                <p className="text-base font-bold text-stone-900">{report?.checked_out_count || 0}</p>
              </div>
              <div className="p-2 border border-stone-300 rounded">
                <p className="text-[10px] uppercase font-bold text-stone-500">Total Reserved</p>
                <p className="text-base font-bold text-stone-900">{report?.reserved_count || 0}</p>
              </div>
              <div className="p-2 border border-stone-300 rounded bg-stone-50">
                <p className="text-[10px] uppercase font-bold text-stone-500">Total Collected</p>
                <p className="text-base font-bold text-stone-900">{formatCurrency(report?.total_amount_paid || 0)}</p>
              </div>
            </div>
          </div>

          {/* SCREEN CONTROLS & DATE SELECTOR */}
          <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200/80">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                <Calendar size={15} className="text-rose-600" />
                Target Date:
              </div>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="text-xs font-medium bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500 text-stone-800 shadow-xs"
              />
              <button
                onClick={() => setTargetDate(new Date().toISOString().slice(0, 10))}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => fetchManifest(targetDate)}
                title="Refresh Manifest"
                className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-white rounded-lg transition-colors"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search guest, phone, room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-stone-800 shadow-xs"
                />
              </div>
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs px-3 py-1.5 shadow-xs"
              >
                <Printer size={14} />
                Print
              </Button>
            </div>
          </div>

          {/* SCREEN KPI SUMMARY CARDS */}
          <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Checked In</span>
                <span className="p-1 rounded-md bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={15} />
                </span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-950">{report?.checked_in_count || 0}</p>
                <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Arrived & on-site today</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Checked Out</span>
                <span className="p-1 rounded-md bg-blue-100 text-blue-700">
                  <LogOut size={15} />
                </span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-950">{report?.checked_out_count || 0}</p>
                <p className="text-[10px] text-blue-700 font-medium mt-0.5">Departed today</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Reserved</span>
                <span className="p-1 rounded-md bg-amber-100 text-amber-700">
                  <Clock size={15} />
                </span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-amber-950">{report?.reserved_count || 0}</p>
                <p className="text-[10px] text-amber-700 font-medium mt-0.5">Expected arrivals</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Total Collected</span>
                <span className="p-1 rounded-md bg-rose-100 text-rose-700">
                  <CreditCard size={15} />
                </span>
              </div>
              <div className="mt-2">
                <p className="text-lg sm:text-xl font-extrabold text-rose-950 truncate">
                  {formatCurrency(report?.total_amount_paid || 0)}
                </p>
                <p className="text-[10px] text-rose-700 font-medium mt-0.5">Paid on today's stays</p>
              </div>
            </div>
          </div>

          {/* SCREEN FILTER TABS */}
          <div className="no-print flex items-center gap-1.5 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActivityFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activityFilter === 'ALL'
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Users size={14} />
              All Guests ({report?.total_guests_count || 0})
            </button>
            <button
              onClick={() => setActivityFilter('CHECKED_IN')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activityFilter === 'CHECKED_IN'
                  ? 'bg-emerald-700 text-white font-semibold'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <CheckCircle2 size={14} className="text-emerald-400" />
              Checked In ({report?.checked_in_count || 0})
            </button>
            <button
              onClick={() => setActivityFilter('CHECKED_OUT')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activityFilter === 'CHECKED_OUT'
                  ? 'bg-blue-700 text-white font-semibold'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <LogOut size={14} className="text-blue-400" />
              Checked Out ({report?.checked_out_count || 0})
            </button>
            <button
              onClick={() => setActivityFilter('RESERVED')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activityFilter === 'RESERVED'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Clock size={14} className="text-amber-300" />
              Reserved ({report?.reserved_count || 0})
            </button>
          </div>

          {/* ERROR OR LOADING STATE */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => fetchManifest(targetDate)}
                className="underline font-semibold hover:text-red-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* GUEST MANIFEST TABLE */}
          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100/80 text-stone-700 font-bold uppercase text-[11px] border-b border-stone-200">
                  <th className="py-2.5 px-3">Activity</th>
                  <th className="py-2.5 px-3">Guest Information</th>
                  <th className="py-2.5 px-3">Room</th>
                  <th className="py-2.5 px-3">Duration (Stay)</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  <th className="py-2.5 px-3 text-right">Total Expected</th>
                  <th className="py-2.5 px-3">Status & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={22} className="animate-spin text-rose-500" />
                        <span className="text-xs font-medium">Loading guest manifest for {targetDate}...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-stone-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Users size={28} className="text-stone-300" />
                        <p className="text-xs font-medium text-stone-600">No guest activities recorded for this date</p>
                        <p className="text-[11px] text-stone-400">
                          Try choosing another date or adjusting your search filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isCheckedIn = item.activity_type === 'CHECKED_IN'
                    const isCheckedOut = item.activity_type === 'CHECKED_OUT'
                    const isReserved = item.activity_type === 'RESERVED'

                    return (
                      <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                        {/* Activity Badge */}
                        <td className="py-2.5 px-3 align-top">
                          {isCheckedIn && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 size={11} />
                              Checked In
                            </span>
                          )}
                          {isCheckedOut && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              <LogOut size={11} />
                              Checked Out
                            </span>
                          )}
                          {isReserved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock size={11} />
                              Reserved
                            </span>
                          )}
                        </td>

                        {/* Guest Info */}
                        <td className="py-2.5 px-3 align-top">
                          <p className="font-bold text-stone-900 leading-snug">{item.guest_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500">
                            <span className="flex items-center gap-1">
                              <Phone size={10} />
                              {item.guest_phone}
                            </span>
                            {item.guest_id_number && (
                              <span className="text-stone-400">ID: {item.guest_id_number}</span>
                            )}
                          </div>
                        </td>

                        {/* Room */}
                        <td className="py-2.5 px-3 align-top">
                          <div className="flex items-center gap-1 font-bold text-stone-800">
                            <Building size={12} className="text-stone-400" />
                            Room {item.room_number}
                          </div>
                          {item.room_type && (
                            <p className="text-[10px] text-stone-500 font-medium mt-0.5">
                              {item.room_type}
                            </p>
                          )}
                        </td>

                        {/* Stay Duration */}
                        <td className="py-2.5 px-3 align-top">
                          <div className="flex items-center gap-1 font-semibold text-stone-900">
                            <Sparkles size={11} className="text-amber-500" />
                            {item.days_count} {item.days_count === 1 ? 'Day / Night' : 'Days / Nights'}
                          </div>
                          <p className="text-[10px] text-stone-500 mt-0.5">
                            {formatDateLabel(item.check_in_date)} &rarr; {formatDateLabel(item.checkout_date)}
                          </p>
                        </td>

                        {/* Amount Paid */}
                        <td className="py-2.5 px-3 align-top text-right">
                          <span
                            className={`font-bold ${
                              parseFloat(String(item.amount_paid)) > 0
                                ? 'text-emerald-700 font-mono text-[12px]'
                                : 'text-stone-400 font-mono text-[11px]'
                            }`}
                          >
                            {formatCurrency(item.amount_paid)}
                          </span>
                        </td>

                        {/* Total Expected */}
                        <td className="py-2.5 px-3 align-top text-right">
                          <span className="font-semibold text-stone-700 font-mono text-[11px]">
                            {formatCurrency(item.expected_amount)}
                          </span>
                        </td>

                        {/* Status & Time */}
                        <td className="py-2.5 px-3 align-top">
                          <p className="text-[11px] font-medium text-stone-700">
                            {isCheckedIn && `In: ${formatDateTime(item.check_in_date)}`}
                            {isCheckedOut && `Out: ${formatDateTime(item.checkout_date)}`}
                            {isReserved && `Due: ${formatDateTime(item.check_in_date)}`}
                          </p>
                          {item.notes && (
                            <p className="text-[10px] text-stone-400 italic truncate max-w-[140px] mt-0.5" title={item.notes}>
                              {item.notes}
                            </p>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot>
                  <tr className="bg-stone-100 font-bold border-t-2 border-stone-300 text-stone-900">
                    <td colSpan={4} className="py-2 px-3 text-right">
                      Total for Manifest Page:
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-800 font-mono text-sm">
                      {formatCurrency(
                        filteredItems.reduce((acc, curr) => acc + parseFloat(String(curr.amount_paid || 0)), 0)
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-stone-800 font-mono text-sm">
                      {formatCurrency(
                        filteredItems.reduce((acc, curr) => acc + parseFloat(String(curr.expected_amount || 0)), 0)
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* PRINT-ONLY SIGNATURE BLOCK & AUDIT VERIFICATION */}
          <div className="print-only pt-8 mt-8 border-t-2 border-stone-800">
            <div className="grid grid-cols-2 gap-12 text-xs">
              <div className="space-y-4">
                <p className="font-bold text-stone-900 uppercase">Prepared & Audited By Receptionist:</p>
                <div className="pt-8 border-b border-stone-400"></div>
                <div className="flex justify-between text-[11px] text-stone-600">
                  <span>Name: {user?.full_name || 'Staff Member'}</span>
                  <span>Signature</span>
                  <span>Date</span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="font-bold text-stone-900 uppercase">Verified By Duty Manager / Admin:</p>
                <div className="pt-8 border-b border-stone-400"></div>
                <div className="flex justify-between text-[11px] text-stone-600">
                  <span>Manager Name</span>
                  <span>Signature</span>
                  <span>Date</span>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center text-[10px] text-stone-500 border-t border-stone-200 pt-2">
              Family Guest House Management System &bull; Confidential Internal Shift Audit Report &bull; Page 1 of 1
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
