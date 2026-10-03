import type { Category, Expense, Income } from '../types'
import { monthKey } from './money'

export interface MonthSummary {
  income: number
  expense: number
  net: number
}

export interface CategoryDelta {
  category: Category
  current: number
  previous: number
  changePct: number | null
}

export function summarizeMonth(incomes: Income[], expenses: Expense[], key: string): MonthSummary {
  const income = incomes.filter((item) => monthKey(item.date) === key).reduce((sum, item) => sum + item.amount, 0)
  const expense = expenses.filter((item) => monthKey(item.date) === key).reduce((sum, item) => sum + item.amount, 0)
  return { income, expense, net: income - expense }
}

export function categoryDeltas(expenses: Expense[], categories: Category[], currentKey: string, previousKey: string): CategoryDelta[] {
  const current = new Map<string, number>()
  const previous = new Map<string, number>()

  for (const expense of expenses) {
    const key = monthKey(expense.date)
    const target = key === currentKey ? current : key === previousKey ? previous : null
    if (target) target.set(expense.categoryId, (target.get(expense.categoryId) ?? 0) + expense.amount)
  }

  return categories
    .map((category) => {
      const cur = current.get(category.id) ?? 0
      const prev = previous.get(category.id) ?? 0
      return {
        category,
        current: cur,
        previous: prev,
        changePct: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? null : 0,
      }
    })
    .filter((item) => item.current > 0 || item.previous > 0)
    .sort((a, b) => b.current - a.current)
}

export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
