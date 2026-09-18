import { api } from './client'
import type {
  AdminOverrideResetPayload,
  LoginResponse,
  PasswordChangeResponse,
  PublicChangePasswordPayload,
  User,
} from '../types/api'

export async function login(username: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', { username, password })
  return data
}

export async function getCurrentUser() {
  const { data } = await api.get<User>('/auth/me')
  return data
}

export async function publicChangePassword(payload: PublicChangePasswordPayload) {
  const { data } = await api.post<PasswordChangeResponse>('/auth/public-change-password', payload)
  return data
}

export async function adminOverrideResetPassword(payload: AdminOverrideResetPayload) {
  const { data } = await api.post<PasswordChangeResponse>('/auth/admin-override-reset', payload)
  return data
}