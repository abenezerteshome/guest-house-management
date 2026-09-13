import { useState } from 'react'
import { Building, AlertCircle } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { createRoom } from '../../api/rooms'

interface AddRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const ROOM_TYPES = [
  'Standard Double',
  'Deluxe Suite',
  'Single Room',
  'Executive Suite',
  'Twin Bed Room',
  'Master Penthouse',
]

export function AddRoomModal({ isOpen, onClose, onSuccess }: AddRoomModalProps) {
  const [roomNumber, setRoomNumber] = useState('')
  const [roomType, setRoomType] = useState(ROOM_TYPES[0])
  const [customType, setCustomType] = useState('')
  const [price, setPrice] = useState('')
  const [hourlyPrice, setHourlyPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roomNumber.trim()) {
      setError('Please provide a room number or code.')
      return
    }
    const numPrice = Number(price)
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Please provide a valid nightly price greater than 0.')
      return
    }

    const finalType = roomType === 'Other' && customType.trim() ? customType.trim() : roomType

    setLoading(true)
    setError('')

    try {
      await createRoom({
        room_number: roomNumber.trim(),
        room_type: finalType,
        price: numPrice,
        hourly_price: hourlyPrice ? Number(hourlyPrice) : undefined,
      })

      onSuccess()
      onClose()
      setRoomNumber('')
      setPrice('')
      setHourlyPrice('')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to add room. Room number may already exist.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Room" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Room Number / Identifier *"
          placeholder="e.g. 203, 301, Suite A"
          required
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
            Room Type *
          </label>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
          >
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="Other">Other / Custom</option>
          </select>
        </div>

        {roomType === 'Other' && (
          <Input
            label="Custom Room Type"
            placeholder="e.g. Family Bungalow"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nightly Price (ETB) *"
            type="number"
            min="50"
            step="1"
            placeholder="e.g. 1000"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            label="Hourly Rate (ETB / hr)"
            type="number"
            min="10"
            step="1"
            placeholder="e.g. 150"
            helperText="For 3hr / 6hr day-use stays"
            value={hourlyPrice}
            onChange={(e) => setHourlyPrice(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={loading} className="gap-2">
            <Building className="w-4 h-4" />
            {loading ? 'Creating room...' : 'Create Room'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
