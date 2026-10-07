export type PeriodMode = 'week' | 'month'

export type Theme = 'light' | 'dark'

export type ProfileId = 'tinggal-rumah' | 'tinggal-kos'

// jenis kategori untuk perilaku sisa uang: harian dibawa ke periode berikutnya,
// keinginan disarankan pindah ke tabungan (konfirmasi manual), tabungan menumpuk natural
export type CategoryKind = 'harian' | 'keinginan' | 'tabungan'

export interface Category {
  id: string
  name: string
  ratio: number
  builtin: boolean
  color: string
  optional?: boolean
  off?: boolean
  baseRatio?: number
  kind?: CategoryKind
}

export interface Expense {
  id: string
  date: string
  categoryId: string
  note: string
  amount: number
  goalId?: string
  wishlistId?: string
  seasonalId?: string
  receiptId?: string
}

export type IncomeDestination = { kind: 'jajan' } | { kind: 'pot' } | { kind: 'wallet'; walletId: string }

export interface Income {
  id: string
  date: string
  source: string
  amount: number
  generated?: boolean
  receiptId?: string
  destination?: IncomeDestination
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

// dana musiman: wadah terpisah dari target tabungan (tanpa bunga), opsional ada tanggal tujuan
export interface SeasonalFund {
  id: string
  name: string
  target: number
  dueDate?: string
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

export interface ShoppingItem {
  id: string
  name: string
  estimatedPrice: number
  checked: boolean
  categoryId?: string
}

export interface AppState {
  version: 1
  mode: PeriodMode | null
  allowance: number
  incomeVar: boolean
  allowanceMax: number
  bonusSplit: BonusSplit
  profile: ProfileId
  lifestyle: string
  categories: Category[]
  expenses: Expense[]
  incomes: Income[]
  goals: Goal[]
  wishlist: WishlistItem[]
  seasonal: SeasonalFund[]
  debts: Debt[]
  bills: Bill[]
  wallets: Wallet[]
  currentAge: number
  theme: Theme
  activity: ActivityEntry[]
  endSavings: number
  periodKey: string
  shoppingList?: ShoppingItem[]
}

export type ActivityKind = 'pemasukan' | 'pengeluaran' | 'login' | 'logout'

// persentase pembagian bonus pemasukan tidak tetap (jumlah 100)
export interface BonusSplit {
  savings: number
  buffer: number
  fun: number
}

export interface ActivityEntry {
  id: string
  ts: number
  kind: ActivityKind
  text: string
}

export type CashflowView = 'day' | 'week' | 'month' | 'year'
export type CashflowChartType = 'bar' | 'line' | 'donut' | 'category'

export type Notify = (text: string, options?: { error?: boolean; undo?: () => void }) => void
