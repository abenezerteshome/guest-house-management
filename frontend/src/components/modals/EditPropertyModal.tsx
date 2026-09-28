import { useState, useEffect } from 'react'
import { Building2, AlertCircle, Clock, Save } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { updateProperty } from '../../api/superAdmin'
import { getApiError } from '../../api/client'
import type { Property } from '../../types/api'

interface EditPropertyModalProps {
  isOpen: boolean
  property: Property | null
  onClose: () => void
  onSuccess: (updated: Property) => void
}

export function EditPropertyModal({
  isOpen,
  property,
  onClose,
  onSuccess,
}: EditPropertyModalProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [address, setAddress] = useState('')
  const [currency, setCurrency] = useState('ETB')
  const [deadlineHour, setDeadlineHour] = useState(4)
  const [deadlineMinute, setDeadlineMinute] = useState(0)
  const [penalty, setPenalty] = useState('600')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (property) {
      setName(property.name || '')
      setCode(property.code || '')
      setContactPhone(property.contact_phone || '')
      setContactEmail(property.contact_email || '')
      setAddress(property.address || '')
      setCurrency(property.currency || 'ETB')
      setDeadlineHour(property.checkout_deadline_hour ?? 4)
      setDeadlineMinute(property.checkout_deadline_minute ?? 0)
      setPenalty(String(property.late_checkout_penalty ?? '600'))
      setNotes(property.notes || '')
      setError('')
    }
  }, [property, isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!property) return

    if (!name.trim()) {
      setError('Please provide a property name.')
      return
    }
    if (!code.trim()) {
      setError('Please provide a property code.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const updated = await updateProperty(property.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        address: address.trim() || null,
        currency: currency.trim().toUpperCase() || 'ETB',
        checkout_deadline_hour: Number(deadlineHour),
        checkout_deadline_minute: Number(deadlineMinute),
        late_checkout_penalty: penalty,
        notes: notes.trim() || null,
      })

      onSuccess(updated)
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Failed to update property configuration.'))
    } finally {
      setLoading(false)
    }
  }

  if (!property) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose()
      }}
      title={`Edit Property: ${property.name}`}
      description="Update guest house directory details, contact records, and checkout deadlines."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6 pt-1">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Property Profile */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-neutral-500" />
            <span>Guest House Identification & Contact</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Property Name *"
              placeholder="e.g. Sunrise Guest House"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Property Code / Identifier *"
              placeholder="e.g. SUNRISE"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              helperText="Unique uppercase tenant slug"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contact Phone Number"
              placeholder="+251 91 123 4567"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
            <Input
              label="Contact Email"
              type="email"
              placeholder="manager@guesthouse.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>

          <Input
            label="Physical Address / Location"
            placeholder="e.g. Bole Sub-city, Near Edna Mall, Addis Ababa"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* Section 2: Financial & Operational Rules */}
        <div className="space-y-3.5 pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            <span>Checkout Rules & Operational Billing</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Currency Code"
              placeholder="ETB"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              helperText="e.g. ETB, USD, EUR"
            />

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Daily Checkout Cutoff
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={deadlineHour}
                  onChange={(e) => setDeadlineHour(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00 ({i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`})
                    </option>
                  ))}
                </select>
                <span className="text-neutral-400">:</span>
                <select
                  value={deadlineMinute}
                  onChange={(e) => setDeadlineMinute(Number(e.target.value))}
                  className="w-20 px-2 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                >
                  <option value={0}>00</option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                </select>
              </div>
              <span className="block text-[10px] text-neutral-400 mt-1">Default daily turnover deadline</span>
            </div>

            <Input
              label="Late Penalty Surcharge"
              type="number"
              step="0.01"
              placeholder="600.00"
              value={penalty}
              onChange={(e) => setPenalty(e.target.value)}
              helperText="Charged if guest extends past cutoff"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Internal Property Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional administrative notes or contract remarks..."
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
