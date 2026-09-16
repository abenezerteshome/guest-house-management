import { useState, useEffect } from 'react'
import { Building2, AlertCircle, Trash2 } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { updateRoom } from '../../api/rooms'
import type { Room } from '../../types/api'

interface EditRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  room: Room | null
  onDeleteRequest?: (room: Room) => void
}

const ROOM_TYPES = [
  'Standard Double',
  'Deluxe Suite',
  'Single Room',
  'Executive Suite',
  'Twin Bed Room',
  'Master Penthouse',
]

export function EditRoomModal({
  isOpen,
  onClose,
  onSuccess,
  room,
  onDeleteRequest,
}: EditRoomModalProps) {
  const [roomNumber, setRoomNumber] = useState('')
  const [roomType, setRoomType] = useState(ROOM_TYPES[0])
  const [customType, setCustomType] = useState('')
  const [price, setPrice] = useState('')
  const [hourlyPrice, setHourlyPrice] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (room) {
      setRoomNumber(room.room_number || '')
      if (ROOM_TYPES.includes(room.room_type)) {
        setRoomType(room.room_type)
        setCustomType('')
      } else {
        setRoomType('Other')
        setCustomType(room.room_type || '')
      }
      setPrice(String(room.price || ''))
      setHourlyPrice(room.hourly_price ? String(room.hourly_price) : '')
      setIsActive(room.is_active ?? true)
      setError('')
    }
  }, [room])

  if (!room) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!room) return

    if (!roomNumber.trim()) {
      setError('Please provide a room number or code.')
      return
    }
    const numPrice = Number(price)
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Please provide a valid nightly price.')
      return
    }

    const finalType = roomType === 'Other' && customType.trim() ? customType.trim() : roomType

    setLoading(true)
    setError('')

    try {
      await updateRoom(room.id, {
        room_number: roomNumber.trim(),
        room_type: finalType,
        price: numPrice,
        hourly_price: hourlyPrice ? Number(hourlyPrice) : null,
        is_active: isActive,
      })

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to update room. Room number may already exist.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${room.room_number}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Room Number / Code *"
          placeholder="e.g. 101, Suite A"
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
            label="Custom Room Type *"
            placeholder="e.g. Honeymoon Suite"
            required
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nightly Price (ETB) *"
            type="number"
            min="0"
            step="50"
            required
            placeholder="e.g. 2500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            label="Hourly Rate (ETB)"
            type="number"
            min="0"
            step="50"
            placeholder="Optional, e.g. 500"
            value={hourlyPrice}
            onChange={(e) => setHourlyPrice(e.target.value)}
          />
        </div>

        {/* Active Toggle */}
        <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
          <div>
            <p className="text-xs font-bold text-neutral-900">Room Active in Inventory</p>
            <p className="text-[11px] text-neutral-500">Inactive rooms cannot receive new check-ins or reservations</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
          {onDeleteRequest ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onDeleteRequest(room)
              }}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete Room</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={loading}>
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
