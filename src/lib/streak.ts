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
}

export function evaluateBadges(state: AppState, savingsByGoal: Record<string, number> = {}, now: Date = new Date()): Badge[] {
  const streak = currentStreak(state.expenses, now)
  const goal = activeGoals(state.goals)[0]
  const progress = goal && goal.target > 0 ? effectiveSaved(goal, savingsByGoal) / goal.target : 0

  return [
    {
      id: 'first-log',
      name: 'Langkah Pertama',
      desc: 'Catat pengeluaran pertamamu',
      unlocked: state.expenses.length >= 1,
    },
    {
      id: 'streak-7',
      name: 'Konsisten 7 Hari',
      desc: 'Catat pengeluaran 7 hari berturut-turut',
      unlocked: streak >= 7,
    },
    {
      id: 'streak-30',
      name: 'Disiplin 30 Hari',
      desc: 'Catat pengeluaran 30 hari berturut-turut',
      unlocked: streak >= 30,
    },
    {
      id: 'goal-half',
      name: 'Setengah Jalan',
      desc: 'Target utama sudah 50% terkumpul',
      unlocked: progress >= 0.5,
    },
    {
      id: 'goal-full',
      name: 'Target Tercapai',
      desc: 'Target utama terkumpul penuh',
      unlocked: progress >= 1,
    },
    {
      id: 'logged-50',
      name: 'Jago Catat',
      desc: '50 pengeluaran tercatat',
      unlocked: state.expenses.length >= 50,
    },
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
