import type { AppState, Category, Expense, Goal } from '../types'
import { dailyAllowanceEntries } from './allocation'
import { monthKey } from './money'
import { SAVINGS_CATEGORY, effectiveSaved } from './state'

export interface ReportCategory {
  category: Category
  amount: number
  share: number
}

export interface ReportGoal {
  goal: Goal
  saved: number
  logged: number
  percent: number
}

export interface MonthlyReport {
  month: string
  allowance: number
  manualIncome: number
  income: number
  expense: number
  net: number
  noteCount: number
  byCategory: ReportCategory[]
  byGoal: ReportGoal[]
  topExpenses: Expense[]
}

const NO_CATEGORY = (id: string): Category => ({
  id,
  name: 'Tanpa kategori',
  ratio: 0,
  builtin: false,
  color: '#868e96',
})

export function monthDays(month: string): number {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m, 0).getDate()
}

export function savingsByGoalOf(expenses: Expense[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const expense of expenses) {
    if (expense.categoryId === SAVINGS_CATEGORY && expense.goalId) {
      out[expense.goalId] = (out[expense.goalId] ?? 0) + expense.amount
    }
  }
  return out
}

export function buildReport(state: AppState, month: string): MonthlyReport {
  const lastDay = `${month}-${String(monthDays(month)).padStart(2, '0')}`
  const allowance = state.mode
    ? dailyAllowanceEntries(state.allowance, state.mode, `${month}-01`, lastDay).reduce(
        (sum, item) => sum + item.amount,
        0,
      )
    : 0

  const manualIncome = state.incomes
    .filter((item) => monthKey(item.date) === month)
    .reduce((sum, item) => sum + item.amount, 0)

  const expenses = state.expenses.filter((item) => monthKey(item.date) === month)
  const expense = expenses.reduce((sum, item) => sum + item.amount, 0)

  const categoryMap = new Map<string, Category>(state.categories.map((category) => [category.id, category]))
  const totals = new Map<string, number>()
  for (const item of expenses) {
    totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + item.amount)
  }

  const byCategory = [...totals.entries()]
    .map(([id, amount]) => ({
      category: categoryMap.get(id) ?? NO_CATEGORY(id),
      amount,
      share: expense > 0 ? amount / expense : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  const monthSavings = savingsByGoalOf(expenses)
  const allSavings = savingsByGoalOf(state.expenses)
  const byGoal = state.goals
    .filter((goal) => goal.target > 0)
    .map((goal) => {
      const saved = effectiveSaved(goal, allSavings)
      const logged = monthSavings[goal.id] ?? 0
      return { goal, saved, logged, percent: Math.min(100, Math.round((saved / goal.target) * 100)) }
    })

  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5)
  const income = allowance + manualIncome

  return {
    month,
    allowance,
    manualIncome,
    income,
    expense,
    net: income - expense,
    noteCount: expenses.length,
    byCategory,
    byGoal,
    topExpenses,
  }
}
