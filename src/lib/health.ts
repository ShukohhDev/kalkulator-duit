import type { AppState } from '../types'
import type { Derived } from './derive'
import { emergencyTarget, monthlyObligations } from './emergency'
import { formatIDR, monthKey, toISO } from './money'
import { SAVINGS_CATEGORY } from './state'

export interface HealthIndicator {
  id: string
  label: string
  score: number
  detail: string
}

export interface HealthResult {
  score: number
  grade: string
  indicators: HealthIndicator[]
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

function gradeOf(score: number, lang: 'id' | 'en' = 'id'): string {
  if (lang === 'en') {
    if (score >= 85) return 'Excellent'
    if (score >= 70) return 'Good'
    if (score >= 50) return 'Fair'
    if (score >= 30) return 'Needs attention'
    return 'Critical'
  }
  if (score >= 85) return 'Sangat baik'
  if (score >= 70) return 'Baik'
  if (score >= 50) return 'Cukup'
  if (score >= 30) return 'Perlu perhatian'
  return 'Kritis'
}

// Skor 0-100 dari 4 indikator: rasio tabungan 30%, cakupan dana darurat 30%,
// beban kewajiban 20%, kepatuhan alokasi 20%.
export function healthScore(
  state: AppState,
  derived: Derived,
  now: Date = new Date(),
  lang: 'id' | 'en' = 'id',
): HealthResult {
  const period = derived.period

  // 1. Rasio tabungan: setoran Ditabung periode ini / (uang jajan + pemasukan periode), penuh di 20%
  const incomeInPeriod = period
    ? state.allowance +
      state.incomes
        .filter((item) => item.date >= period.startISO && item.date <= period.endISO)
        .reduce((sum, item) => sum + item.amount, 0)
    : 0
  const savedInPeriod = period
    ? state.expenses
        .filter(
          (item) =>
            item.date >= period.startISO &&
            item.date <= period.endISO &&
            item.categoryId === SAVINGS_CATEGORY,
        )
        .reduce((sum, item) => sum + item.amount, 0)
    : 0
  const tabungan =
    incomeInPeriod > 0 ? Math.round(100 * clamp01(savedInPeriod / incomeInPeriod / 0.2)) : 100

  // 2. Cadangan tabungan: total setoran kategori Ditabung (sepanjang masa) / target 3× pengeluaran wajib
  const target = emergencyTarget(state)
  const saved = (derived.allTimeSpentByCategory?.[SAVINGS_CATEGORY] ?? derived.spentByCategory[SAVINGS_CATEGORY]) ?? 0
  const cadangan = target > 0 ? Math.round(100 * clamp01(saved / target)) : 100

  // 3. Beban kewajiban: wajib/bulan vs pemasukan bulanan (uang jajan setara bulanan + pemasukan bulan ini)
  const { total: wajib } = monthlyObligations(state)
  const monthNow = monthKey(toISO(now))
  const manualThisMonth = state.incomes
    .filter((item) => monthKey(item.date) === monthNow)
    .reduce((sum, item) => sum + item.amount, 0)
  const monthlyIncome = derived.monthly + manualThisMonth
  const burden = monthlyIncome > 0 ? wajib / monthlyIncome : 0
  const beban = monthlyIncome > 0 ? Math.round(100 * clamp01((0.9 - burden) / 0.6)) : 100

  // 4. Kepatuhan alokasi: berapa kategori aktif yang belanja periode ini melewati alokasinya
  const active = state.categories.filter((category) => category.ratio > 0)
  const over = active.filter(
    (category) =>
      derived.allocationByCategory[category.id] > 0 &&
      (derived.spentByCategory[category.id] ?? 0) > derived.allocationByCategory[category.id],
  )
  const patuh = active.length > 0 ? Math.round(100 * (1 - over.length / active.length)) : 100

  const indicators: HealthIndicator[] = [
    {
      id: 'tabungan',
      label: lang === 'en' ? 'Savings ratio' : 'Rasio tabungan',
      score: tabungan,
      detail:
        incomeInPeriod > 0
          ? (lang === 'en'
              ? `${formatIDR(savedInPeriod)} of ${formatIDR(incomeInPeriod)} (target 20%)`
              : `${formatIDR(savedInPeriod)} dari ${formatIDR(incomeInPeriod)} (target 20%)`)
          : (lang === 'en' ? 'No income in this period yet' : 'Belum ada pemasukan periode ini'),
    },
    {
      id: 'cadangan',
      label: lang === 'en' ? 'Savings reserve' : 'Cadangan tabungan',
      score: cadangan,
      detail:
        target > 0
          ? (lang === 'en'
              ? `${formatIDR(saved)} of ${formatIDR(target)} (3× obligations)`
              : `${formatIDR(saved)} dari ${formatIDR(target)} (3× kewajiban)`)
          : (lang === 'en' ? 'No fixed obligations yet' : 'Belum ada kewajiban tetap'),
    },
    {
      id: 'beban',
      label: lang === 'en' ? 'Obligation burden' : 'Beban kewajiban',
      score: beban,
      detail:
        monthlyIncome > 0
          ? (lang === 'en'
              ? `${formatIDR(wajib)}/mo of ±${formatIDR(monthlyIncome)} income`
              : `${formatIDR(wajib)}/bulan dari pemasukan ±${formatIDR(monthlyIncome)}`)
          : (lang === 'en' ? 'No income recorded' : 'Belum ada pemasukan'),
    },
    {
      id: 'patuh',
      label: lang === 'en' ? 'Budget compliance' : 'Kepatuhan alokasi',
      score: patuh,
      detail:
        active.length > 0
          ? (lang === 'en'
              ? `${over.length} of ${active.length} categories exceeded budget`
              : `${over.length} dari ${active.length} kategori melebihi alokasi`)
          : (lang === 'en' ? 'No active categories' : 'Tidak ada kategori aktif'),
    },
  ]

  const score = Math.round(tabungan * 0.3 + cadangan * 0.3 + beban * 0.2 + patuh * 0.2)
  return { score, grade: gradeOf(score, lang), indicators }
}
