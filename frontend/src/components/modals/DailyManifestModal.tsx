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
  BedDouble,
  ShieldCheck,
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

type FilterActivity = 'ALL' | 'CHECKED_IN' | 'CHECKED_OUT' | 'OCCUPIED' | 'RESERVED'

export function DailyManifestModal({
  isOpen,
  onClose,
  initialDate,
}: DailyManifestModalProps) {
  const { user } = useAuth()
  const isReception = user?.role === 'RECEPTION'
  const [manifestType, setManifestType] = useState<'POLICE' | 'AUDIT'>('POLICE')
  const effectiveType = isReception ? 'POLICE' : manifestType
  const showFinancials = effectiveType === 'AUDIT'

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

  const handlePrint = () => {
    const isPolice = effectiveType === 'POLICE'
    const totalExpected = filteredItems.reduce(
      (sum, item) => sum + (parseFloat(String(item.expected_amount)) || 0),
      0
    )
    const totalPaid = filteredItems.reduce(
      (sum, item) => sum + (parseFloat(String(item.amount_paid)) || 0),
      0
    )

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      window.print()
      return
    }

    const rowsHtml = filteredItems
      .map((item, idx) => {
        let badgeColor = '#065f46'
        let badgeBg = '#ecfdf5'
        let badgeBorder = '#a7f3d0'
        let badgeText = 'CHECKED IN'

        if (item.activity_type === 'CHECKED_OUT') {
          badgeColor = '#1e40af'
          badgeBg = '#eff6ff'
          badgeBorder = '#bfdbfe'
          badgeText = 'CHECKED OUT'
        } else if (item.activity_type === 'OCCUPIED') {
          badgeColor = '#6b21a8'
          badgeBg = '#faf5ff'
          badgeBorder = '#e9d5ff'
          badgeText = 'IN-HOUSE'
        } else if (item.activity_type === 'RESERVED') {
          badgeColor = '#92400e'
          badgeBg = '#fffbeb'
          badgeBorder = '#fde68a'
          badgeText = 'RESERVED'
        }

        const paidNum = parseFloat(String(item.amount_paid)) || 0

        if (isPolice) {
          return `
            <tr style="border-bottom: 1px solid #e5e7eb; ${idx % 2 === 1 ? 'background-color: #f9fafb;' : 'background-color: #ffffff;'}">
              <td style="padding: 7px 8px; font-size: 11px; vertical-align: middle; text-align: center; font-weight: 700; color: #4b5563;">
                ${idx + 1}
              </td>
              <td style="padding: 7px 8px; font-size: 11px; vertical-align: middle;">
                <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-weight: 700; font-size: 9px; letter-spacing: 0.5px; color: ${badgeColor}; background: ${badgeBg}; border: 1px solid ${badgeBorder};">
                  ${badgeText}
                </span>
              </td>
              <td style="padding: 7px 8px; font-size: 11px; vertical-align: top;">
                <div style="font-weight: 800; color: #111827; font-size: 12px;">${item.guest_name}</div>
                <div style="color: #4b5563; font-size: 10px; margin-top: 2px;">
                  Tel: ${item.guest_phone || '—'}
                </div>
              </td>
              <td style="padding: 7px 8px; font-size: 11px; vertical-align: top; font-weight: 600; color: #111827;">
                ${item.guest_id_number ? `<span style="font-family: monospace; font-size: 11px; font-weight: 700;">${item.guest_id_number}</span>` : '<span style="color: #9ca3af; font-style: italic; font-size: 10px;">Not Provided</span>'}
              </td>
              <td style="padding: 7px 8px; font-size: 11px; vertical-align: top;">
                <div style="font-weight: 800; color: #111827;">Room ${item.room_number}</div>
                <div style="color: #6b7280; font-size: 10px;">${item.room_type || 'Standard'}</div>
              </td>
              <td style="padding: 7px 8px; font-size: 11px; vertical-align: top;">
                <div style="font-weight: 600; color: #111827;">${formatDateLabel(item.check_in_date)}</div>
                <div style="color: #6b7280; font-size: 9px;">${formatDateTime(item.check_in_date)}</div>
              </td>
              <td style="padding: 7px 8px; font-size: 11px; vertical-align: top;">
                <div style="font-weight: 600; color: #111827;">${formatDateLabel(item.checkout_date)}</div>
                <div style="color: #6b7280; font-size: 9px;">${formatDateTime(item.checkout_date)}</div>
              </td>
              <td style="padding: 7px 8px; font-size: 11px; vertical-align: top; text-align: center; font-weight: 800; color: #111827;">
                ${item.days_count} ${item.days_count === 1 ? 'Night' : 'Nights'}
              </td>
              <td style="padding: 7px 8px; font-size: 10px; vertical-align: top; color: #4b5563;">
                <div style="font-weight: 700; text-transform: uppercase;">${item.status}</div>
                ${item.notes ? `<div style="color: #6b7280; font-style: italic; font-size: 9px; margin-top: 1px;">${item.notes}</div>` : ''}
              </td>
            </tr>
          `
        }

        return `
          <tr style="border-bottom: 1px solid #e5e7eb; ${idx % 2 === 1 ? 'background-color: #f9fafb;' : 'background-color: #ffffff;'}">
            <td style="padding: 8px 10px; font-size: 11px; vertical-align: top;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 9px; letter-spacing: 0.5px; color: ${badgeColor}; background: ${badgeBg}; border: 1px solid ${badgeBorder};">
                ${badgeText}
              </span>
            </td>
            <td style="padding: 8px 10px; font-size: 11px; vertical-align: top;">
              <div style="font-weight: 700; color: #111827; font-size: 12px;">${item.guest_name}</div>
              <div style="color: #4b5563; font-size: 10px; margin-top: 2px;">
                Tel: ${item.guest_phone}${item.guest_id_number ? ' &bull; ID: ' + item.guest_id_number : ''}
              </div>
            </td>
            <td style="padding: 8px 10px; font-size: 11px; vertical-align: top;">
              <div style="font-weight: 700; color: #111827;">Room ${item.room_number}</div>
              <div style="color: #6b7280; font-size: 10px;">${item.room_type || 'Standard'}</div>
            </td>
            <td style="padding: 8px 10px; font-size: 11px; vertical-align: top;">
              <div style="font-weight: 600; color: #111827;">${item.days_count} ${item.days_count === 1 ? 'Day / Night' : 'Days / Nights'}</div>
              <div style="color: #6b7280; font-size: 10px; margin-top: 1px;">
                ${formatDateLabel(item.check_in_date)} &rarr; ${formatDateLabel(item.checkout_date)}
              </div>
            </td>
            <td style="padding: 8px 10px; font-size: 11px; text-align: right; vertical-align: top; font-weight: 700; font-family: monospace; color: ${paidNum > 0 ? '#065f46' : '#9ca3af'};">
              ${formatCurrency(item.amount_paid)}
            </td>
            <td style="padding: 8px 10px; font-size: 11px; text-align: right; vertical-align: top; font-weight: 700; font-family: monospace; color: #111827;">
              ${formatCurrency(item.expected_amount)}
            </td>
            <td style="padding: 8px 10px; font-size: 10px; vertical-align: top; color: #4b5563;">
              <div style="font-weight: 600; text-transform: uppercase;">${item.status}</div>
              ${item.notes ? `<div style="color: #9ca3af; font-style: italic; font-size: 9px; margin-top: 1px;">${item.notes}</div>` : ''}
            </td>
          </tr>
        `
      })
      .join('')

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${isPolice ? 'Official Guest Manifest (Police Copy)' : 'Daily Manifest'} - ${targetDate}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 8mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
              margin: 0;
              padding: 0;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            tr {
              page-break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div style="border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 0.8px; color: #111827;">FAMILY GUEST HOUSE</h1>
                <p style="margin: 3px 0 0; font-size: 13px; font-weight: 800; color: #1f2937;">
                  ${isPolice ? 'OFFICIAL DAILY GUEST MANIFEST' : 'Daily Guest Activity & Shift Audit Report'}
                </p>
                <p style="margin: 2px 0 0; font-size: 10px; color: #4b5563;">
                  ${isPolice ? 'Official Guest Register for Police & Regulatory Authorities &bull; Confidential Stay Record' : 'Official Logbook Record of Guest Check-Ins, Check-Outs & Occupancy'}
                </p>
              </div>
              <div style="text-align: right; font-size: 11px; color: #374151;">
                <div><strong>Manifest Date:</strong> ${targetDate}</div>
                <div><strong>Printed:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
                <div><strong>Duty Staff:</strong> ${user?.full_name || user?.username || 'Reception Desk'}</div>
              </div>
            </div>

            <!-- KPI Cards Bar -->
            ${
              isPolice
                ? `
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 12px; text-align: center;">
              <div style="padding: 6px 4px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb;">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #4b5563;">Total Manifest</div>
                <div style="font-size: 16px; font-weight: 800; color: #111827;">${filteredItems.length}</div>
              </div>
              <div style="padding: 6px 4px; border: 1px solid #a7f3d0; border-radius: 6px; background: #ecfdf5;">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #065f46;">Checked In</div>
                <div style="font-size: 16px; font-weight: 800; color: #065f46;">${report?.checked_in_count || 0}</div>
              </div>
              <div style="padding: 6px 4px; border: 1px solid #bfdbfe; border-radius: 6px; background: #eff6ff;">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #1e40af;">Checked Out</div>
                <div style="font-size: 16px; font-weight: 800; color: #1e40af;">${report?.checked_out_count || 0}</div>
              </div>
              <div style="padding: 6px 4px; border: 1px solid #e9d5ff; border-radius: 6px; background: #faf5ff;">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #6b21a8;">In-House / Occupied</div>
                <div style="font-size: 16px; font-weight: 800; color: #6b21a8;">${report?.occupied_count || 0}</div>
              </div>
              <div style="padding: 6px 4px; border: 1px solid #fde68a; border-radius: 6px; background: #fffbeb;">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #92400e;">Reserved Arrivals</div>
                <div style="font-size: 16px; font-weight: 800; color: #92400e;">${report?.reserved_count || 0}</div>
              </div>
            </div>
            `
                : `
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-top: 12px; text-align: center;">
              <div style="padding: 6px 4px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb;">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #4b5563;">Total Guests</div>
                <div style="font-size: 16px; font-weight: 800; color: #111827;">${filteredItems.length}</div>
              </div>
              <div style="padding: 6px 4px; border: 1px solid #a7f3d0; border-radius: 6px; background: #ecfdf5;">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #065f46;">Checked In</div>
                <div style="font-size: 16px; font-weight: 800; color: #065f46;">${report?.checked_in_count || 0}</div>
              </div>
              <div style="padding: 6px 4px; border: 1px solid #bfdbfe; border-radius: 6px; background: #eff6ff;">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #1e40af;">Checked Out</div>
                <div style="font-size: 16px; font-weight: 800; color: #1e40af;">${report?.checked_out_count || 0}</div>
              </div>
              <div style="padding: 6px 4px; border: 1px solid #e9d5ff; border-radius: 6px; background: #faf5ff;">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #6b21a8;">Occupied</div>
                <div style="font-size: 16px; font-weight: 800; color: #6b21a8;">${report?.occupied_count || 0}</div>
              </div>
              <div style="padding: 6px 4px; border: 1px solid #fde68a; border-radius: 6px; background: #fffbeb;">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #92400e;">Reserved</div>
                <div style="font-size: 16px; font-weight: 800; color: #92400e;">${report?.reserved_count || 0}</div>
              </div>
              <div style="padding: 6px 4px; border: 1px solid #fecdd3; border-radius: 6px; background: #fff1f2;">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #9f1239;">Total Collected</div>
                <div style="font-size: 12px; font-weight: 900; color: #9f1239; margin-top: 2px;">${formatCurrency(totalPaid)}</div>
              </div>
            </div>
            `
            }
          </div>

          <!-- Manifest Guests Table -->
          <div style="margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; border-radius: 6px;">
              <thead>
                ${
                  isPolice
                    ? `
                <tr style="background: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #374151;">
                  <th style="padding: 8px 6px; text-align: center; width: 30px;">#</th>
                  <th style="padding: 8px 8px; text-align: left; width: 90px;">Activity</th>
                  <th style="padding: 8px 8px; text-align: left;">Guest Full Name & Tel</th>
                  <th style="padding: 8px 8px; text-align: left; width: 110px;">ID / Passport No.</th>
                  <th style="padding: 8px 8px; text-align: left; width: 80px;">Room</th>
                  <th style="padding: 8px 8px; text-align: left; width: 85px;">Check-In</th>
                  <th style="padding: 8px 8px; text-align: left; width: 85px;">Check-Out</th>
                  <th style="padding: 8px 8px; text-align: center; width: 70px;">Stay</th>
                  <th style="padding: 8px 8px; text-align: left; width: 80px;">Status</th>
                </tr>
                `
                    : `
                <tr style="background: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #374151;">
                  <th style="padding: 8px 10px; text-align: left;">Activity</th>
                  <th style="padding: 8px 10px; text-align: left;">Guest Information</th>
                  <th style="padding: 8px 10px; text-align: left;">Room</th>
                  <th style="padding: 8px 10px; text-align: left;">Duration (Stay)</th>
                  <th style="padding: 8px 10px; text-align: right;">Amount Paid</th>
                  <th style="padding: 8px 10px; text-align: right;">Total Expected</th>
                  <th style="padding: 8px 10px; text-align: left;">Status</th>
                </tr>
                `
                }
              </thead>
              <tbody>
                ${rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="${isPolice ? 9 : 7}" style="text-align: center; padding: 24px; color: #6b7280; font-size: 12px;">No guest activities recorded for this date.</td></tr>`}
              </tbody>
              <tfoot>
                ${
                  isPolice
                    ? `
                <tr style="background: #f9fafb; border-top: 2px solid #111827; font-weight: 800; font-size: 11px;">
                  <td colspan="7" style="padding: 10px 12px; text-transform: uppercase; letter-spacing: 0.5px;">Total Verified Guest Entries:</td>
                  <td colspan="2" style="padding: 10px 12px; text-align: right; color: #111827; font-size: 12px;">${filteredItems.length} Registered ${filteredItems.length === 1 ? 'Guest' : 'Guests'}</td>
                </tr>
                `
                    : `
                <tr style="background: #f9fafb; border-top: 2px solid #111827; font-weight: 800; font-size: 11px;">
                  <td colspan="4" style="padding: 10px; text-align: right; text-transform: uppercase; letter-spacing: 0.5px;">Total for Manifest Page:</td>
                  <td style="padding: 10px; text-align: right; color: #065f46; font-size: 12px; font-family: monospace;">${formatCurrency(totalPaid)}</td>
                  <td style="padding: 10px; text-align: right; color: #111827; font-size: 12px; font-family: monospace;">${formatCurrency(totalExpected)}</td>
                  <td></td>
                </tr>
                `
                }
              </tfoot>
            </table>
          </div>

          <!-- Signatures Section -->
          ${
            isPolice
              ? `
          <div style="display: flex; justify-content: space-between; margin-top: 36px; padding-top: 16px; border-top: 1px dashed #9ca3af; font-size: 11px; color: #4b5563;">
            <div style="width: 250px; text-align: center;">
              <div style="border-bottom: 1px solid #111827; height: 35px; margin-bottom: 6px;"></div>
              <div><strong>Prepared & Submitted By (Receptionist)</strong></div>
              <div style="font-size: 10px; color: #6b7280;">Name: ${user?.full_name || user?.username || 'Duty Receptionist'} &bull; Sign & Date</div>
            </div>
            <div style="width: 250px; text-align: center;">
              <div style="border-bottom: 1px solid #111827; height: 35px; margin-bottom: 6px;"></div>
              <div><strong>Police / Tourism Authority Receiving Officer</strong></div>
              <div style="font-size: 10px; color: #6b7280;">Officer Name, Signature & Official Stamp</div>
            </div>
          </div>
          <div style="margin-top: 24px; text-align: center; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 6px;">
            Official Law Enforcement & Tourism Regulatory Guest Register &bull; Family Guest House &bull; Page 1 of 1
          </div>
          `
              : `
          <div style="display: flex; justify-content: space-between; margin-top: 36px; padding-top: 16px; border-top: 1px dashed #9ca3af; font-size: 11px; color: #4b5563;">
            <div style="width: 220px; text-align: center;">
              <div style="border-bottom: 1px solid #111827; height: 35px; margin-bottom: 6px;"></div>
              <div><strong>Prepared By (Receptionist)</strong></div>
              <div style="font-size: 10px; color: #6b7280;">Sign & Date</div>
            </div>
            <div style="width: 220px; text-align: center;">
              <div style="border-bottom: 1px solid #111827; height: 35px; margin-bottom: 6px;"></div>
              <div><strong>Verified By (Manager / Owner)</strong></div>
              <div style="font-size: 10px; color: #6b7280;">Sign & Date</div>
            </div>
          </div>
          `
          }
        </body>
      </html>
    `

    doc.open()
    doc.write(printHtml)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 3000)
    }, 250)
  }

  const exportCSV = () => {
    if (!filteredItems.length) return
    const isPolice = effectiveType === 'POLICE'
    const headers = isPolice
      ? [
          'Activity',
          'Guest Name',
          'Phone',
          'ID Number',
          'Room',
          'Room Type',
          'Days Count',
          'Check-In Date',
          'Check-Out Date',
          'Status',
          'Notes',
        ]
      : [
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

    const rows = filteredItems.map((item) =>
      isPolice
        ? [
            `"${item.activity_type}"`,
            `"${item.guest_name.replace(/"/g, '""')}"`,
            `"${item.guest_phone}"`,
            `"${item.guest_id_number || ''}"`,
            `"${item.room_number}"`,
            `"${item.room_type || ''}"`,
            item.days_count,
            `"${item.check_in_date || ''}"`,
            `"${item.checkout_date || ''}"`,
            `"${item.status}"`,
            `"${(item.notes || '').replace(/"/g, '""')}"`,
          ]
        : [
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
          ]
    )

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      isPolice
        ? `Daily_Guest_Manifest_Police_${targetDate}.csv`
        : `Daily_Guest_Manifest_Audit_${targetDate}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      {/* Inline styles for clean print handling */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          html, body {
            overflow: visible !important;
            height: auto !important;
            background: white !important;
          }
          body > * {
            visibility: hidden !important;
          }
          div[role="dialog"] {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
            inset: auto !important;
            background: transparent !important;
          }
          div[role="dialog"] > div[aria-hidden="true"] {
            display: none !important;
          }
          div[role="dialog"] > div:not([aria-hidden="true"]) {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          #manifest-printable-area, #manifest-printable-area * {
            visibility: visible !important;
          }
          #manifest-printable-area {
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          table {
            width: 100% !important;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
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
        title={
          effectiveType === 'POLICE'
            ? 'Official Daily Guest Manifest (Police / Regulatory Copy)'
            : "Today's Guest Activity & Shift Audit Report"
        }
        description={
          effectiveType === 'POLICE'
            ? 'Official register of guest names, phone, ID/passport numbers, and stay duration for police & tourism authorities. Free of room prices and financial figures.'
            : 'Daily overview of checked in, checked out, and reserved guests with stay durations and payment tracking.'
        }
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
                {effectiveType === 'POLICE' ? 'Print Police Manifest' : 'Print Audit Manifest'}
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
                <p className="text-sm font-bold text-stone-700">
                  {effectiveType === 'POLICE'
                    ? 'OFFICIAL DAILY GUEST MANIFEST'
                    : 'Daily Guest Manifest & Shift Audit Report'}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {effectiveType === 'POLICE'
                    ? 'Official Logbook Copy for Police & Tourism Regulatory Authorities • Confidential Guest Register'
                    : 'Official Logbook Record of Guest Check-Ins, Check-Outs & Reservations'}
                </p>
              </div>
              <div className="text-right text-xs text-stone-700">
                <p className="font-bold text-stone-900">Manifest Date: {targetDate}</p>
                <p>Printed: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                <p>Duty Staff: {user?.full_name || user?.username || 'Reception Desk'}</p>
              </div>
            </div>

            {effectiveType === 'POLICE' ? (
              <div className="grid grid-cols-5 gap-2 mt-4 pt-3 border-t border-stone-200 text-center">
                <div className="p-2 border border-stone-300 rounded bg-stone-50">
                  <p className="text-[10px] uppercase font-bold text-stone-500">Total Manifest</p>
                  <p className="text-base font-bold text-stone-900">{filteredItems.length}</p>
                </div>
                <div className="p-2 border border-stone-300 rounded">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Checked In</p>
                  <p className="text-base font-bold text-stone-900">{report?.checked_in_count || 0}</p>
                </div>
                <div className="p-2 border border-stone-300 rounded">
                  <p className="text-[10px] uppercase font-bold text-blue-700">Checked Out</p>
                  <p className="text-base font-bold text-stone-900">{report?.checked_out_count || 0}</p>
                </div>
                <div className="p-2 border border-stone-300 rounded">
                  <p className="text-[10px] uppercase font-bold text-purple-700">In-House / Occupied</p>
                  <p className="text-base font-bold text-stone-900">{report?.occupied_count || 0}</p>
                </div>
                <div className="p-2 border border-stone-300 rounded">
                  <p className="text-[10px] uppercase font-bold text-amber-700">Reserved Arrivals</p>
                  <p className="text-base font-bold text-stone-900">{report?.reserved_count || 0}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2 mt-4 pt-3 border-t border-stone-200 text-center">
                <div className="p-2 border border-stone-300 rounded bg-stone-50">
                  <p className="text-[10px] uppercase font-bold text-stone-500">Total Guests</p>
                  <p className="text-base font-bold text-stone-900">{filteredItems.length}</p>
                </div>
                <div className="p-2 border border-stone-300 rounded">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Checked In</p>
                  <p className="text-base font-bold text-stone-900">{report?.checked_in_count || 0}</p>
                </div>
                <div className="p-2 border border-stone-300 rounded">
                  <p className="text-[10px] uppercase font-bold text-blue-700">Checked Out</p>
                  <p className="text-base font-bold text-stone-900">{report?.checked_out_count || 0}</p>
                </div>
                <div className="p-2 border border-stone-300 rounded">
                  <p className="text-[10px] uppercase font-bold text-purple-700">Occupied</p>
                  <p className="text-base font-bold text-stone-900">{report?.occupied_count || 0}</p>
                </div>
                <div className="p-2 border border-stone-300 rounded">
                  <p className="text-[10px] uppercase font-bold text-amber-700">Reserved</p>
                  <p className="text-base font-bold text-stone-900">{report?.reserved_count || 0}</p>
                </div>
                <div className="p-2 border border-stone-300 rounded bg-stone-50">
                  <p className="text-[10px] uppercase font-bold text-rose-700">Total Collected</p>
                  <p className="text-sm font-bold text-stone-900">{formatCurrency(report?.total_amount_paid || 0)}</p>
                </div>
              </div>
            )}
          </div>

          {/* SCREEN CONTROLS & DATE SELECTOR */}
          <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200/80">
            <div className="flex flex-wrap items-center gap-2">
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

              {!isReception ? (
                <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg text-xs font-semibold ml-2">
                  <button
                    type="button"
                    onClick={() => setManifestType('POLICE')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      manifestType === 'POLICE'
                        ? 'bg-white text-stone-900 shadow-xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Police Copy (No Financials)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManifestType('AUDIT')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      manifestType === 'AUDIT'
                        ? 'bg-white text-stone-900 shadow-xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Audit Copy (With Financials)
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold ml-2">
                  <ShieldCheck size={13} className="text-blue-600" />
                  <span>Police & Regulatory Mode (Non-Financial)</span>
                </div>
              )}
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

            {showFinancials ? (
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
            ) : (
              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">In-House Guests</span>
                  <span className="p-1 rounded-md bg-purple-100 text-purple-700">
                    <BedDouble size={15} />
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-2xl font-bold text-purple-950">{report?.occupied_count || 0}</p>
                  <p className="text-[10px] text-purple-700 font-medium mt-0.5">Active rooms occupied</p>
                </div>
              </div>
            )}
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
              onClick={() => setActivityFilter('OCCUPIED')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activityFilter === 'OCCUPIED'
                  ? 'bg-purple-700 text-white font-semibold'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <BedDouble size={14} className="text-purple-300" />
              Occupied / In-House ({report?.occupied_count || 0})
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
                  <th className="py-2.5 px-3">Stay Duration & Dates</th>
                  {showFinancials && (
                    <>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3 text-right">Total Expected</th>
                    </>
                  )}
                  <th className="py-2.5 px-3">Status & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={showFinancials ? 7 : 5} className="py-12 text-center text-stone-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={22} className="animate-spin text-rose-500" />
                        <span className="text-xs font-medium">Loading guest manifest for {targetDate}...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={showFinancials ? 7 : 5} className="py-10 text-center text-stone-400">
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
                    const isOccupied = item.activity_type === 'OCCUPIED'
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
                          {isOccupied && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                              <BedDouble size={11} />
                              Occupied
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

                        {/* Amount Paid & Expected (Audit mode only) */}
                        {showFinancials && (
                          <>
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
                            <td className="py-2.5 px-3 align-top text-right">
                              <span className="font-semibold text-stone-700 font-mono text-[11px]">
                                {formatCurrency(item.expected_amount)}
                              </span>
                            </td>
                          </>
                        )}

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
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      {showFinancials ? 'Total for Manifest Page:' : 'Total Verified Guest Entries:'}
                    </td>
                    {showFinancials ? (
                      <>
                        <td className="py-2.5 px-3 text-right text-emerald-800 font-mono text-sm">
                          {formatCurrency(
                            filteredItems.reduce((acc, curr) => acc + parseFloat(String(curr.amount_paid || 0)), 0)
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-stone-800 font-mono text-sm">
                          {formatCurrency(
                            filteredItems.reduce((acc, curr) => acc + parseFloat(String(curr.expected_amount || 0)), 0)
                          )}
                        </td>
                        <td></td>
                      </>
                    ) : (
                      <td colSpan={1} className="py-2.5 px-3 text-right text-stone-800 text-xs font-bold">
                        {filteredItems.length} Registered {filteredItems.length === 1 ? 'Guest' : 'Guests'}
                      </td>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* PRINT-ONLY SIGNATURE BLOCK & AUDIT VERIFICATION */}
          <div className="print-only pt-8 mt-8 border-t-2 border-stone-800">
            {effectiveType === 'POLICE' ? (
              <>
                <div className="grid grid-cols-2 gap-12 text-xs">
                  <div className="space-y-4">
                    <p className="font-bold text-stone-900 uppercase">Prepared & Submitted By (Receptionist):</p>
                    <div className="pt-8 border-b border-stone-400"></div>
                    <div className="flex justify-between text-[11px] text-stone-600">
                      <span>Name: {user?.full_name || user?.username || 'Duty Receptionist'}</span>
                      <span>Signature</span>
                      <span>Date</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="font-bold text-stone-900 uppercase">Police / Tourism Authority Receiving Officer:</p>
                    <div className="pt-8 border-b border-stone-400"></div>
                    <div className="flex justify-between text-[11px] text-stone-600">
                      <span>Officer Name</span>
                      <span>Signature</span>
                      <span>Official Stamp</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center text-[10px] text-stone-500 border-t border-stone-200 pt-2">
                  Official Law Enforcement & Tourism Regulatory Guest Register &bull; Family Guest House &bull; Page 1 of 1
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
