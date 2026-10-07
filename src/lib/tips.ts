import type { AppState } from '../types'
import type { Derived } from './derive'
import { formatIDR } from './money'
import { categoryKind } from './state'

export interface Tip {
  id: string
  text: string
}

const MAX_TIPS = 3

function isWeekend(dateISO: string): boolean {
  const day = new Date(`${dateISO}T00:00:00`).getDay()
  return day === 0 || day === 6
}

export function buildTips(state: AppState, derived: Derived): Tip[] {
  const period = derived.period
  if (!period || state.allowance <= 0 || derived.spentInPeriod <= 0) return []

  const expenses = state.expenses.filter(
    (expense) => expense.date >= period.startISO && expense.date <= period.endISO,
  )
  if (expenses.length === 0) return []

  const byCategory = new Map<string, number>()
  for (const expense of expenses) {
    byCategory.set(expense.categoryId, (byCategory.get(expense.categoryId) ?? 0) + expense.amount)
  }

  const out: Tip[] = []

  const topKeinginan = state.categories
    .filter((category) => categoryKind(category) === 'keinginan')
    .map((category) => ({ category, spent: byCategory.get(category.id) ?? 0 }))
    .sort((a, b) => b.spent - a.spent)[0]
  if (topKeinginan && topKeinginan.spent >= derived.spentInPeriod * 0.15) {
    const cut = Math.round(topKeinginan.spent * 0.2)
    out.push({
      id: 'keinginan',
      text: `${topKeinginan.category.name} tercatat ${formatIDR(topKeinginan.spent)} periode ini, pangkas 20% (±${formatIDR(cut)}) untuk dialihkan ke tabungan.`,
    })
  }

  const savedInPeriod = state.categories
    .filter((category) => categoryKind(category) === 'tabungan')
    .reduce((sum, category) => sum + (byCategory.get(category.id) ?? 0), 0)
  if (savedInPeriod === 0 && derived.elapsedDays >= Math.ceil(period.totalDays / 2)) {
    const aside = Math.max(10_000, Math.round(derived.remainingInPeriod * 0.2))
    out.push({
      id: 'belum-nabung',
      text: `Belum ada setoran Ditabung periode ini: mulai dari ${formatIDR(aside)} dari sisa kamu.`,
    })
  }

  const weekendTotal = expenses
    .filter((expense) => isWeekend(expense.date))
    .reduce((sum, expense) => sum + expense.amount, 0)
  if (weekendTotal >= derived.spentInPeriod * 0.5) {
    const pct = Math.round((weekendTotal / derived.spentInPeriod) * 100)
    out.push({
      id: 'akhir-pekan',
      text: `${pct}% pengeluaranmu jatuh di akhir pekan (${formatIDR(weekendTotal)}). Satukan jadi satu hari supaya lebih terkendali.`,
    })
  }

  const micro = expenses.filter((expense) => expense.amount <= state.allowance * 0.02)
  if (micro.length >= 8) {
    const total = micro.reduce((sum, expense) => sum + expense.amount, 0)
    out.push({
      id: 'mikro',
      text: `${micro.length} transaksi kecil total ${formatIDR(total)}. Gabungkan jadi belanja per hari biar mudah dilacak.`,
    })
  }

  return out.slice(0, MAX_TIPS)
}
