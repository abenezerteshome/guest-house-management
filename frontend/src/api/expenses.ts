import { api } from './client'
import type { Expense } from '../types/api'

export async function getExpenses(params?: {
  category?: string
  start_date?: string
  end_date?: string
}): Promise<Expense[]> {
  const res = await api.get<Expense[]>('/expenses', { params })
  return res.data
}

export async function createExpense(data: {
  category: string
  reason?: string
  description: string
  amount: number | string
  payment_method: string
  expense_date?: string
}): Promise<Expense> {
  const res = await api.post<Expense>('/expenses', {
    ...data,
    amount: String(data.amount),
  })
  return res.data
}

export async function updateExpense(
  id: number,
  data: {
    category?: string
    reason?: string
    description?: string
    amount?: number | string
    payment_method?: string
    expense_date?: string
  }
): Promise<Expense> {
  const payload: Record<string, unknown> = { ...data }
  if (data.amount !== undefined) {
    payload.amount = String(data.amount)
  }
  const res = await api.put<Expense>(`/expenses/${id}`, payload)
  return res.data
}

export async function deleteExpense(id: number): Promise<void> {
  await api.delete(`/expenses/${id}`)
}

