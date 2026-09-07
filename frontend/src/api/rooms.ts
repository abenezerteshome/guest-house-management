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
}): Promise<Room> {
  const res = await api.post<Room>('/rooms', {
    ...data,
    price: String(data.price),
  })
  return res.data
}

export async function updateRoomStatus(id: number, status: RoomStatusType): Promise<Room> {
  const res = await api.patch<Room>(`/rooms/${id}/status`, { status })
  return res.data
}
