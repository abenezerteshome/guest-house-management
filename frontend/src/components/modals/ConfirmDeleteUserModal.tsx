import { useState } from 'react'
import { Trash2, AlertTriangle, AlertCircle } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { deleteUser } from '../../api/users'
import { getApiError } from '../../api/client'
import type { User } from '../../types/api'

interface ConfirmDeleteUserModalProps {
  isOpen: boolean
  user: User | null
  onClose: () => void
  onSuccess: () => void
}

export function ConfirmDeleteUserModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: ConfirmDeleteUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!user) return null

  async function handleDelete() {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      await deleteUser(user.id)
      onSuccess()
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Failed to delete user account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose()
      }}
      title={`Delete Account: @${user.username}`}
      size="sm"
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
          <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
              Permanent Account Removal
            </h4>
            <p className="text-xs text-rose-700 leading-relaxed">
              Are you sure you want to permanently delete the account for{' '}
              <span className="font-semibold text-rose-950">{user.full_name}</span> (
              <span className="font-mono text-rose-950 font-semibold">@{user.username}</span>)?
              The user will no longer be able to log in.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            isLoading={loading}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Confirm Delete</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
