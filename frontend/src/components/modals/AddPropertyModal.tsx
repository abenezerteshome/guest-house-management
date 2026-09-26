import { useState } from 'react'
import { Building2, User, KeyRound, AlertCircle } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { createProperty } from '../../api/superAdmin'
import { getApiError } from '../../api/client'

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddPropertyModal({ isOpen, onClose, onSuccess }: AddPropertyModalProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')
  const [currency, setCurrency] = useState('ETB')
  const [deadlineHour, setDeadlineHour] = useState(4)
  const [deadlineMinute, setDeadlineMinute] = useState(0)
  const [penalty, setPenalty] = useState('600')

  const [adminUsername, setAdminUsername] = useState('')
  const [adminFullName, setAdminFullName] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminEmail, setAdminEmail] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function resetForm() {
    setName('')
    setCode('')
    setContactPhone('')
    setAddress('')
    setCurrency('ETB')
    setDeadlineHour(4)
    setDeadlineMinute(0)
    setPenalty('600')
    setAdminUsername('')
    setAdminFullName('')
    setAdminPassword('')
    setAdminEmail('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please provide a property name.')
      return
    }
    if (!code.trim()) {
      setError('Please provide a unique property code (e.g. SUNSET).')
      return
    }
    if (!adminUsername.trim() || !adminFullName.trim() || !adminPassword.trim()) {
      setError('Please complete all required initial administrator fields.')
      return
    }
    if (adminPassword.length < 6) {
      setError('Admin password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await createProperty({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        contact_phone: contactPhone.trim() || null,
        address: address.trim() || null,
        currency: currency.trim().toUpperCase() || 'ETB',
        checkout_deadline_hour: Number(deadlineHour),
        checkout_deadline_minute: Number(deadlineMinute),
        late_checkout_penalty: penalty,
        admin_username: adminUsername.trim(),
        admin_full_name: adminFullName.trim(),
        admin_password: adminPassword,
        admin_email: adminEmail.trim() || null,
      })

      resetForm()
      onSuccess()
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Failed to onboard and create property client.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) {
          resetForm()
          onClose()
        }
      }}
      title="Onboard New Client Property"
      description="Provision an isolated guest house tenant with dedicated database records and an initial administrator."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Property Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-neutral-100">
            <Building2 className="w-4 h-4 text-[#FF385C]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Property Information
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Input
                label="Property Name *"
                placeholder="e.g. Sunrise Guest House"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Input
                label="Tenant Code (Unique) *"
                placeholder="e.g. SUNRISE"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                required
                disabled={loading}
              />
              <p className="text-[11px] text-neutral-400 mt-1">Short identifier used across systems</p>
            </div>
            <div>
              <Input
                label="Contact Phone"
                placeholder="+251 911 234567"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Input
                label="Physical Address / City"
                placeholder="Bole Subcity, Addis Ababa"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Input
                label="Currency Code *"
                placeholder="ETB"
                value={currency}
                maxLength={10}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Input
                label="Late Checkout Penalty (ETB) *"
                type="number"
                min="0"
                step="1"
                placeholder="600"
                value={penalty}
                onChange={(e) => setPenalty(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Initial Property Admin */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 pb-1 border-b border-neutral-100">
            <User className="w-4 h-4 text-[#FF385C]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Initial Property Administrator
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Input
                label="Admin Full Name *"
                placeholder="e.g. John Doe"
                value={adminFullName}
                onChange={(e) => setAdminFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Input
                label="Admin Username *"
                placeholder="e.g. john_admin"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Input
                label="Temporary Password *"
                type="password"
                placeholder="Min. 6 characters"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Input
                label="Admin Email (Optional)"
                type="email"
                placeholder="admin@property.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm()
              onClose()
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading} className="gap-2">
            <Building2 className="w-4 h-4" />
            <span>Onboard Property</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
