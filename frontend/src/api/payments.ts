import { api } from './client'
import type { Payment } from '../types/api'

export async function recordManualPayment(data: {
  stay_id: number
  amount: number | string
  payment_method: 'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER' | 'CREDIT'
  reference?: string
}): Promise<Payment> {
  const res = await api.post<Payment>(`/stays/${data.stay_id}/payments`, {
    amount: String(data.amount),
    payment_method: data.payment_method,
    reference: data.reference,
  })
  return res.data
}

export async function getPaymentById(paymentId: number): Promise<Payment> {
  const res = await api.get<Payment>(`/payments/${paymentId}`)
  return res.data
}

export async function getStayPayments(stay_id: number): Promise<Payment[]> {
  const res = await api.get<Payment[]>(`/stays/${stay_id}/payments`)
  return res.data
}
