import { api } from './client'
import type { Guest } from '../types/api'

export async function getGuests(search?: string): Promise<Guest[]> {
  const res = await api.get<Guest[]>('/guests', { params: search ? { search } : undefined })
  return res.data
}

export async function getGuest(id: number): Promise<Guest> {
  const res = await api.get<Guest>(`/guests/${id}`)
  return res.data
}

export async function createGuest(data: {
  full_name: string
  id_number: string
  phone: string
  address?: string
  nationality?: string
  id_photo_url?: string | null
  notes?: string
}): Promise<Guest> {
  const res = await api.post<Guest>('/guests', data)
  return res.data
}
