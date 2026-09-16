import { api } from './client'
import type { User } from '../types/api'

export async function listUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users')
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
