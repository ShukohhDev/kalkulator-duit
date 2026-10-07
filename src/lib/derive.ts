import type { AppState, CashflowView, Income, PeriodMode } from '../types'
import {
  allocationFor,
  dailyAllowanceEntries,
  periodRange,
  type PeriodRange,
} from './allocation'
import { addDays, daysBetween, monthKey, parseISO, perDay, perWeek, perMonth, toISO, toYearly } from './money'
import { SAVINGS_CATEGORY } from './state'

export interface Derived {
  mode: PeriodMode | null
  yearly: number
  daily: number
  weekly: number
  monthly: number
  period: PeriodRange | null
  elapsedDays: number
  generatedIncomes: Income[]
  allIncomes: Income[]
  totalIncome: number
  totalExpense: number
  spentInPeriod: number
  spentByCategory: Record<string, number>
  savingsByGoal: Record<string, number>
  wishlistSavings: Record<string, number>
  seasonalSavings: Record<string, number>
  allocationByCategory: Record<string, number>
  allocationInPeriod: number
  remainingInPeriod: number
  safeToSpend: number
}

function earliestDate(state: AppState, fallback: string): string {
  const dates = [
    ...state.expenses.map((item) => item.date),
    ...state.incomes.map((item) => item.date),
    fallback,
  ]
  return dates.reduce((min, date) => (date < min ? date : min), fallback)
}

export function derive(state: AppState, now: Date = new Date()): Derived {
  const mode = state.mode
  const yearly = mode ? toYearly(state.allowance, mode) : 0

  const period = mode ? periodRange(mode, now) : null
  const elapsedDays = period ? Math.min(period.totalDays, Math.max(0, daysBetween(period.start, now) + 1)) : 0
  const todayISO = toISO(now)

  let generatedIncomes: Income[] = []
  if (mode && state.allowance > 0) {
    const from = earliestDate(state, period ? period.startISO : todayISO)
    generatedIncomes = dailyAllowanceEntries(state.allowance, mode, from, todayISO).map((entry) => ({
      id: `allowance-day-${entry.iso}`,
      date: entry.iso,
      source: 'Uang jajan harian',
      amount: entry.amount,
      generated: true,
    }))
  }

  const allIncomes = [...state.incomes, ...generatedIncomes].sort((a, b) => b.date.localeCompare(a.date))
  const totalIncome = allIncomes.reduce((sum, item) => sum + item.amount, 0)
  const totalExpense = state.expenses.reduce((sum, item) => sum + item.amount, 0)

  const spentByCategory: Record<string, number> = {}
  const savingsByGoal: Record<string, number> = {}
  const wishlistSavings: Record<string, number> = {}
  const seasonalSavings: Record<string, number> = {}
  let spentInPeriod = 0

  for (const expense of state.expenses) {
    spentByCategory[expense.categoryId] = (spentByCategory[expense.categoryId] ?? 0) + expense.amount
    if (expense.categoryId === SAVINGS_CATEGORY) {
      if (expense.goalId) savingsByGoal[expense.goalId] = (savingsByGoal[expense.goalId] ?? 0) + expense.amount
      if (expense.wishlistId) wishlistSavings[expense.wishlistId] = (wishlistSavings[expense.wishlistId] ?? 0) + expense.amount
      if (expense.seasonalId) seasonalSavings[expense.seasonalId] = (seasonalSavings[expense.seasonalId] ?? 0) + expense.amount
    }
    if (period && expense.date >= period.startISO && expense.date <= period.endISO) {
      spentInPeriod += expense.amount
    }
  }

  const allocationByCategory: Record<string, number> = {}
  let allocationInPeriod = 0
  if (period) {
    for (const category of state.categories) {
      const value = allocationFor(state.allowance, category.id, state.categories)
      allocationByCategory[category.id] = value
      allocationInPeriod += value
    }
  }

  const remainingInPeriod = Math.max(0, state.allowance - spentInPeriod)
  const daysLeft = period ? Math.max(1, period.totalDays - elapsedDays) : 1

  return {
    mode,
    yearly,
    daily: perDay(yearly),
    weekly: perWeek(yearly),
    monthly: perMonth(yearly),
    period,
    elapsedDays,
    generatedIncomes,
    allIncomes,
    totalIncome,
    totalExpense,
    spentInPeriod,
    spentByCategory,
    savingsByGoal,
    wishlistSavings,
    seasonalSavings,
    allocationByCategory,
    allocationInPeriod,
    remainingInPeriod,
    safeToSpend: remainingInPeriod / daysLeft,
  }
}

function bucketKey(date: Date, view: CashflowView): string {
  if (view === 'day') return toISO(date)
  if (view === 'month') return monthKey(toISO(date))
  if (view === 'year') return String(date.getFullYear())
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay()
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset)
  return toISO(start)
}

function bucketLabel(key: string, view: CashflowView): string {
  if (view === 'day') return parseISO(key).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  if (view === 'year') return key
  if (view === 'month') {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
  }
  const start = parseISO(key)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  const sameMonth = start.getMonth() === end.getMonth()
  return `${start.getDate()}${sameMonth ? '' : ' ' + start.toLocaleDateString('id-ID', { month: 'short' })}–${end.getDate()} ${end.toLocaleDateString('id-ID', { month: 'short' })}`
}

const VIEW_LIMIT: Record<CashflowView, number> = { day: 30, week: 26, month: 24, year: 5 }

export interface CashflowSeries {
  labels: string[]
  income: number[]
  expense: number[]
  categoryTotals: Record<string, number>
}

export function buildCashflow(
  incomes: Income[],
  expenses: { date: string; amount: number; categoryId?: string }[],
  view: CashflowView,
  now: Date = new Date(),
): CashflowSeries {
  const allDates = [...incomes.map((i) => i.date), ...expenses.map((e) => e.date)]
  if (allDates.length === 0) return { labels: [], income: [], expense: [], categoryTotals: {} }

  const minDate = allDates.reduce((min, d) => (d < min ? d : min), allDates[0])
  const firstKey = bucketKey(parseISO(minDate), view)
  const lastKey = bucketKey(now, view)

  const buckets = new Map<string, { income: number; expense: number }>()
  let step = parseISO(firstKey)
  let guard = 0
  while (guard < 800) {
    const key = bucketKey(step, view)
    if (!buckets.has(key)) buckets.set(key, { income: 0, expense: 0 })
    if (key === lastKey) break
    step = nextBucket(step, view)
    guard++
  }

  for (const item of incomes) {
    const key = bucketKey(parseISO(item.date), view)
    const bucket = buckets.get(key)
    if (bucket) bucket.income += item.amount
  }
  for (const item of expenses) {
    const key = bucketKey(parseISO(item.date), view)
    const bucket = buckets.get(key)
    if (bucket) bucket.expense += item.amount
  }

  const keys = [...buckets.keys()].slice(-VIEW_LIMIT[view])
  const visible = new Set(keys)
  const categoryTotals: Record<string, number> = {}
  for (const item of expenses) {
    const id = item.categoryId
    if (!id || !visible.has(bucketKey(parseISO(item.date), view))) continue
    categoryTotals[id] = (categoryTotals[id] ?? 0) + item.amount
  }

  return {
    labels: keys.map((key) => bucketLabel(key, view)),
    income: keys.map((key) => buckets.get(key)!.income),
    expense: keys.map((key) => buckets.get(key)!.expense),
    categoryTotals,
  }
}

function nextBucket(date: Date, view: CashflowView): Date {
  if (view === 'day') return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  if (view === 'week') return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7)
  if (view === 'month') return new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return new Date(date.getFullYear() + 1, 0, 1)
}

export interface WeekDayExpense {
  iso: string
  label: string
  total: number
}

export interface WeekExpenseSummary {
  days: WeekDayExpense[]
  total7: number
  today: {
    iso: string
    label: string
    total: number
    byCategory: { id: string; name: string; amount: number }[]
  }
}

const WEEKDAY_INITIALS = ['M', 'S', 'S', 'R', 'K', 'J', 'S']

export function expenseLast7Days(state: AppState, now: Date = new Date()): WeekExpenseSummary {
  const days: WeekDayExpense[] = []
  for (let back = 6; back >= 0; back--) {
    const date = addDays(now, -back)
    const iso = toISO(date)
    const total = state.expenses
      .filter((expense) => expense.date === iso)
      .reduce((sum, expense) => sum + expense.amount, 0)
    days.push({ iso, label: WEEKDAY_INITIALS[date.getDay()], total })
  }

  const todayIso = toISO(now)
  const todayExpenses = state.expenses.filter((expense) => expense.date === todayIso)
  const totalsById = new Map<string, number>()
  for (const expense of todayExpenses) {
    totalsById.set(expense.categoryId, (totalsById.get(expense.categoryId) ?? 0) + expense.amount)
  }
  const byCategory = [...totalsById.entries()]
    .map(([id, amount]) => ({
      id,
      name: state.categories.find((category) => category.id === id)?.name ?? 'Lainnya',
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)

  return {
    days,
    total7: days.reduce((sum, day) => sum + day.total, 0),
    today: {
      iso: todayIso,
      label: now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
      total: todayExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      byCategory,
    },
  }
}
