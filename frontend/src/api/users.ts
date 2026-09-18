import { api } from './client'
import type { User, Role } from '../types/api'

export async function listUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users')
  return data
}

export async function createUser(payload: {
  full_name: string
  username: string
  password: string
  role: Role
  email?: string | null
}): Promise<User> {
  const { data } = await api.post<User>('/users', payload)
  return data
}

export async function updateUser(
  userId: number,
  payload: Partial<{
    full_name: string
    email: string | null
    role: Role
    is_active: boolean
  }>
): Promise<User> {
  const { data } = await api.patch<User>(`/users/${userId}`, payload)
  return data
}

export async function activateUser(userId: number): Promise<User> {
  const { data } = await api.post<User>(`/users/${userId}/activate`)
  return data
}

export async function deactivateUser(userId: number): Promise<User> {
  const { data } = await api.post<User>(`/users/${userId}/deactivate`)
  return data
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<User> {
  const { data } = await api.post<User>('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return data
}

export async function resetUserPassword(userId: number, newPassword: string): Promise<User> {
  const { data } = await api.post<User>(`/users/${userId}/password`, {
    new_password: newPassword,
  })
  return data
}
