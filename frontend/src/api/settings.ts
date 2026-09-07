import { api } from './client'
import type { SettingsData } from '../types/api'

export async function getSettings(): Promise<SettingsData> {
  const res = await api.get<SettingsData>('/settings')
  return res.data
}

export async function updateSettings(data: {
  checkout_deadline_hour: number
  checkout_deadline_minute: number
  late_checkout_penalty: number | string
}): Promise<SettingsData> {
  const res = await api.patch<SettingsData>('/settings', {
    ...data,
    late_checkout_penalty: String(data.late_checkout_penalty),
  })
  return res.data
}
