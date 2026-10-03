import { describe, expect, it } from 'vitest'
import type { AppState, Expense, Goal } from '../../types'
import { derive } from '../derive'
import { buildInsights } from '../insights'
import { initialState } from '../state'

const now = new Date(2026, 9, 10)

function base(): AppState {
  const state = initialState()
  state.mode = 'week'
  state.allowance = 700_000
  return state
}

function expense(date: string, categoryId: string, amount: number): Expense {
  return { id: `e-${date}-${categoryId}`, date, categoryId, note: '', amount }
}

const goal: Goal = {
  id: 'g1',
  name: 'Laptop',
  target: 6_000_000,
  saved: 0,
  deposit: 0,
  targetAge: 18,
  primary: true,
}

describe('buildInsights', () => {
  it('tanpa pengeluaran → satu insight kosong', () => {
    const state = base()
    const result = buildInsights(state, derive(state, now), goal)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('empty')
  })

  it('kategori melebihi alokasi → peringatan', () => {
    const state = base()
    state.expenses = [expense('2026-10-06', 'nongkrong', 120_000)]
    const result = buildInsights(state, derive(state, now), goal)
    const ids = result.map((item) => item.id)
    expect(ids).toContain('over-nongkrong')
    expect(result.find((item) => item.id === 'over-nongkrong')?.tone).toBe('warn')
  })

  it('setoran kurang → sarankan setoran bulanan', () => {
    const state = base()
    state.currentAge = 17
    state.expenses = [expense('2026-10-06', 'makan', 20_000)]
    const result = buildInsights(state, derive(state, now), goal)
    const short = result.find((item) => item.id === 'goal-short')
    expect(short?.text).toContain('/bulan')
    expect(short?.tone).toBe('warn')
  })

  it('setoran cukup → insight baik', () => {
    const state = base()
    state.currentAge = 17
    state.expenses = [expense('2026-10-06', 'makan', 20_000)]
    const rich: Goal = { ...goal, deposit: 500_000 }
    const result = buildInsights(state, derive(state, now), rich)
    expect(result.find((item) => item.id === 'goal-ok')?.tone).toBe('good')
  })

  it('laju belanja meledak → proyeksi uang habis', () => {
    const state = base()
    state.allowance = 100_000
    state.expenses = [expense('2026-10-05', 'makan', 300_000)]
    const result = buildInsights(state, derive(state, now), undefined)
    expect(result.map((item) => item.id)).toContain('pace')
  })
})
