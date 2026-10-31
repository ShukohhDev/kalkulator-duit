import { describe, expect, it } from 'vitest'
import type { AppState, Expense } from '../../types'
import { whatIf } from '../whatif'
import { derive } from '../derive'
import { initialState } from '../state'

const now = new Date(2026, 9, 10) // Jumat; elapsed 6 dari 7 hari

function base(): AppState {
  const state = initialState()
  state.mode = 'week'
  state.allowance = 700_000
  return state
}

function expense(date: string, amount: number): Expense {
  return { id: 'e1', date, categoryId: 'makan', note: '', amount }
}

describe('mode bagaimana kalau', () => {
  it('tanpa periode atau tanpa uang jajan → null', () => {
    const fresh = initialState()
    expect(whatIf(fresh, derive(fresh, now), { allowancePct: 0, pacePct: 0 })).toBeNull()

    const noAllowance = base()
    noAllowance.allowance = 0
    expect(whatIf(noAllowance, derive(noAllowance, now), { allowancePct: 0, pacePct: 0 })).toBeNull()
  })

  it('tanpa pengeluaran: laju dasar = uang jajan per hari, skenario netral berakhir nol', () => {
    const state = base()
    const result = whatIf(state, derive(state, now), { allowancePct: 0, pacePct: 0 })!
    expect(result.allowance).toBe(700_000)
    expect(result.pace).toBeCloseTo(100_000, 6)
    expect(result.projectedExpense).toBeCloseTo(700_000, 6)
    expect(result.projectedEnd).toBeCloseTo(0, 6)
    expect(result.perDay).toBeCloseTo(100_000, 6)
  })

  it('uang jajan +30% dan laju -50% mengubah skenario', () => {
    const state = base()
    const result = whatIf(state, derive(state, now), { allowancePct: 30, pacePct: -50 })!
    expect(result.allowance).toBe(910_000)
    expect(result.pace).toBeCloseTo(50_000, 6)
    expect(result.projectedEnd).toBeCloseTo(910_000 - 350_000, 6)
  })

  it('pakai laju aktual saat ada pengeluaran', () => {
    const state = base()
    state.expenses = [expense('2026-10-06', 120_000)]
    const derived = derive(state, now)
    const result = whatIf(state, derived, { allowancePct: 0, pacePct: 100 })!
    const basePace = 120_000 / derived.elapsedDays
    expect(result.pace).toBeCloseTo(basePace * 2, 6)
    expect(result.projectedExpense).toBeCloseTo(basePace * 2 * 7, 6)
    expect(result.currentEnd).toBeCloseTo(700_000 - basePace * 7, 6)
  })
})
