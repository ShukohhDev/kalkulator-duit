import type { AppState, CategoryKind } from '../types'
import type { Derived } from './derive'
import { categoryKind } from './state'
import { formatIDR } from './money'

export interface LateChange {
  id: string
  name: string
  before: number
  after: number
}

export interface LatePlan {
  remaining: number
  daysLeft: number
  need: number
  shortfall: number
  changes: LateChange[]
  ratios: Record<string, number>
  text: string
}

// rencana alokasi ulang saat sisa menipis (proyeksi boros melebihi uang jajan):
// potong dari prioritas terendah — keinginan dulu, lalu tabungan kalau kebutuhan saja belum cukup
export function latePlan(state: AppState, derived: Derived): LatePlan | null {
  const period = derived.period
  if (!state.mode || !period || state.allowance <= 0 || derived.elapsedDays < 1) return null

  const pace = derived.spentInPeriod / derived.elapsedDays
  if (!(pace > 0) || pace * period.totalDays <= state.allowance) return null

  const daysLeft = Math.max(1, period.totalDays - derived.elapsedDays)
  const planPerDay = (kinds: CategoryKind[]) =>
    (state.categories
      .filter((category) => kinds.includes(categoryKind(category)))
      .reduce((sum, category) => sum + category.ratio, 0) *
      state.allowance) /
    period.totalDays

  const need = planPerDay(['harian']) * daysLeft
  const remaining = derived.remainingInPeriod
  // kritis = kebutuhan harian saja belum kecakup → tabungan juga dipotong (kebutuhan dulu)
  const cut: CategoryKind[] = remaining < need ? ['keinginan', 'tabungan'] : ['keinginan']

  const ratios: Record<string, number> = {}
  let survivorSum = 0
  for (const category of state.categories) {
    if (cut.includes(categoryKind(category))) {
      ratios[category.id] = 0
      continue
    }
    ratios[category.id] = category.ratio
    survivorSum += category.ratio
  }
  if (survivorSum <= 0) return null
  for (const id of Object.keys(ratios)) ratios[id] = ratios[id] / survivorSum

  const changes: LateChange[] = state.categories
    .filter((category) => Math.abs((ratios[category.id] ?? 0) - category.ratio) > 1e-6)
    .map((category) => ({
      id: category.id,
      name: category.name,
      before: category.ratio,
      after: ratios[category.id],
    }))
  // rekomendasi sudah diterapkan (atau memang tidak ada yang perlu diubah): jangan tampilkan lagi
  if (changes.length === 0) return null

  const needPerDay = planPerDay(['harian'])
  return {
    remaining,
    daysLeft,
    need,
    shortfall: Math.max(0, need - remaining),
    changes,
    ratios,
    text: `Tercatat boros dari rencana: sisa ${formatIDR(remaining)} untuk ${daysLeft} hari ke depan, padahal kebutuhan harian ~${formatIDR(needPerDay)}/hari.`,
  }
}
