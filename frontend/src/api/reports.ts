import { api } from './client'
import type {
  DailyManifestReport,
  DailyReport,
  ExpenseAnalysisReport,
  IncomeAnalysisReport,
  MonthlyReport,
  WeeklyReport,
} from '../types/api'

export async function getDailyManifest(
  target_date?: string,
  property_id?: number | null
): Promise<DailyManifestReport> {
  const res = await api.get<DailyManifestReport>('/reports/daily-manifest', {
    params: {
      ...(target_date ? { target_date } : {}),
      ...(property_id ? { property_id } : {}),
    },
  })
  return res.data
}

export async function getDailyReport(
  target_date?: string,
  property_id?: number | null
): Promise<DailyReport> {
  const res = await api.get<DailyReport>('/reports/daily', {
    params: {
      ...(target_date ? { target_date } : {}),
      ...(property_id ? { property_id } : {}),
    },
  })
  return res.data
}

export async function getIncomeAnalysis(params?: {
  period?: string
  start_date?: string
  end_date?: string
  property_id?: number | null
}): Promise<IncomeAnalysisReport> {
  const res = await api.get<IncomeAnalysisReport>('/reports/income-analysis', {
    params: {
      ...params,
      ...(params?.property_id ? { property_id: params.property_id } : {}),
    },
  })
  return res.data
}

export async function getExpensesAnalysis(params?: {
  period?: string
  start_date?: string
  end_date?: string
  property_id?: number | null
}): Promise<ExpenseAnalysisReport> {
  const res = await api.get<ExpenseAnalysisReport>('/reports/expenses-analysis', {
    params: {
      ...params,
      ...(params?.property_id ? { property_id: params.property_id } : {}),
    },
  })
  return res.data
}

export async function getWeeklyReport(
  target_date?: string,
  property_id?: number | null
): Promise<WeeklyReport> {
  const res = await api.get<WeeklyReport>('/reports/weekly', {
    params: {
      ...(target_date ? { target_date } : {}),
      ...(property_id ? { property_id } : {}),
    },
  })
  return res.data
}

export async function getMonthlyReport(
  year?: number,
  month?: number,
  property_id?: number | null
): Promise<MonthlyReport> {
  const res = await api.get<MonthlyReport>('/reports/monthly', {
    params: {
      year,
      month,
      ...(property_id ? { property_id } : {}),
    },
  })
  return res.data
}
