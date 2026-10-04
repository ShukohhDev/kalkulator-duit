import type { AppState, Expense } from '../types'
import { activeGoals, effectiveSaved } from './state'
import { addDays, daysBetween, parseISO, toISO } from './money'

export function expenseDates(expenses: Expense[]): Set<string> {
  return new Set(expenses.map((item) => item.date))
}

export function currentStreak(expenses: Expense[], now: Date = new Date()): number {
  const dates = expenseDates(expenses)
  if (dates.size === 0) return 0

  const today = toISO(now)
  const yesterday = toISO(addDays(now, -1))
  let cursor: Date

  if (dates.has(today)) cursor = now
  else if (dates.has(yesterday)) cursor = addDays(now, -1)
  else return 0

  let streak = 0
  let guard = 0
  while (guard < 2000) {
    const iso = toISO(cursor)
    if (!dates.has(iso)) break
    streak++
    cursor = addDays(cursor, -1)
    guard++
  }
  return streak
}

export interface Badge {
  id: string
  name: string
  desc: string
  unlocked: boolean
  current: number
  target: number
  unit: 'hari' | 'catatan' | 'persen'
  progress: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function evaluateBadges(state: AppState, savingsByGoal: Record<string, number> = {}, now: Date = new Date()): Badge[] {
  const streak = currentStreak(state.expenses, now)
  const goal = activeGoals(state.goals)[0]
  const ratio = goal && goal.target > 0 ? effectiveSaved(goal, savingsByGoal) / goal.target : 0
  const percent = Math.round(ratio * 100)
  const expenseCount = state.expenses.length

  const badge = (
    id: string,
    name: string,
    desc: string,
    current: number,
    target: number,
    unit: Badge['unit'],
  ): Badge => ({
    id,
    name,
    desc,
    unlocked: current >= target,
    current,
    target,
    unit,
    progress: target > 0 ? clamp01(current / target) : 0,
  })

  return [
    badge('first-log', 'Langkah Pertama', 'Catat pengeluaran pertamamu', expenseCount, 1, 'catatan'),
    badge('streak-7', 'Konsisten 7 Hari', 'Catat pengeluaran 7 hari berturut-turut', streak, 7, 'hari'),
    badge('streak-30', 'Disiplin 30 Hari', 'Catat pengeluaran 30 hari berturut-turut', streak, 30, 'hari'),
    badge('goal-half', 'Setengah Jalan', 'Target utama sudah 50% terkumpul', percent, 50, 'persen'),
    badge('goal-full', 'Target Tercapai', 'Target utama terkumpul penuh', percent, 100, 'persen'),
    badge('logged-50', 'Jago Catat', '50 pengeluaran tercatat', expenseCount, 50, 'catatan'),
  ]
}

export function lastRecordISO(state: AppState): string | null {
  const dates = [...state.expenses.map((e) => e.date), ...state.incomes.map((i) => i.date)]
  if (dates.length === 0) return null
  return dates.reduce((max, d) => (d > max ? d : max), dates[0])
}

export function daysSinceLastRecord(state: AppState, now: Date = new Date()): number | null {
  const last = lastRecordISO(state)
  if (!last) return null
  return daysBetween(parseISO(last), now)
}
