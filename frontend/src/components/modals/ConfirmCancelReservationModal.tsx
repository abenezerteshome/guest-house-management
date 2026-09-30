import { AlertTriangle, Ban, X, BedDouble, Calendar, User, Banknote } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import type { Reservation } from '../../types/api'

export interface ConfirmCancelReservationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  reservation: Reservation | null
  guestName?: string
  roomNumber?: string
  actionType?: 'cancel' | 'no-show'
  loading?: boolean
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ConfirmCancelReservationModal({
  isOpen,
  onClose,
  onConfirm,
  reservation,
  guestName,
  roomNumber,
  actionType = 'cancel',
  loading = false,
}: ConfirmCancelReservationModalProps) {
  if (!reservation) return null

  const isCancel = actionType === 'cancel'
  const title = isCancel ? 'Cancel Reservation' : 'Mark as No-Show'
  const actionLabel = isCancel ? 'Cancel Reservation' : 'Mark No-Show'
  const confirmButtonText = isCancel ? 'Yes, Cancel' : 'Yes, Mark No-Show'
  const hasDeposit = Boolean(reservation.deposit_amount && Number(reservation.deposit_amount) > 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        {/* Warning banner with icon */}
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
            {isCancel ? <AlertTriangle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-950">
              Are you sure you want to {isCancel ? 'cancel this reservation' : 'mark this guest as No-Show'}?
            </h4>
            <p className="text-xs text-amber-800 mt-1">
              Room {roomNumber ? roomNumber : `#${reservation.room_id}`} will immediately be freed and made available for other guests.
            </p>
          </div>
        </div>

        {/* Reservation summary card */}
        <div className="bg-[#FAF8F5] border border-[#EFEBE4] rounded-2xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-[#EAE4DC] pb-2">
            <span className="text-neutral-500">Reservation</span>
            <span className="font-mono font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
              #{reservation.id}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-neutral-400" />
              Guest
            </span>
            <span className="font-semibold text-neutral-900">
              {guestName || `Guest #${reservation.guest_id}`}
            </span>
          </div>

          {roomNumber && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5 text-neutral-400" />
                Room
              </span>
              <span className="font-semibold text-[#FF385C]">
                Room {roomNumber}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-neutral-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              Dates
            </span>
            <span className="font-medium text-neutral-800">
              {formatDate(reservation.expected_arrival)} → {formatDate(reservation.expected_checkout)}
            </span>
          </div>
        </div>

        {/* Advance Deposit Warning if Paid */}
        {hasDeposit && (
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-amber-900">
                <Banknote className="w-4 h-4 text-emerald-600" />
                Advance Deposit Paid:
              </span>
              <span className="font-mono text-sm text-emerald-800 bg-white px-2 py-0.5 rounded border border-amber-200 font-bold">
                ETB {Number(reservation.deposit_amount).toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Customer has already paid this deposit via <strong>{reservation.deposit_method || 'Cash'}</strong>
              {reservation.deposit_reference ? ` (Ref: ${reservation.deposit_reference})` : ''}.
              Please coordinate any required customer refund per house policy.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-neutral-100 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl text-neutral-700"
          >
            Keep Reservation
          </Button>
          <Button
            variant="danger"
            size="sm"
            type="button"
            loading={loading}
            leftIcon={isCancel ? <X className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
            onClick={onConfirm}
            className="rounded-xl font-bold"
          >
            {confirmButtonText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
