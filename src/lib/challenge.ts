import type { AppState, PeriodMode } from '../types'
import type { Derived } from './derive'
import { periodRange } from './allocation'
import { addDays } from './money'

export const CHALLENGE_RATIO = 0.8
export const CHALLENGE_LOOKBACK = 12

export interface Challenge {
  target: number
  spent: number
  left: number
  progressPct: number
  passed: boolean
  finished: boolean
  points: number
  streak: number
}

function spentBetween(state: AppState, startISO: string, endISO: string): number {
  let sum = 0
  for (const expense of state.expenses) {
    if (expense.date >= startISO && expense.date <= endISO) sum += expense.amount
  }
  return sum
}

// Tantangan otomatis tiap periode: belanja ≤ 80% uang jajan.
// Poin dihitung dari 12 periode lampau yang punya catatan (target memakai
// uang jajan sekarang: cukup sebagai indikator, bukan rekor yang diikat).
export function challenge(state: AppState, derived: Derived): Challenge | null {
  if (!derived.period || !state.mode || state.allowance <= 0) return null
  const mode: PeriodMode = state.mode
  const period = derived.period
  const target = state.allowance * CHALLENGE_RATIO
  const spent = derived.spentInPeriod

  let points = 0
  let streak = 0
  let broken = false
  let ref = period.start
  for (let i = 0; i < CHALLENGE_LOOKBACK; i++) {
    ref = addDays(ref, -1)
    const past = periodRange(mode, ref)
    const pastSpent = spentBetween(state, past.startISO, past.endISO)
    if (pastSpent > 0) {
      if (pastSpent <= target) {
        points += 1
        if (!broken) streak += 1
      } else {
        broken = true
      }
    }
    ref = past.start
  }

  return {
    target,
    spent,
    left: target - spent,
    progressPct: target > 0 ? Math.min(100, Math.round((spent / target) * 100)) : 0,
    passed: spent <= target,
    finished: derived.elapsedDays >= period.totalDays,
    points,
    streak,
  }
}
