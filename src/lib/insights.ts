import type { AppState } from '../types'
import type { Derived } from './derive'
import { formatIDR } from './money'
import { dueLabel, upcomingDue } from './obligations'
import { activeGoals, effectiveSaved } from './state'
import { ageAfter, monthsToTarget, requiredDeposit } from './savings'

export interface Insight {
  id: string
  tone: 'warn' | 'good' | 'info'
  text: string
}

const MAX_INSIGHTS = 5

export function buildInsights(state: AppState, derived: Derived, lang: 'id' | 'en' = 'id'): Insight[] {
  const isEn = lang === 'en'
  const out: Insight[] = []

  const due = upcomingDue(state)
  if (due) {
    out.push({
      id: `due-${due.id}`,
      tone: 'warn',
      text: `${due.name} ${dueLabel(due.days, lang)}, ${formatIDR(due.amount)}.`,
    })
  }

  if (state.expenses.length === 0) {
    out.push({
      id: 'empty',
      tone: 'info',
      text: isEn
        ? 'No expenses recorded yet. Start recording your first expense so allocations and charts can work.'
        : 'Belum ada pengeluaran tercatat. Mulai catat pengeluaran pertamamu agar alokasi dan grafik bisa bekerja.',
    })
    return out
  }

  if (derived.period && derived.elapsedDays >= 1 && state.allowance > 0) {
    const pace = derived.spentInPeriod / derived.elapsedDays
    const projected = pace * derived.period.totalDays
    if (pace > 0 && projected > state.allowance) {
      const dayOut = Math.max(1, Math.ceil(state.allowance / pace))
      out.push({
        id: 'pace',
        tone: 'warn',
        text: isEn
          ? `At a pace of ${formatIDR(pace)}/day, allowance will run out on day ${dayOut} of ${derived.period.totalDays}.`
          : `Dengan laju ${formatIDR(pace)}/hari, uang jajan habis di hari ke-${dayOut} dari ${derived.period.totalDays}.`,
      })
    } else if (projected < state.allowance * 0.5 && derived.elapsedDays >= derived.period.totalDays * 0.5) {
      out.push({
        id: 'under-pace',
        tone: 'good',
        text: isEn
          ? `Your spending is well below allocation, about ${formatIDR(state.allowance - projected)} can still be redirected to savings.`
          : `Belanjaumu masih jauh di bawah alokasi, sekitar ${formatIDR(state.allowance - projected)} masih bisa dialihkan ke tabungan.`,
      })
    }
  }

  for (const goal of activeGoals(state.goals)) {
    if (out.length >= MAX_INSIGHTS) break
    const months = (goal.targetAge - state.currentAge) * 12
    if (months <= 0) {
      out.push({
        id: `goal-age-${goal.id}`,
        tone: 'warn',
        text: isEn
          ? `Your current age (${state.currentAge}) has reached target age for ${goal.name} (${goal.targetAge}). Increase target age or accelerate savings.`
          : `Umurmu sekarang (${state.currentAge}) sudah tidak lebih muda dari umur target ${goal.name} (${goal.targetAge}). Naikkan umur target atau kejar target lebih cepat.`,
      })
      continue
    }

    const saved = effectiveSaved(goal, derived.savingsByGoal)
    const need = requiredDeposit({ target: goal.target, saved, months })
    const projectedMonths = monthsToTarget({ target: goal.target, saved, deposit: goal.deposit })
    const finish = projectedMonths !== null ? ageAfter(state.currentAge, projectedMonths, lang) : null

    if (need === null) {
      // tidak ada rekomendasi yang bisa dihitung
    } else if (need === 0) {
      out.push({
        id: `goal-ok-${goal.id}`,
        tone: 'good',
        text: isEn
          ? `Your savings of ${formatIDR(saved)} growing at 8%/year is sufficient to reach ${goal.name} at age ${goal.targetAge}.`
          : `Tabunganmu ${formatIDR(saved)} yang tumbuh 8%/tahun sudah cukup untuk mencapai ${goal.name} di umur ${goal.targetAge}.`,
      })
    } else if (goal.deposit >= need) {
      out.push({
        id: `goal-ok-${goal.id}`,
        tone: 'good',
        text: isEn
          ? `With a deposit of ${formatIDR(goal.deposit)}/month, target ${goal.name} is reached at age ${finish ? finish.label : String(goal.targetAge)}.`
          : `Dengan setoran ${formatIDR(goal.deposit)}/bulan, target ${goal.name} tercapai di umur ${finish ? finish.label : String(goal.targetAge)}.`,
      })
    } else {
      const tail = finish
        ? isEn
          ? `Your current deposit is ${formatIDR(goal.deposit)} → reached at age ${finish.label}.`
          : `Setoranmu sekarang ${formatIDR(goal.deposit)} → tercapai di umur ${finish.label}.`
        : isEn
          ? `Your current deposit of ${formatIDR(goal.deposit)} has not yet moved your savings.`
          : `Setoranmu sekarang ${formatIDR(goal.deposit)} belum menggerakkan tabunganmu.`
      out.push({
        id: `goal-short-${goal.id}`,
        tone: 'warn',
        text: isEn
          ? `Requires ${formatIDR(need)}/month for ${goal.name} to be reached at age ${goal.targetAge}. ${tail}`
          : `Butuh ${formatIDR(need)}/bulan agar ${goal.name} tercapai di umur ${goal.targetAge}. ${tail}`,
      })
    }
  }

  return out.slice(0, MAX_INSIGHTS)
}
