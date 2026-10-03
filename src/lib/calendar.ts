import type { Expense } from '../types'
import { toISO } from './money'

export interface CalendarCell {
  iso: string | null
  total: number
}

export function expenseTotalsByDay(expenses: Expense[], year: number, month: number): Map<string, number> {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const map = new Map<string, number>()
  for (const expense of expenses) {
    if (!expense.date.startsWith(prefix)) continue
    map.set(expense.date, (map.get(expense.date) ?? 0) + expense.amount)
  }
  return map
}

export function monthGrid(year: number, month: number, totals: Map<string, number>): CalendarCell[][] {
  const first = new Date(year, month, 1)
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: CalendarCell[] = []

  for (let i = 0; i < offset; i++) cells.push({ iso: null, total: 0 })
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toISO(new Date(year, month, day))
    cells.push({ iso, total: totals.get(iso) ?? 0 })
  }
  while (cells.length % 7 !== 0) cells.push({ iso: null, total: 0 })

  const rows: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

export function intensity(total: number, max: number): number {
  if (total <= 0 || max <= 0) return 0
  return Math.min(1, total / max)
}
