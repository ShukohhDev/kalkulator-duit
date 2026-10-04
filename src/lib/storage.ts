import type { AppState, Category, CategoryPreset, Expense, Goal, Income, PeriodMode } from '../types'
import { initialState, defaultCategories, PULSA_CATEGORY } from './state'
import { MAX_USER_PRESETS } from './presets'

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

function sanitizeCategoryList(value: unknown): Category[] {
  if (!Array.isArray(value)) return []
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

function sanitizeCategories(value: unknown): Category[] {
  const list = sanitizeCategoryList(value)
  return list.length > 0 ? list : defaultCategories()
}

function normalizeRatios(categories: Category[]): Category[] {
  const sum = categories.reduce((total, category) => total + category.ratio, 0)
  if (sum <= 0 || Math.abs(sum - 1) < 1e-9) return categories
  return categories.map((category) => ({ ...category, ratio: category.ratio / sum }))
}

// data lama (4 kategori, "Transport & Pulsa" 20%) dipecah: transport 3/4, pulsa 1/4 — jumlah tetap 100%
function migrateCategories(categories: Category[]): Category[] {
  if (categories.some((category) => category.id === PULSA_CATEGORY)) return categories
  const pulsa = defaultCategories().find((category) => category.id === PULSA_CATEGORY)
  if (!pulsa) return categories

  // nama/warna kategori bawaan ikut disegarkan (mis. "Transport & Pulsa" → "Transport / Bensin")
  const defaults = new Map(defaultCategories().map((category) => [category.id, category]))
  const refreshed = categories.map((category) => {
    const fallback = category.builtin ? defaults.get(category.id) : undefined
    return fallback ? { ...category, name: fallback.name, color: fallback.color } : category
  })

  const index = refreshed.findIndex((category) => category.id === 'transport' && category.builtin)
  if (index >= 0) {
    const transport = refreshed[index]
    const next = [...refreshed]
    next[index] = { ...transport, ratio: transport.ratio * 0.75 }
    next.splice(index + 1, 0, { ...pulsa, ratio: transport.ratio * 0.25 })
    return normalizeRatios(next)
  }

  // jalur langka: tanpa transport bawaan — pulsa 5% diambil dari rasio terbesar
  const next = [...refreshed]
  let biggest = -1
  next.forEach((category, i) => {
    if (category.ratio > (next[biggest]?.ratio ?? -1)) biggest = i
  })
  if (biggest >= 0 && next[biggest].ratio >= pulsa.ratio) {
    next[biggest] = { ...next[biggest], ratio: next[biggest].ratio - pulsa.ratio }
  }
  next.push(pulsa)
  return normalizeRatios(next)
}

function sanitizePresets(value: unknown): CategoryPreset[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `pre-${index}`),
      name: str(item.name, '').trim(),
      categories: sanitizeCategoryList(item.categories),
    }))
    .filter((item) => item.name !== '' && item.categories.length > 0)
    .slice(0, MAX_USER_PRESETS)
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
      active: typeof item.active === 'boolean' ? item.active : true,
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
    categories: migrateCategories(sanitizeCategories(data.categories)),
    presets: sanitizePresets(data.presets),
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
