import { api } from './client'
import type { Room, RoomStatusType } from '../types/api'

export async function getRooms(params?: { status?: string; is_active?: boolean }): Promise<Room[]> {
  const res = await api.get<Room[]>('/rooms', { params })
  return res.data
}

export async function getRoom(id: number): Promise<Room> {
  const res = await api.get<Room>(`/rooms/${id}`)
  return res.data
}

export async function createRoom(data: {
  room_number: string
  room_type: string
  price: number | string
  hourly_price?: number | string | null
}): Promise<Room> {
  const payload: Record<string, unknown> = {
    room_number: data.room_number,
    room_type: data.room_type,
    price: String(data.price),
  }
  if (data.hourly_price !== undefined && data.hourly_price !== null && data.hourly_price !== '') {
    payload.hourly_price = String(data.hourly_price)
  }
  const res = await api.post<Room>('/rooms', payload)
  return res.data
}

export async function updateRoomStatus(id: number, status: RoomStatusType): Promise<Room> {
  const res = await api.patch<Room>(`/rooms/${id}/status`, { status })
  return res.data
}

export async function updateRoom(
  id: number,
  data: {
    room_number?: string
    room_type?: string
    price?: number | string
    hourly_price?: number | string | null
    is_active?: boolean
  }
): Promise<Room> {
  const payload: Record<string, unknown> = {}
  if (data.room_number !== undefined) payload.room_number = data.room_number
  if (data.room_type !== undefined) payload.room_type = data.room_type
  if (data.price !== undefined) payload.price = String(data.price)
  if (data.hourly_price !== undefined) {
    payload.hourly_price = data.hourly_price === null || data.hourly_price === '' ? null : String(data.hourly_price)
  }
  if (data.is_active !== undefined) payload.is_active = data.is_active
  const res = await api.patch<Room>(`/rooms/${id}`, payload)
  return res.data
}

export async function deleteRoom(id: number): Promise<void> {
  await api.delete(`/rooms/${id}`)
}
