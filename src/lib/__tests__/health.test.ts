import { describe, expect, it } from 'vitest'
import type { AppState } from '../../types'
import { healthScore } from '../health'
import { derive } from '../derive'
import { initialState } from '../state'
import { periodRange } from '../allocation'
import { toISO } from '../money'

const now = new Date(2026, 9, 14) // Rabu, tengah minggu

function base(): AppState {
  const state = initialState()
  state.mode = 'week'
  state.allowance = 700_000
  return state
}

describe('skor kesehatan keuangan', () => {
  it('tanpa belanja: rasio tabungan 0, indikator lain netral → skor 70 (Baik)', () => {
    const state = base()
    const result = healthScore(state, derive(state, now), now)
    expect(result.indicators).toHaveLength(4)
    const scores = Object.fromEntries(result.indicators.map((item) => [item.id, item.score]))
    expect(scores).toEqual({ tabungan: 0, cadangan: 100, beban: 100, patuh: 100 })
    expect(result.score).toBe(70)
    expect(result.grade).toBe('Baik')
  })

  it('rasio tabungan dihitung dari setoran Ditabung vs pemasukan periode', () => {
    const state = base()
    const period = periodRange('week', now)
    // tabungan 100rb dari 700rb → 14,3% dari target 20% → skor 71
    state.expenses.push({
      id: 'e1',
      date: toISO(period.start),
      categoryId: 'tabungan',
      note: '',
      amount: 100_000,
    })
    const result = healthScore(state, derive(state, now), now)
    const tabungan = result.indicators.find((item) => item.id === 'tabungan')!
    expect(tabungan.score).toBe(Math.round((100_000 / 700_000 / 0.2) * 100))
    expect(tabungan.detail).toContain('700')
  })

  it('indikator cadangan tabungan memakai setoran Ditabung vs target 3× pengeluaran wajib', () => {
    const state = base()
    state.bills = [{ id: 'b1', name: 'Listrik', amount: 100_000, dueDay: 10 }]
    state.expenses = [
      { id: 'e1', date: '2026-01-05', categoryId: 'tabungan', note: '', amount: 300_000 },
      { id: 'e2', date: '2026-10-06', categoryId: 'makan', note: '', amount: 20_000 },
    ] // target 3×100rb = 300rb → penuh
    let result = healthScore(state, derive(state, now), now)
    expect(result.indicators.find((item) => item.id === 'cadangan')!.score).toBe(100)

    state.expenses = []
    result = healthScore(state, derive(state, now), now)
    expect(result.indicators.find((item) => item.id === 'cadangan')!.score).toBe(0)
  })

  it('beban kewajiban: wajib/bulan vs pemasukan bulanan', () => {
    const state = base()
    state.mode = 'month' // bulanan: pemasukan bulanan = allowance
    state.bills = [{ id: 'b1', name: 'Sewa', amount: 400_000, dueDay: 10 }]
    const result = healthScore(state, derive(state, now), now)
    const beban = result.indicators.find((item) => item.id === 'beban')!
    expect(beban.score).toBe(Math.round(100 * Math.min(1, (0.9 - 400_000 / 700_000) / 0.6)))
    expect(beban.score).toBeLessThan(100)
  })

  it('kepatuhan alokasi turun saat ada kategori melewati alokasinya', () => {
    const state = base()
    const period = periodRange('week', now)
    const over = state.categories.find((category) => category.ratio > 0)!
    state.expenses.push({
      id: 'e1',
      date: toISO(period.start),
      categoryId: over.id,
      note: '',
      amount: state.allowance * over.ratio + 50_000,
    })
    const result = healthScore(state, derive(state, now), now)
    const active = state.categories.filter((category) => category.ratio > 0).length
    const indicator = result.indicators.find((item) => item.id === 'patuh')!
    expect(indicator.score).toBe(Math.round(100 * (1 - 1 / active)))
    expect(indicator.detail).toContain('melebihi alokasi')
  })

  it('tanpa mode periode → skor netral', () => {
    const state = initialState()
    const result = healthScore(state, derive(state, now), now)
    expect(result.score).toBe(100)
    expect(result.indicators).toHaveLength(4)
  })
})
