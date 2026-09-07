import { api } from './client'
import type { Reservation } from '../types/api'

export async function getReservations(status?: string): Promise<Reservation[]> {
  const res = await api.get<Reservation[]>('/reservations', { params: status ? { status } : undefined })
  return res.data
}

export async function createReservation(data: {
  guest_id: number
  room_id: number
  expected_arrival: string
  expected_checkout: string
  notes?: string
}): Promise<Reservation> {
  const res = await api.post<Reservation>('/reservations', data)
  return res.data
}

export async function cancelReservation(id: number): Promise<Reservation> {
  const res = await api.post<Reservation>(`/reservations/${id}/cancel`)
  return res.data
}

export async function markReservationNoShow(id: number): Promise<Reservation> {
  const res = await api.post<Reservation>(`/reservations/${id}/no-show`)
  return res.data
}
