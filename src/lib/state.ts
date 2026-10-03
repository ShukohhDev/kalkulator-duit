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

export function defaultCategories(): Category[] {
  return [
    { id: 'makan', name: 'Makan & Minum', ratio: 0.5, builtin: true, color: '#e8590c' },
    { id: 'transport', name: 'Transport & Pulsa', ratio: 0.2, builtin: true, color: '#1971c2' },
    { id: 'nongkrong', name: 'Nongkrong / Ngopi', ratio: 0.1, builtin: true, color: '#9c36b5' },
    { id: 'tabungan', name: 'Ditabung / Investasi', ratio: 0.2, builtin: true, color: '#2f9e44' },
  ]
}

export function primaryGoal(goals: Goal[]): Goal | undefined {
  return goals.find((goal) => goal.primary) ?? goals[0]
}

export function initialState(): AppState {
  return {
    version: 1,
    mode: null,
    allowance: 0,
    categories: defaultCategories(),
    expenses: [],
    incomes: [],
    goals: [],
    currentAge: 17,
    theme: 'light',
  }
}
