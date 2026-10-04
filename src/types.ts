export type PeriodMode = 'week' | 'month'

export type Theme = 'light' | 'dark'

export interface Category {
  id: string
  name: string
  ratio: number
  builtin: boolean
  color: string
}

export interface Expense {
  id: string
  date: string
  categoryId: string
  note: string
  amount: number
  goalId?: string
}

export interface Income {
  id: string
  date: string
  source: string
  amount: number
  generated?: boolean
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  deposit: number
  targetAge: number
  primary: boolean
  active: boolean
}

export interface AppState {
  version: 1
  mode: PeriodMode | null
  allowance: number
  categories: Category[]
  expenses: Expense[]
  incomes: Income[]
  goals: Goal[]
  currentAge: number
  theme: Theme
}

export type CashflowView = 'day' | 'week' | 'month' | 'year'
