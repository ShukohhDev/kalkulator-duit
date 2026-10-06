export type PeriodMode = 'week' | 'month'

export type Theme = 'light' | 'dark'

export type ProfileId = 'tinggal-rumah' | 'tinggal-kos'

export interface Category {
  id: string
  name: string
  ratio: number
  builtin: boolean
  color: string
  optional?: boolean
  off?: boolean
  baseRatio?: number
}

export interface Expense {
  id: string
  date: string
  categoryId: string
  note: string
  amount: number
  goalId?: string
  wishlistId?: string
  receiptId?: string
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

export interface WishlistItem {
  id: string
  name: string
  price: number
  saved: number
}

export interface Debt {
  id: string
  name: string
  total: number
  paid: number
  installment: number
  dueDay: number
}

export interface Bill {
  id: string
  name: string
  amount: number
  dueDay: number
  lastPaid?: string
}

export interface Wallet {
  id: string
  name: string
  balance: number
}

export interface CategoryPreset {
  id: string
  name: string
  categories: Category[]
}

export interface AppState {
  version: 1
  mode: PeriodMode | null
  allowance: number
  profile: ProfileId
  categories: Category[]
  presets: CategoryPreset[]
  expenses: Expense[]
  incomes: Income[]
  goals: Goal[]
  wishlist: WishlistItem[]
  debts: Debt[]
  bills: Bill[]
  wallets: Wallet[]
  currentAge: number
  theme: Theme
}

export type CashflowView = 'day' | 'week' | 'month' | 'year'
export type CashflowChartType = 'bar' | 'line' | 'donut' | 'category'

export type Notify = (text: string, options?: { error?: boolean; undo?: () => void }) => void
