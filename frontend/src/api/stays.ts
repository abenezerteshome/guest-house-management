import { api } from './client'
import type { Charge, FinancialSummary, Payment, Stay } from '../types/api'

export async function getStays(status?: string): Promise<Stay[]> {
  const res = await api.get<Stay[]>('/stays', { params: status ? { status } : undefined })
  return res.data
}

export async function getStay(id: number): Promise<Stay> {
  const res = await api.get<Stay>(`/stays/${id}`)
  return res.data
}

export async function checkInReservation(reservation_id: number): Promise<Stay> {
  const res = await api.post<Stay>(`/reservations/${reservation_id}/check-in`)
  return res.data
}

export async function checkOutStay(
  stay_id: number,
  penalty_amount?: number,
  actual_checkout_at?: string
): Promise<Stay> {
  const res = await api.post<Stay>(
    `/stays/${stay_id}/check-out`,
    penalty_amount !== undefined || actual_checkout_at !== undefined
      ? { penalty_amount, actual_checkout_at }
      : undefined
  )
  return res.data
}

export async function extendStay(stay_id: number, new_expected_checkout: string): Promise<Stay> {
  const res = await api.patch<Stay>(`/stays/${stay_id}/extend`, { new_expected_checkout })
  return res.data
}

export async function getStayFinancialSummary(stay_id: number): Promise<FinancialSummary> {
  const res = await api.get<FinancialSummary>(`/stays/${stay_id}/financial-summary`)
  return res.data
}

export async function getStayCharges(stay_id: number): Promise<Charge[]> {
  const res = await api.get<Charge[]>(`/stays/${stay_id}/charges`)
  return res.data
}

export async function getStayPayments(stay_id: number): Promise<Payment[]> {
  const res = await api.get<Payment[]>(`/stays/${stay_id}/payments`)
  return res.data
}
