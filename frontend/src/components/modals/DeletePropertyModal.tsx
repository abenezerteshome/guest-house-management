import { useState } from 'react'
import { Trash2, AlertTriangle, AlertCircle, Building2 } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { deleteProperty } from '../../api/superAdmin'
import { getApiError } from '../../api/client'
import type { Property } from '../../types/api'

interface DeletePropertyModalProps {
  isOpen: boolean
  property: Property | null
  onClose: () => void
  onSuccess: () => void
}

export function DeletePropertyModal({
  isOpen,
  property,
  onClose,
  onSuccess,
}: DeletePropertyModalProps) {
  const [confirmInput, setConfirmInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!property) return null

  const isConfirmed = confirmInput.trim().toUpperCase() === property.code.toUpperCase()

  async function handleDelete() {
    if (!property || !isConfirmed) return

    setLoading(true)
    setError('')

    try {
      await deleteProperty(property.id)
      setConfirmInput('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Failed to delete property client. It may have active stays.'))
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (!loading) {
      setConfirmInput('')
      setError('')
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Property"
      size="md"
    >
      <div className="space-y-4 pt-1">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
          <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-950">
              Are you sure you want to delete {property.name}?
            </h4>
            <p className="text-xs text-rose-700 leading-relaxed">
              This action cannot be undone. All rooms, reservations, and accounts for this property will be removed.
            </p>
          </div>
        </div>

        {/* Property Scope Summary */}
        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5 text-xs text-neutral-600">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Code:</span>
            <span className="font-mono font-bold text-neutral-900 bg-neutral-200/70 px-2 py-0.5 rounded">
              {property.code}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Rooms:</span>
            <span className="font-semibold text-neutral-900">{property.total_rooms ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Active Stays:</span>
            <span className="font-semibold text-neutral-900">{property.active_stays ?? 0}</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Confirmation Input */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
            Type <span className="font-mono font-bold text-rose-700">{property.code}</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={property.code}
            disabled={loading}
            className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase"
          />
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            isLoading={loading}
            disabled={!isConfirmed}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Yes, Delete Property</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
