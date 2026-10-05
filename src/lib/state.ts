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

export function effectiveSaved(goal: Goal, savingsByGoal: Record<string, number>): number {
  return goal.saved + (savingsByGoal[goal.id] ?? 0)
}

export function defaultCategories(): Category[] {
  return [
    { id: 'makan', name: 'Makan & Minum', ratio: 0.5, builtin: true, color: '#e8590c' },
    { id: 'transport', name: 'Transport / Bensin', ratio: 0.15, builtin: true, color: '#1971c2' },
    { id: PULSA_CATEGORY, name: 'Pulsa & Kuota', ratio: 0.05, builtin: true, color: '#0c8599' },
    { id: 'nongkrong', name: 'Nongkrong / Ngopi', ratio: 0.1, builtin: true, color: '#9c36b5' },
    { id: SAVINGS_CATEGORY, name: 'Ditabung / Investasi', ratio: 0.2, builtin: true, color: '#2f9e44' },
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
    profile: 'standar',
    categories: defaultCategories(),
    presets: [],
    expenses: [],
    incomes: [],
    goals: [],
    wishlist: [],
    currentAge: 17,
    theme: 'light',
  }
}
