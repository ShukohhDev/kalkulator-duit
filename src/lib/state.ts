import type { AppState, Category, Goal } from '../types'

export const CATEGORY_COLORS = [
  '#e8590c',
  '#1971c2',
  '#9c36b5',
  '#2f9e44',
  '#f08c00',
  '#0c8599',
  '#d6336c',
  '#5f3dc4',
]

export const SAVINGS_CATEGORY = 'tabungan'
export const PULSA_CATEGORY = 'pulsa'
export const CICILAN_CATEGORY = 'cicilan'
export const TAGIHAN_CATEGORY = 'tagihan'
export const INCOME_SOURCES = ['Uang Lembaran', 'Transfer']

export function effectiveSaved(goal: Goal, savingsByGoal: Record<string, number>): number {
  return goal.saved + (savingsByGoal[goal.id] ?? 0)
}

export function defaultCategories(): Category[] {
  return [
    { id: 'makan', name: 'Makan & minum', ratio: 0.3, builtin: true, color: '#e8590c' },
    { id: 'transport', name: 'Transportasi/bensin', ratio: 0.2, builtin: true, color: '#1971c2' },
    { id: PULSA_CATEGORY, name: 'Pulsa/kuota', ratio: 0.05, builtin: true, color: '#0c8599', optional: true },
    { id: 'nongkrong', name: 'Nongkrong & ngopi', ratio: 0.15, builtin: true, color: '#9c36b5' },
    { id: 'dana-darurat', name: 'Dana darurat', ratio: 0.07, builtin: true, color: '#f08c00' },
    { id: SAVINGS_CATEGORY, name: 'Ditabung', ratio: 0.2, builtin: true, color: '#2f9e44' },
    { id: 'langganan', name: 'Langganan', ratio: 0.03, builtin: true, color: '#5f3dc4', optional: true },
    { id: CICILAN_CATEGORY, name: 'Cicilan', ratio: 0, builtin: true, color: '#d6336c' },
    { id: TAGIHAN_CATEGORY, name: 'Tagihan', ratio: 0, builtin: true, color: '#d6336c' },
  ]
}

export function defaultWallets(): AppState['wallets'] {
  return [
    { id: 'wallet-rekening', name: 'Rekening bank', balance: 0 },
    { id: 'wallet-ewallet', name: 'E-wallet', balance: 0 },
    { id: 'wallet-tunai', name: 'Tunai', balance: 0 },
  ]
}

export function primaryGoal(goals: Goal[]): Goal | undefined {
  return goals.find((goal) => goal.primary) ?? goals[0]
}

export function activeGoals(goals: Goal[]): Goal[] {
  return goals.filter((goal) => goal.active && goal.target > 0).sort((a, b) => a.targetAge - b.targetAge)
}

export function initialState(): AppState {
  return {
    version: 1,
    mode: null,
    allowance: 0,
    profile: 'tinggal-rumah',
    categories: defaultCategories(),
    presets: [],
    expenses: [],
    incomes: [],
    goals: [],
    wishlist: [],
    debts: [],
    bills: [],
    wallets: defaultWallets(),
    currentAge: 17,
    theme: 'light',
  }
}
