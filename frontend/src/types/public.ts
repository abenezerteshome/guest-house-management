export interface PublicRoom {
  id: number
  room_number: string
  room_type: string
  price: string | number
  status: 'AVAILABLE' | 'OCCUPIED' | 'EXPECTED' | 'CLEANING' | 'MAINTENANCE'
  capacity: number
  amenities: string[]
  image_url?: string
}

export interface PublicBookingRequest {
  full_name: string
  email?: string
  phone: string
  id_number?: string
  nationality?: string
  room_id: number
  expected_arrival: string
  expected_checkout: string
  special_requests?: string
  google_id_token?: string
}

export interface PublicBookingConfirmation {
  reservation_id: number
  booking_reference: string
  guest_name: string
  phone: string
  room_id: number
  room_number: string
  room_type: string
  price_per_night: string | number
  total_estimated: string | number
  expected_arrival: string
  expected_checkout: string
  status: string
  checkout_deadline: string
  notes?: string
}

export interface GoogleUserProfile {
  email: string
  name: string
  picture?: string
  sub: string
}

export interface GuestUserProfile {
  id?: number
  name: string
  email: string
  phone?: string
  picture?: string
  token?: string
  provider: 'email' | 'google'
}

export interface GuestRegisterData {
  full_name: string
  email: string
  phone: string
  password: string
}

export interface GuestLoginData {
  identifier: string
  password: string
}
