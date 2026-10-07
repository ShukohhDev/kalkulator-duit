import type { ActivityEntry, AppState, Bill, Category, CategoryKind, Debt, Expense, Goal, Income, PeriodMode, SeasonalFund, ShoppingItem, WishlistItem } from '../types'
import { initialState, defaultCategories, defaultWallets, PULSA_CATEGORY, CICILAN_CATEGORY, TAGIHAN_CATEGORY } from './state'
import { migrateProfileId } from './profiles'
import { currentUser } from './auth'
import { MAX_ACTIVITY } from './activity'
import { sanitizeBonusSplit } from './bonus'
import { isLifestyleId } from './lifestyles'

const STORAGE_BASE = 'kalkulator-duitmu:v1'

// tanpa sesi (layar login) pakai key lama — hanya untuk jalur migrasi/belum ada akun
function stateKey(): string {
  const user = currentUser()
  return user ? `${STORAGE_BASE}:${user}` : STORAGE_BASE
}

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
  const kinds: CategoryKind[] = ['harian', 'keinginan', 'tabungan']
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `cat-${index}`),
      name: str(item.name, `Kategori ${index + 1}`),
      ratio: Math.max(0, num(item.ratio)),
      builtin: Boolean(item.builtin),
      color: str(item.color, '#f08c00'),
      ...(item.optional ? { optional: true } : {}),
      ...(item.off ? { off: true } : {}),
      ...(num(item.baseRatio) > 0 ? { baseRatio: num(item.baseRatio) } : {}),
      ...(kinds.includes(item.kind as CategoryKind) ? { kind: item.kind as CategoryKind } : {}),
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

// nama/warna/flag kategori bawaan ikut disegarkan mengikuti default terbaru (id tetap, data catatan aman)
function refreshBuiltins(categories: Category[]): Category[] {
  const defaults = new Map(defaultCategories().map((category) => [category.id, category]))
  return categories.map((category) => {
    const fallback = category.builtin ? defaults.get(category.id) : undefined
    if (!fallback) return category
    return { ...category, name: fallback.name, color: fallback.color, ...(fallback.optional ? { optional: true } : {}) }
  })
}

// data lama (4 kategori, "Transport & Pulsa" 20%) dipecah: transport 3/4, pulsa 1/4, jumlah tetap 100%
function migrateCategories(categories: Category[]): Category[] {
  const migrated = migratePulsa(refreshBuiltins(categories))
  const missing = defaultCategories().filter(
    (category) =>
      (category.id === CICILAN_CATEGORY || category.id === TAGIHAN_CATEGORY) &&
      !migrated.some((existing) => existing.id === category.id),
  )
  return missing.length > 0 ? [...migrated, ...missing] : migrated
}

function migratePulsa(categories: Category[]): Category[] {
  if (categories.some((category) => category.id === PULSA_CATEGORY)) return categories
  const pulsa = defaultCategories().find((category) => category.id === PULSA_CATEGORY)
  if (!pulsa) return categories

  const index = categories.findIndex((category) => category.id === 'transport' && category.builtin)
  if (index >= 0) {
    const transport = categories[index]
    const next = [...categories]
    next[index] = { ...transport, ratio: transport.ratio * 0.75 }
    next.splice(index + 1, 0, { ...pulsa, ratio: transport.ratio * 0.25 })
    return normalizeRatios(next)
  }

  // jalur langka: tanpa transport bawaan, pulsa 5% diambil dari rasio terbesar
  const next = [...categories]
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
      wishlistId: typeof item.wishlistId === 'string' && item.wishlistId !== '' ? item.wishlistId : undefined,
      seasonalId: typeof item.seasonalId === 'string' && item.seasonalId !== '' ? item.seasonalId : undefined,
      receiptId: typeof item.receiptId === 'string' && item.receiptId !== '' ? item.receiptId : undefined,
    }))
    .filter((item) => item.date !== '')
}

function sanitizeWishlist(value: unknown): WishlistItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `wish-${index}`),
      name: str(item.name, 'Incaran baru').trim() || 'Incaran baru',
      price: Math.max(0, num(item.price)),
      saved: Math.max(0, num(item.saved)),
    }))
}

function sanitizeSeasonal(value: unknown): SeasonalFund[] {
  if (!Array.isArray(value)) return []
  const dueDate = (item: Record<string, unknown>) => {
    const raw = str(item.dueDate)
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined
  }
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `season-${index}`),
      name: str(item.name, 'Dana musiman baru').trim() || 'Dana musiman baru',
      target: Math.max(0, num(item.target)),
      saved: Math.max(0, num(item.saved)),
      ...(dueDate(item) ? { dueDate: dueDate(item) } : {}),
    }))
}

function sanitizeShoppingList(value: unknown): ShoppingItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `shop-${index}`),
      name: str(item.name, 'Barang belanjaan').trim() || 'Barang belanjaan',
      estimatedPrice: Math.max(0, num(item.estimatedPrice)),
      checked: Boolean(item.checked),
      categoryId: typeof item.categoryId === 'string' && item.categoryId !== '' ? item.categoryId : undefined,
    }))
}

function sanitizeDebts(value: unknown): Debt[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `debt-${index}`),
      name: str(item.name, 'Utang').trim() || 'Utang',
      total: Math.max(0, num(item.total)),
      paid: Math.max(0, num(item.paid)),
      installment: Math.max(0, num(item.installment)),
      dueDay: Math.min(28, Math.max(1, Math.round(num(item.dueDay, 1)))),
    }))
    .filter((item) => item.total > 0 && item.installment > 0)
}

function sanitizeBills(value: unknown): Bill[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `bill-${index}`),
      name: str(item.name, 'Tagihan').trim() || 'Tagihan',
      amount: Math.max(0, num(item.amount)),
      dueDay: Math.min(28, Math.max(1, Math.round(num(item.dueDay, 1)))),
      lastPaid:
        typeof item.lastPaid === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.lastPaid) ? item.lastPaid : undefined,
    }))
    .filter((item) => item.amount > 0)
}

function sanitizeWallets(value: unknown): AppState['wallets'] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id, `wallet-${index}`),
      name: str(item.name, 'Dompet').trim() || 'Dompet',
      balance: num(item.balance),
    }))
}

function sanitizeDestination(value: unknown): Income['destination'] {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  if (raw.kind === 'jajan' || raw.kind === 'pot') return { kind: raw.kind }
  if (raw.kind === 'wallet' && typeof raw.walletId === 'string' && raw.walletId !== '') {
    return { kind: 'wallet', walletId: raw.walletId }
  }
  return undefined
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
      receiptId: typeof item.receiptId === 'string' && item.receiptId !== '' ? item.receiptId : undefined,
      destination: sanitizeDestination(item.destination),
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

function sanitizeActivity(value: unknown): ActivityEntry[] {
  if (!Array.isArray(value)) return []
  const kinds: ActivityEntry['kind'][] = ['pemasukan', 'pengeluaran', 'login', 'logout']
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .filter((item) => kinds.includes(item.kind as ActivityEntry['kind']))
    .map((item, index) => ({
      id: str(item.id, `act-${index}`),
      ts: num(item.ts),
      kind: item.kind as ActivityEntry['kind'],
      text: str(item.text),
    }))
    .filter((item) => item.text !== '')
    .slice(0, MAX_ACTIVITY)
}

// data lama: sisa rollover + penawaran tabungan diakumulasi jadi pot Tabungan akhir periode
function legacyEndSavings(data: Record<string, unknown>): number {
  let sum = Math.max(0, num(data.pendingSavings))
  const raw = data.rollover
  if (raw && typeof raw === 'object') {
    for (const value of Object.values(raw as Record<string, unknown>)) {
      const amount = num(value, -1)
      if (amount > 0) sum += amount
    }
  }
  return sum
}

export function sanitize(raw: unknown): AppState {
  const base = initialState()
  if (!raw || typeof raw !== 'object') return base
  const data = raw as Record<string, unknown>
  const categories = migrateCategories(sanitizeCategories(data.categories))
  const periodKey = str(data.periodKey)

  const state: AppState = {
    version: 1,
    mode: isPeriodMode(data.mode) ? data.mode : null,
    allowance: Math.max(0, num(data.allowance)),
    incomeVar: data.incomeVar === true,
    allowanceMax: Math.max(0, num(data.allowanceMax)),
    bonusSplit: sanitizeBonusSplit(data.bonusSplit),
    profile: migrateProfileId(data.profile),
    lifestyle: isLifestyleId(data.lifestyle) ? data.lifestyle : 'seimbang',
    categories,
    expenses: sanitizeExpenses(data.expenses),
    incomes: sanitizeIncomes(data.incomes),
    goals: sanitizeGoals(data.goals),
    wishlist: sanitizeWishlist(data.wishlist),
    seasonal: sanitizeSeasonal(data.seasonal),
    debts: sanitizeDebts(data.debts),
    bills: sanitizeBills(data.bills),
    wallets: Array.isArray(data.wallets) ? sanitizeWallets(data.wallets) : defaultWallets(),
    currentAge: Math.max(1, num(data.currentAge, base.currentAge)),
    theme: data.theme === 'dark' ? 'dark' : 'light',
    activity: sanitizeActivity(data.activity),
    endSavings: Math.max(0, num(data.endSavings, legacyEndSavings(data))),
    periodKey: /^\d{4}-\d{2}-\d{2}$/.test(periodKey) ? periodKey : '',
    shoppingList: sanitizeShoppingList(data.shoppingList),
  }

  if (state.goals.length > 0 && !state.goals.some((goal) => goal.primary)) {
    state.goals[0].primary = true
  }

  return state
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(stateKey())
    if (!raw) return initialState()
    return sanitize(JSON.parse(raw))
  } catch {
    return initialState()
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(stateKey(), JSON.stringify(state))
  } catch {
    // storage penuh/di-block: abaikan, data tetap hidup di memori
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(stateKey())
  } catch {
    // no-op
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2)
}
