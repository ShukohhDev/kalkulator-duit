import type { AppState, Goal } from '../types'
import type { Derived } from './derive'
import { formatIDR } from './money'
import { effectiveSaved } from './state'
import { ageAfter, monthsToTarget, requiredDeposit } from './savings'

export interface Insight {
  id: string
  tone: 'warn' | 'good' | 'info'
  text: string
}

const MAX_INSIGHTS = 4

export function buildInsights(state: AppState, derived: Derived, goal: Goal | undefined): Insight[] {
  const out: Insight[] = []

  if (state.expenses.length === 0) {
    out.push({
      id: 'empty',
      tone: 'info',
      text: 'Belum ada pengeluaran tercatat. Mulai catat pengeluaran pertamamu agar alokasi dan grafik bisa bekerja.',
    })
    return out
  }

  const overspending = state.categories
    .map((category) => {
      const alloc = derived.allocationByCategory[category.id] ?? 0
      const spent = derived.spentByCategory[category.id] ?? 0
      return { category, alloc, spent, over: spent - alloc, pct: alloc > 0 ? Math.round((spent / alloc) * 100) : 0 }
    })
    .filter((item) => item.alloc > 0 && item.over > 0)
    .sort((a, b) => b.over - a.over)

  for (const item of overspending.slice(0, 2)) {
    out.push({
      id: `over-${item.category.id}`,
      tone: 'warn',
      text: `${item.category.name} sudah ${item.pct}% dari alokasi periode ini — kelebihan ${formatIDR(item.over)}.`,
    })
  }

  if (derived.period && derived.elapsedDays >= 1 && state.allowance > 0) {
    const pace = derived.spentInPeriod / derived.elapsedDays
    const projected = pace * derived.period.totalDays
    if (pace > 0 && projected > state.allowance) {
      const dayOut = Math.max(1, Math.ceil(state.allowance / pace))
      out.push({
        id: 'pace',
        tone: 'warn',
        text: `Dengan laju ${formatIDR(pace)}/hari, uang jajan habis di hari ke-${dayOut} dari ${derived.period.totalDays}.`,
      })
    } else if (projected < state.allowance * 0.5 && derived.elapsedDays >= derived.period.totalDays * 0.5) {
      out.push({
        id: 'under-pace',
        tone: 'good',
        text: `Belanjaumu masih jauh di bawah alokasi — sekitar ${formatIDR(state.allowance - projected)} masih bisa dialihkan ke tabungan.`,
      })
    }
  }

  if (goal && goal.target > 0) {
    const months = (goal.targetAge - state.currentAge) * 12
    if (months <= 0) {
      out.push({
        id: 'goal-age',
        tone: 'warn',
        text: `Umurmu sekarang (${state.currentAge}) sudah tidak lebih muda dari umur target (${goal.targetAge}). Naikkan umur target atau kejar target lebih cepat.`,
      })
    } else {
      const saved = effectiveSaved(goal, derived.savingsByGoal)
      const need = requiredDeposit({ target: goal.target, saved, months })
      const projectedMonths = monthsToTarget({ target: goal.target, saved, deposit: goal.deposit })
      const finish = projectedMonths !== null ? ageAfter(state.currentAge, projectedMonths) : null

      if (need === null) {
        // tidak ada rekomendasi yang bisa dihitung
      } else if (need === 0) {
        out.push({
          id: 'goal-ok',
          tone: 'good',
          text: `Tabunganmu ${formatIDR(saved)} yang tumbuh 8%/tahun sudah cukup untuk mencapai ${goal.name} di umur ${goal.targetAge}.`,
        })
      } else if (goal.deposit >= need) {
        out.push({
          id: 'goal-ok',
          tone: 'good',
          text: `Dengan setoran ${formatIDR(goal.deposit)}/bulan, target ${goal.name} tercapai di umur ${finish ? finish.label : String(goal.targetAge)}.`,
        })
      } else {
        const tail = finish
          ? `Setoranmu sekarang ${formatIDR(goal.deposit)} → tercapai di umur ${finish.label}.`
          : `Setoranmu sekarang ${formatIDR(goal.deposit)} belum menggerakkan tabunganmu.`
        out.push({
          id: 'goal-short',
          tone: 'warn',
          text: `Butuh ${formatIDR(need)}/bulan agar ${goal.name} tercapai di umur ${goal.targetAge}. ${tail}`,
        })
      }
    }
  }

  return out.slice(0, MAX_INSIGHTS)
}
