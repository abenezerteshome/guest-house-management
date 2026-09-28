import { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  KeyRound,
  Pencil,
  Trash2,
  Power,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Search,
} from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { listUsers, activateUser, deactivateUser } from '../../api/users'
import { getApiError } from '../../api/client'
import { AddUserModal } from './AddUserModal'
import { EditUserModal } from './EditUserModal'
import { ChangePasswordModal } from './ChangePasswordModal'
import { ConfirmDeleteUserModal } from './ConfirmDeleteUserModal'
import type { Property, User } from '../../types/api'

interface ManagePropertyUsersModalProps {
  isOpen: boolean
  property: Property | null
  onClose: () => void
  onUsersChanged?: () => void
}

export function ManagePropertyUsersModal({
  isOpen,
  property,
  onClose,
  onUsersChanged,
}: ManagePropertyUsersModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [search, setSearch] = useState('')

  // Sub-modal states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null)
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null)
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<User | null>(null)

  async function loadUsers() {
    if (!property) return
    setLoading(true)
    setErrorMsg('')
    try {
      const data = await listUsers(property.id)
      setUsers(data)
    } catch (err) {
      setErrorMsg(getApiError(err, 'Failed to load user accounts for this property.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && property) {
      loadUsers()
      setSearch('')
      setErrorMsg('')
      setSuccessMsg('')
    }
  }, [isOpen, property])

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.username.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    )
  })

  async function handleToggleStatus(u: User) {
    try {
      const updated = u.is_active ? await deactivateUser(u.id) : await activateUser(u.id)
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setSuccessMsg(`Account @${updated.username} is now ${updated.is_active ? 'Active' : 'Disabled'}.`)
      setTimeout(() => setSuccessMsg(''), 4000)
      onUsersChanged?.()
    } catch (err) {
      setErrorMsg(getApiError(err, 'Failed to update user status.'))
    }
  }

  if (!property) return null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Staff & Credentials: ${property.name}`}
        description={`Manage usernames, roles, and password resets for property tenant "${property.code}".`}
        size="lg"
      >
        <div className="space-y-4 pt-1">
          {/* Success / Error Banners */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff, username, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsAddUserOpen(true)}
              className="gap-1.5 w-full sm:w-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff / Admin</span>
            </Button>
          </div>

          {/* Users Table */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
            {loading ? (
              <div className="py-12 text-center text-xs text-neutral-400">
                Loading property staff accounts...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Users className="w-7 h-7 text-neutral-300 mx-auto" />
                <p className="text-xs font-semibold text-neutral-700">No staff accounts found</p>
                <p className="text-[11px] text-neutral-400">
                  {search
                    ? 'No users match your search.'
                    : 'Click "Add Staff / Admin" to create the first credentials for this guest house.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-500 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Staff Member</th>
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-neutral-50/60 transition-colors">
                        {/* Member */}
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-neutral-900">{u.full_name}</div>
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-400">
                            {u.phone && <span className="text-neutral-600 font-medium">📞 {u.phone}</span>}
                            {u.email && <span>{u.email}</span>}
                          </div>
                        </td>

                        {/* Username */}
                        <td className="py-2.5 px-3 font-mono font-bold text-neutral-800">
                          @{u.username}
                        </td>

                        {/* Role */}
                        <td className="py-2.5 px-3">
                          {u.role === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <ShieldCheck className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                              <UserCheck className="w-3 h-3" />
                              Reception
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Disabled
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Reset Password Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForPassword(u)}
                              title="Reset Password"
                              className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200 transition cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForEdit(u)}
                              title="Edit Username & Profile"
                              className="p-1.5 rounded-lg text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Active Status */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              title={u.is_active ? 'Disable Account' : 'Activate Account'}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                u.is_active
                                  ? 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 border-neutral-200'
                                  : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete User */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForDelete(u)}
                              title="Delete Account"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserOpen}
        propertyId={property.id}
        onClose={() => setIsAddUserOpen(false)}
        onSuccess={(newUser) => {
          setUsers((prev) => [...prev, newUser])
          setSuccessMsg(`Account @${newUser.username} created successfully!`)
          setTimeout(() => setSuccessMsg(''), 4000)
          onUsersChanged?.()
        }}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={Boolean(selectedUserForEdit)}
        user={selectedUserForEdit}
        onClose={() => setSelectedUserForEdit(null)}
        onSuccess={(updated) => {
          setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
          setSuccessMsg(`Account @${updated.username} updated successfully!`)
          setTimeout(() => setSuccessMsg(''), 4000)
          onUsersChanged?.()
        }}
      />

      {/* Password Reset Modal */}
      {selectedUserForPassword && (
        <ChangePasswordModal
          user={selectedUserForPassword}
          adminReset={true}
          onClose={() => setSelectedUserForPassword(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
            setSuccessMsg(`Password for @${updated.username} has been reset successfully!`)
            setTimeout(() => setSuccessMsg(''), 4000)
          }}
        />
      )}

      {/* Delete User Modal */}
      <ConfirmDeleteUserModal
        isOpen={Boolean(selectedUserForDelete)}
        user={selectedUserForDelete}
        onClose={() => setSelectedUserForDelete(null)}
        onSuccess={() => {
          if (selectedUserForDelete) {
            setUsers((prev) => prev.filter((item) => item.id !== selectedUserForDelete.id))
            setSuccessMsg(`Account @${selectedUserForDelete.username} deleted.`)
            setTimeout(() => setSuccessMsg(''), 4000)
            onUsersChanged?.()
          }
        }}
      />
    </>
  )
}
