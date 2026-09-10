import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  KeyRound,
  Phone,
  Globe,
  AlertCircle,
  UserCheck,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Modal } from '../../components/common/Modal'
import { Table, type TableColumn } from '../../components/common/Table'
import { CheckInModal } from '../../components/modals/CheckInModal'
import { IdPhotoCapture } from '../../components/common/IdPhotoCapture'
import { getGuests, createGuest } from '../../api/guests'
import { getRooms } from '../../api/rooms'
import type { Guest, Room } from '../../types/api'

export function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals
  const [createGuestOpen, setCreateGuestOpen] = useState(false)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null)

  // New Guest Form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [idPhoto, setIdPhoto] = useState<string | null>(null)
  const [nationality, setNationality] = useState('Ethiopian')
  const [notes, setNotes] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [guestsData, roomsData] = await Promise.all([getGuests(), getRooms()])
      setGuests(guestsData)
      setRooms(roomsData)
    } catch (err) {
      console.error('Failed to fetch guests:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE')

  const filteredGuests = guests.filter((g) => {
    const q = search.toLowerCase()
    return (
      g.full_name.toLowerCase().includes(q) ||
      g.phone.toLowerCase().includes(q) ||
      g.id_number.toLowerCase().includes(q) ||
      (g.nationality || '').toLowerCase().includes(q)
    )
  })

  async function handleCreateGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !phone.trim() || !idNumber.trim()) {
      setFormError('Please fill in Full Name, Phone, and ID Number.')
      return
    }

    setFormLoading(true)
    setFormError('')

    try {
      await createGuest({
        full_name: fullName.trim(),
        phone: phone.trim(),
        id_number: idNumber.trim(),
        id_photo_url: idPhoto || undefined,
        nationality: nationality.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      setCreateGuestOpen(false)
      setFullName('')
      setPhone('')
      setIdNumber('')
      setIdPhoto(null)
      setNotes('')
      fetchData()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to register guest.'
      setFormError(msg)
    } finally {
      setFormLoading(false)
    }
  }

  const columns: TableColumn<Guest>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (g) => <span className="font-mono text-xs font-semibold text-neutral-500">#{g.id}</span>,
    },
    {
      key: 'full_name',
      header: 'Guest Full Name',
      render: (g) => (
        <div className="flex items-center gap-2.5">
          {g.id_photo_url ? (
            <div
              onClick={(e) => {
                e.stopPropagation()
                setViewPhotoUrl(g.id_photo_url || null)
              }}
              className="w-8 h-8 rounded-full overflow-hidden border border-emerald-400 bg-neutral-100 cursor-pointer shadow-2xs hover:scale-105 transition shrink-0"
              title="Click to view ID / Passport photo"
            >
              <img src={g.id_photo_url} alt={g.full_name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-700 shrink-0">
              {g.full_name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-sm text-neutral-900">{g.full_name}</p>
            <p className="text-xs text-neutral-500 flex items-center gap-1">
              <Globe className="w-3 h-3" /> {g.nationality || 'Ethiopian'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Phone Number',
      render: (g) => (
        <span className="text-xs font-medium text-neutral-800 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-neutral-400" />
          {g.phone}
        </span>
      ),
    },
    {
      key: 'id_number',
      header: 'ID / Passport #',
      render: (g) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
            {g.id_number}
          </span>
          {g.id_photo_url && (
            <button
              type="button"
              onClick={() => setViewPhotoUrl(g.id_photo_url || null)}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
              title="View Passport / ID Document Photo"
            >
              Photo
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'Notes & Preferences',
      render: (g) => (
        <span className="text-xs text-neutral-500 italic max-w-xs truncate block">
          {g.notes || '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Registered',
      render: (g) => {
        const d = new Date(g.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        return <span className="text-xs text-neutral-500">{d}</span>
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (g) => (
        <Button
          variant="outline"
          size="xs"
          onClick={() => {
            setSelectedGuest(g)
            setCheckInOpen(true)
          }}
          className="gap-1 text-xs"
        >
          <KeyRound className="w-3.5 h-3.5" />
          Check In
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guest Directory"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateGuestOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Guest
          </Button>
        }
      />

      {/* Search */}
      <div className="w-full sm:w-80">
        <Input
          placeholder="Search by name, phone, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Guests Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <Table
          columns={columns}
          data={filteredGuests}
          keyExtractor={(g) => g.id}
          isLoading={loading}
          emptyMessage="No guests found matching your search."
        />
      </div>

      {/* Register Guest Modal */}
      <Modal
        isOpen={createGuestOpen}
        onClose={() => setCreateGuestOpen(false)}
        title="Register New Guest"
        size="md"
      >
        <form onSubmit={handleCreateGuest} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Almaz Ayana"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number *"
              placeholder="+251 912 345678"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="ID / Passport Number *"
              placeholder="e.g. ETH-459021"
              required
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
            />
          </div>

          <Input
            label="Nationality"
            placeholder="Ethiopian"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
          />

          <IdPhotoCapture
            value={idPhoto}
            onChange={setIdPhoto}
            label="Passport / National ID Photo"
            helperText="Upload photo of guest's passport or national ID."
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
              Guest Notes / Preferences
            </label>
            <textarea
              rows={2}
              placeholder="Special requests, business client, preferred floor..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
            />
          </div>

          {formError && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setCreateGuestOpen(false)
                setIdPhoto(null)
              }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={formLoading} className="gap-2">
              <UserCheck className="w-4 h-4" />
              Register Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Guest Document Photo Inspect Modal */}
      <Modal
        isOpen={!!viewPhotoUrl}
        onClose={() => setViewPhotoUrl(null)}
        title="Guest Passport / National ID Document"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-neutral-200 bg-neutral-950 flex items-center justify-center p-2">
            {viewPhotoUrl && (
              <img
                src={viewPhotoUrl}
                alt="Enlarged Document"
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg"
              />
            )}
          </div>
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setViewPhotoUrl(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <CheckInModal
        isOpen={checkInOpen}
        onClose={() => {
          setCheckInOpen(false)
          setSelectedGuest(null)
        }}
        availableRooms={availableRooms}
        initialGuest={
          selectedGuest
            ? {
                fullName: selectedGuest.full_name,
                phone: selectedGuest.phone,
                idNumber: selectedGuest.id_number,
                nationality: selectedGuest.nationality,
                idPhotoUrl: selectedGuest.id_photo_url,
              }
            : undefined
        }
        onSuccess={() => fetchData()}
      />
    </div>
  )
}
