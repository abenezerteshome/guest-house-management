import { api } from './client'
import type {
  DailyReport,
  ExpenseAnalysisReport,
  IncomeAnalysisReport,
  MonthlyReport,
  WeeklyReport,
} from '../types/api'

export async function getDailyReport(target_date?: string): Promise<DailyReport> {
  const res = await api.get<DailyReport>('/reports/daily', {
    params: target_date ? { target_date } : undefined,
  })
  return res.data
}

export async function getIncomeAnalysis(params?: {
  period?: string
  start_date?: string
  end_date?: string
}): Promise<IncomeAnalysisReport> {
  const res = await api.get<IncomeAnalysisReport>('/reports/income-analysis', { params })
  return res.data
}

export async function getExpensesAnalysis(params?: {
  period?: string
  start_date?: string
  end_date?: string
}): Promise<ExpenseAnalysisReport> {
  const res = await api.get<ExpenseAnalysisReport>('/reports/expenses-analysis', { params })
  return res.data
}

export async function getWeeklyReport(target_date?: string): Promise<WeeklyReport> {
  const res = await api.get<WeeklyReport>('/reports/weekly', {
    params: target_date ? { target_date } : undefined,
  })
  return res.data
}

export async function getMonthlyReport(year?: number, month?: number): Promise<MonthlyReport> {
  const res = await api.get<MonthlyReport>('/reports/monthly', {
    params: { year, month },
  })
  return res.data
}
