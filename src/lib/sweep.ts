import type { AppState, PeriodMode } from '../types'
import { periodRange, type PeriodRange } from './allocation'
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

// honey: alokasi periode lalu dihitung ulang dengan allowance sekarang (alokasi lama tidak
// disimpan) — cukup akurat selama nominal uang jajan tidak diubah di tengah periode.
// Gagal bawa kalau app dilewati lebih dari satu periode penuh: hanya periode sebelumnya yang dihitung.
export function sweepTransition(state: AppState, period: PeriodRange): AppState {
  if (!state.mode) return state
  const key = period.startISO
  if (state.periodKey === key) return state
  // inisialisasi (data lama/pertama kali): tandai periode tanpa menyapu sisa
  if (state.periodKey === '') return { ...state, periodKey: key }

  const prev = previousPeriod(state.mode, period)
  const spent = spentBetween(state, prev.startISO, prev.endISO)
  let swept = 0
  for (const category of state.categories) {
    const base = state.allowance * category.ratio
    swept += Math.max(0, base - (spent[category.id] ?? 0))
  }
  return { ...state, periodKey: key, endSavings: state.endSavings + Math.round(swept) }
}
