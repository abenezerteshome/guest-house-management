export type Role = 'ADMIN' | 'RECEPTION'

export interface User {
  id: number
  full_name: string
  username: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export type RoomStatusType = 'AVAILABLE' | 'OCCUPIED' | 'EXPECTED' | 'CLEANING' | 'MAINTENANCE'

export interface Room {
  id: number
  room_number: string
  room_type: string
  price: string
  status: RoomStatusType
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Guest {
  id: number
  full_name: string
  id_number: string
  phone: string
  address: string | null
  nationality: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Reservation {
  id: number
  guest_id: number
  room_id: number
  status: string
  expected_arrival: string
  expected_checkout: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Stay {
  id: number
  reservation_id: number
  guest_id: number
  room_id: number
  check_in_at: string
  expected_checkout: string
  actual_checkout_at: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Charge {
  id: number
  stay_id: number
  charge_type: string
  description: string
  amount: string
  quantity: number
  charged_at: string
  created_by: number | null
  created_at: string
}

export interface Payment {
  id: number
  stay_id: number
  amount: string
  payment_method: string
  status: string
  reference: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface FinancialSummary {
  stay_id: number
  total_due: string
  total_paid: string
  balance: string
}

export interface Expense {
  id: number
  category: string
  description: string
  amount: string
  payment_method: string
  expense_date: string
  recorded_by: number | null
  created_at: string
}

export interface DailyReport {
  date: string
  todays_income: string
  todays_expenses: string
  net_income: string
  occupied_rooms: number
  available_rooms: number
  expected_rooms: number
  cleaning_rooms: number
  maintenance_rooms: number
  check_ins_count: number
  check_outs_count: number
  penalties_total: string
  outstanding_credit: string
}

export interface PaymentMethodIncome {
  method: string
  amount: string
  count: number
}

export interface IncomeAnalysisReport {
  period: string
  start_date: string
  end_date: string
  by_method: PaymentMethodIncome[]
  total_income: string
}

export interface ExpenseCategoryItem {
  category: string
  amount: string
  percentage: number
}

export interface ExpenseAnalysisReport {
  period: string
  start_date: string
  end_date: string
  by_category: ExpenseCategoryItem[]
  total_expenses: string
}

export interface DaySummary {
  day: string
  date: string
  income: string
  expense: string
  net: string
}

export interface WeeklyReport {
  start_date: string
  end_date: string
  days: DaySummary[]
  total_income: string
  total_expense: string
  net_income: string
}

export interface MonthlyReport {
  month: string
  total_income: string
  total_expenses: string
  net_income: string
  total_guests: number
  average_daily_income: string
  total_credit: string
  total_penalties: string
  occupancy_rate: number
}

export interface SettingsData {
  checkout_deadline_hour: number
  checkout_deadline_minute: number
  late_checkout_penalty: string
  property_name: string
  currency: string
}