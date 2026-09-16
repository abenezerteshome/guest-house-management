import { useState } from 'react'
import { Trash2, AlertTriangle, AlertCircle } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { deleteRoom } from '../../api/rooms'
import type { Room } from '../../types/api'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  room: Room | null
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onSuccess,
  room,
}: ConfirmDeleteModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!room) return null

  const isOccupied = room.status === 'OCCUPIED'

  async function handleDelete() {
    if (!room) return
    if (isOccupied) {
      setError('Cannot delete an occupied room. Please check out the guest first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await deleteRoom(room.id)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to delete room. It may have past records associated with it.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Room" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
          <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-950">
              Permanently delete Room {room.room_number}?
            </h4>
            <p className="text-xs text-rose-700 mt-1">
              {isOccupied
                ? 'This room is currently OCCUPIED. You cannot delete a room with an active stay.'
                : `Are you sure you want to delete "${room.room_number}" (${room.room_type})? This will remove the room from active inventory.`}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-medium">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            type="button"
            loading={loading}
            disabled={isOccupied}
            leftIcon={<Trash2 size={13} />}
            onClick={handleDelete}
          >
            Confirm Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}
