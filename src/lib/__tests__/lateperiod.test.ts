import { describe, expect, it } from 'vitest'
import type { AppState, Expense } from '../../types'
import { latePlan } from '../lateperiod'
import { initialState } from '../state'
import { derive } from '../derive'

const NOW = new Date(2026, 9, 7, 12) // Rabu: elapsed 3 dari 7 hari

function stateWith(expenses: Expense[], patch: Partial<AppState> = {}): AppState {
  return { ...initialState(), mode: 'week', allowance: 700_000, expenses, ...patch }
}

function expense(amount: number): Expense {
  return { id: 'e1', date: '2026-10-06', categoryId: 'makan', note: '', amount }
}

describe('rencana tanggal tua', () => {
  it('tidak muncul kalau tidak ada pengeluaran atau laju masih aman', () => {
    expect(latePlan(stateWith([]), derive(stateWith([]), NOW))).toBeNull()

    const calm = stateWith([expense(100_000)])
    expect(latePlan(calm, derive(calm, NOW))).toBeNull()
  })

  it('potong keinginan dulu saat kebutuhan harian masih kecakup', () => {
    // pace 310.000/3 × 7 = 723.333 > 700.000 (boros), sisa 390.000
    // kebutuhan 220.000 ≤ 390.000 → keinginan dipotong saja, tabungan tetap jalan
    const state = stateWith([expense(310_000)])
    const plan = latePlan(state, derive(state, NOW))

    expect(plan).not.toBeNull()
    expect(plan!.shortfall).toBe(0)
    expect(plan!.ratios.nongkrong).toBe(0)
    expect(plan!.ratios.langganan).toBe(0)
    expect(plan!.ratios.tabungan).toBeCloseTo(0.2 / 0.82, 6)
    // seluruh penyintas diskalakan ulang sampai total 100%
    const sum = Object.values(plan!.ratios).reduce((total, value) => total + value, 0)
    expect(sum).toBeCloseTo(1, 9)
    expect(plan!.ratios.makan).toBeCloseTo(0.3 / 0.82, 6)
    // daftar perubahan memuat yang dipotong dan yang naik
    const byId = new Map(plan!.changes.map((change) => [change.id, change]))
    expect(byId.get('nongkrong')).toMatchObject({ before: 0.15, after: 0 })
    expect(byId.get('makan')!.after).toBeGreaterThan(byId.get('makan')!.before)
  })

  it('potong tabungan juga saat kebutuhan saja belum cukup, shortfall dihitung', () => {
    // sisa 150.000 < 220.000 → kebutuhan dulu: harian 100%
    const state = stateWith([expense(550_000)])
    const plan = latePlan(state, derive(state, NOW))

    expect(plan).not.toBeNull()
    expect(plan!.ratios.tabungan).toBe(0)
    expect(plan!.ratios['dana-darurat']).toBe(0)
    expect(plan!.ratios.makan).toBeCloseTo(0.3 / 0.55, 6)
    expect(plan!.shortfall).toBeCloseTo(220_000 - 150_000, 4)
    expect(plan!.text).toContain('boros')
  })

  it('setelah rencana diterapkan kartu tidak muncul lagi', () => {
    const state = stateWith([expense(310_000)])
    const plan = latePlan(state, derive(state, NOW))!
    const applied: AppState = {
      ...state,
      categories: state.categories.map((category) => ({ ...category, ratio: plan.ratios[category.id] })),
    }
    expect(latePlan(applied, derive(applied, NOW))).toBeNull()
  })
})
