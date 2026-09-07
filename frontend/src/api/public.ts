import { api } from './client'
import type {
  PublicRoom,
  PublicBookingRequest,
  PublicBookingConfirmation,
  GoogleUserProfile,
  GuestUserProfile,
  GuestRegisterData,
  GuestLoginData,
} from '../types/public'

export async function getPublicRooms(): Promise<PublicRoom[]> {
  const res = await api.get<PublicRoom[]>('/public/rooms')
  return res.data
}

export async function createPublicReservation(data: PublicBookingRequest): Promise<PublicBookingConfirmation> {
  const res = await api.post<PublicBookingConfirmation>('/public/reservations', data)
  return res.data
}

export async function lookupReservation(query: string): Promise<PublicBookingConfirmation> {
  const res = await api.get<PublicBookingConfirmation>('/public/reservations/lookup', {
    params: { query },
  })
  return res.data
}

export async function verifyGoogleToken(credential: string): Promise<GoogleUserProfile> {
  const res = await api.post<GoogleUserProfile>('/public/google-auth', { credential })
  return res.data
}

export async function guestRegister(data: GuestRegisterData): Promise<GuestUserProfile> {
  const res = await api.post<{
    access_token: string
    id: number
    name: string
    email: string
    phone: string
    picture?: string
  }>('/public/auth/register', data)
  return {
    id: res.data.id,
    name: res.data.name,
    email: res.data.email,
    phone: res.data.phone,
    picture: res.data.picture,
    token: res.data.access_token,
    provider: 'email',
  }
}

export async function guestLogin(data: GuestLoginData): Promise<GuestUserProfile> {
  const res = await api.post<{
    access_token: string
    id: number
    name: string
    email: string
    phone: string
    picture?: string
  }>('/public/auth/login', data)
  return {
    id: res.data.id,
    name: res.data.name,
    email: res.data.email,
    phone: res.data.phone,
    picture: res.data.picture,
    token: res.data.access_token,
    provider: 'email',
  }
}
