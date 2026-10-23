import type { AppState, PeriodMode } from '../types'
import { allocationFor, periodRange, type PeriodRange } from './allocation'
import { addDays } from './money'

function previousPeriod(mode: PeriodMode, current: PeriodRange): PeriodRange {
  if (mode === 'week') return periodRange('week', addDays(current.start, -1))
  return periodRange('month', new Date(current.start.getFullYear(), current.start.getMonth(), 0))
}

function spentBetween(state: AppState, fromISO: string, toISO: string): Record<string, number> {
  const spent: Record<string, number> = {}
  for (const expense of state.expenses) {
    if (expense.date < fromISO || expense.date > toISO) continue
    spent[expense.categoryId] = (spent[expense.categoryId] ?? 0) + expense.amount
  }
  return spent
}

export interface SweepCalculation {
  totalSurplus: number
  totalOverspent: number
  netSwept: number
  breakdown: Array<{
    categoryId: string
    categoryName: string
    allocated: number
    spent: number
    diff: number
  }>
}

export function calculateSweep(state: AppState, fromISO: string, toISO: string): SweepCalculation {
  const spent = spentBetween(state, fromISO, toISO)
  let totalSurplus = 0
  let totalOverspent = 0
  const breakdown: SweepCalculation['breakdown'] = []

  for (const category of state.categories) {
    const allocated = allocationFor(state.allowance, category.id, state.categories)
    const actual = spent[category.id] ?? 0
    const diff = allocated - actual

    if (diff > 0) {
      totalSurplus += diff
    } else if (diff < 0) {
      totalOverspent += Math.abs(diff)
    }

    breakdown.push({
      categoryId: category.id,
      categoryName: category.name,
      allocated,
      spent: actual,
      diff,
    })
  }

  const knownCatIds = new Set(state.categories.map((c) => c.id))
  for (const [catId, amount] of Object.entries(spent)) {
    if (!knownCatIds.has(catId)) {
      totalOverspent += amount
      breakdown.push({
        categoryId: catId,
        categoryName: 'Lainnya',
        allocated: 0,
        spent: amount,
        diff: -amount,
      })
    }
  }

  const netSwept = Math.max(0, totalSurplus - totalOverspent)

  return {
    totalSurplus,
    totalOverspent,
    netSwept,
    breakdown,
  }
}

// Sisa uang jajan periode lalu dihitung dengan mengurangi kartu saku yang sisa
// dengan kartu saku yang melebihi batas (overspent). Hasil bersih positif disapu ke Tabungan akhir periode.
export function sweepTransition(state: AppState, period: PeriodRange): AppState {
  if (!state.mode) return state
  const key = period.startISO
  if (state.periodKey === key) return state
  // inisialisasi (data lama/pertama kali): tandai periode tanpa menyapu sisa
  if (state.periodKey === '') return { ...state, periodKey: key }

  const prev = previousPeriod(state.mode, period)
  const { netSwept } = calculateSweep(state, prev.startISO, prev.endISO)

  return { ...state, periodKey: key, endSavings: state.endSavings + Math.round(netSwept) }
}
