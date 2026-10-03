import type { AppState, Category, Expense, Goal, Income, PeriodMode } from '../types'
import { initialState, defaultCategories } from './state'

const STORAGE_KEY = 'kalkulator-duitmu:v1'

function isPeriodMode(value: unknown): value is PeriodMode {
  return value === 'week' || value === 'month'
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function sanitizeCategories(value: unknown): Category[] {
  if (!Array.isArray(value) || value.length === 0) return defaultCategories()
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `cat-${index}`),
      name: str(item.name, `Kategori ${index + 1}`),
      ratio: Math.max(0, num(item.ratio)),
      builtin: Boolean(item.builtin),
      color: str(item.color, '#f08c00'),
    }))
}

function sanitizeExpenses(value: unknown): Expense[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `exp-${index}`),
      date: str(item.date),
      categoryId: str(item.categoryId),
      note: str(item.note),
      amount: Math.max(0, num(item.amount)),
      goalId: typeof item.goalId === 'string' && item.goalId !== '' ? item.goalId : undefined,
    }))
    .filter((item) => item.date !== '')
}

function sanitizeIncomes(value: unknown): Income[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `inc-${index}`),
      date: str(item.date),
      source: str(item.source),
      amount: Math.max(0, num(item.amount)),
      generated: Boolean(item.generated),
    }))
    .filter((item) => item.date !== '')
}

function sanitizeGoals(value: unknown): Goal[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `goal-${index}`),
      name: str(item.name, `Target ${index + 1}`),
      target: Math.max(0, num(item.target)),
      saved: Math.max(0, num(item.saved)),
      deposit: Math.max(0, num(item.deposit)),
      targetAge: Math.max(18, num(item.targetAge, 18)),
      primary: Boolean(item.primary),
    }))
    .filter((item) => item.target > 0)
}

export function sanitize(raw: unknown): AppState {
  const base = initialState()
  if (!raw || typeof raw !== 'object') return base
  const data = raw as Record<string, unknown>

  const state: AppState = {
    version: 1,
    mode: isPeriodMode(data.mode) ? data.mode : null,
    allowance: Math.max(0, num(data.allowance)),
    categories: sanitizeCategories(data.categories),
    expenses: sanitizeExpenses(data.expenses),
    incomes: sanitizeIncomes(data.incomes),
    goals: sanitizeGoals(data.goals),
    currentAge: Math.max(1, num(data.currentAge, base.currentAge)),
    theme: data.theme === 'dark' ? 'dark' : 'light',
  }

  if (state.goals.length > 0 && !state.goals.some((goal) => goal.primary)) {
    state.goals[0].primary = true
  }

  return state
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    return sanitize(JSON.parse(raw))
  } catch {
    return initialState()
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage penuh/di-block: abaikan, data tetap hidup di memori
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // no-op
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2)
}
