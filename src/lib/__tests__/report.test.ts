import { describe, expect, it } from 'vitest'
import type { AppState } from '../../types'
import { buildReport, monthDays, savingsByGoalOf } from '../report'
import { initialState } from '../state'

function base(): AppState {
  const state = initialState()
  state.mode = 'week'
  state.allowance = 700_000
  state.goals = [
    { id: 'g1', name: 'Laptop', target: 6_000_000, saved: 500_000, deposit: 0, targetAge: 18, primary: true, active: true },
  ]
  state.expenses = [
    { id: 'e1', date: '2026-10-03', categoryId: 'makan', note: 'nasi', amount: 20_000 },
    { id: 'e2', date: '2026-10-05', categoryId: 'nongkrong', note: 'ngopi', amount: 30_000 },
    { id: 'e3', date: '2026-10-06', categoryId: 'tabungan', note: 'setor', amount: 100_000, goalId: 'g1' },
    { id: 'e4', date: '2026-09-30', categoryId: 'makan', note: 'lama', amount: 999_000 },
  ]
  state.incomes = [{ id: 'i1', date: '2026-10-01', source: 'hadiah', amount: 50_000 }]
  return state
}

describe('buildReport', () => {
  it('menjumlah hanya bulan yang dipilih', () => {
    const report = buildReport(base(), '2026-10')
    expect(report.expense).toBe(150_000)
    expect(report.noteCount).toBe(3)
    expect(report.manualIncome).toBe(50_000)
  })

  it('uang jajan harian masuk pemasukan laporan', () => {
    const report = buildReport(base(), '2026-10') // Oktober 31 hari × Rp 100.000
    expect(report.allowance).toBeCloseTo(3_100_000, 6)
    expect(report.income).toBeCloseTo(3_150_000, 6)
    expect(report.net).toBeCloseTo(3_000_000, 6)
  })

  it('tanpa mode periode → uang jajan 0', () => {
    const state = base()
    state.mode = null
    expect(buildReport(state, '2026-10').allowance).toBe(0)
  })

  it('rincian per kategori terurut dengan share benar', () => {
    const report = buildReport(base(), '2026-10')
    expect(report.byCategory.map((item) => item.category.id)).toEqual(['tabungan', 'nongkrong', 'makan'])
    expect(report.byCategory[0].share).toBeCloseTo(100_000 / 150_000, 6)
  })

  it('progres target pakai saldo efektif, tabungan bulan ini tercatat', () => {
    const [first] = buildReport(base(), '2026-10').byGoal
    expect(first.saved).toBe(600_000)
    expect(first.logged).toBe(100_000)
    expect(first.percent).toBe(10)
  })

  it('pengeluaran terbesar, bulan kosong, dan bulan penuh di luar data', () => {
    const september = buildReport(base(), '2026-09')
    expect(september.topExpenses).toHaveLength(1)
    expect(september.topExpenses[0].amount).toBe(999_000)

    const january = buildReport(base(), '2027-01')
    expect(january.expense).toBe(0)
    expect(january.noteCount).toBe(0)
    expect(january.allowance).toBeCloseTo(3_100_000, 6)
  })

  it('monthDays benar untuk bulan kabisat', () => {
    expect(monthDays('2028-02')).toBe(29)
    expect(monthDays('2026-02')).toBe(28)
  })

  it('savingsByGoalOf mengabaikan kategori dan goalId yang kosong', () => {
    expect(
      savingsByGoalOf([
        { id: 'e1', date: '2026-10-01', categoryId: 'tabungan', note: '', amount: 10_000, goalId: 'g1' },
        { id: 'e2', date: '2026-10-01', categoryId: 'tabungan', note: '', amount: 5_000 },
        { id: 'e3', date: '2026-10-01', categoryId: 'makan', note: '', amount: 7_000, goalId: 'g1' },
      ]),
    ).toEqual({ g1: 10_000 })
  })
})
