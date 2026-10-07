import { describe, expect, it } from 'vitest'
import type { AppState } from '../../types'
import { buildCashflow, derive, expenseLast7Days } from '../derive'
import { initialState } from '../state'

const now = new Date(2026, 9, 10) // Sabtu, 10 Oktober 2026

function base(mode: 'week' | 'month', allowance: number): AppState {
  const state = initialState()
  state.mode = mode
  state.allowance = allowance
  return state
}

describe('savingsByGoal', () => {
  it('menjumlah pengeluaran kategori tabungan per target', () => {
    const state = base('week', 70_000)
    state.expenses = [
      { id: 'e1', date: '2026-10-06', categoryId: 'tabungan', note: 'setor', amount: 20_000, goalId: 'g1' },
      { id: 'e2', date: '2026-10-07', categoryId: 'tabungan', note: 'setor', amount: 15_000, goalId: 'g1' },
      { id: 'e3', date: '2026-10-07', categoryId: 'tabungan', note: 'setor', amount: 5_000, goalId: 'g2' },
      { id: 'e4', date: '2026-10-07', categoryId: 'tabungan', note: 'setor', amount: 9_000 },
      { id: 'e5', date: '2026-10-07', categoryId: 'makan', note: 'nasi', amount: 10_000, goalId: 'g1' },
    ]

    expect(derive(state, now).savingsByGoal).toEqual({ g1: 35_000, g2: 5_000 })
  })

  it('tetap dihitung sebagai pengeluaran (bukan dikecualikan)', () => {
    const state = base('week', 70_000)
    state.expenses = [{ id: 'e1', date: '2026-10-06', categoryId: 'tabungan', note: 'setor', amount: 20_000, goalId: 'g1' }]
    const derived = derive(state, now)
    expect(derived.totalExpense).toBe(20_000)
    expect(derived.spentInPeriod).toBe(20_000)
  })
})

describe('uang jajan harian', () => {
  it('mingguan dibagi rata 7 hari, dari awal periode sampai hari ini', () => {
    const derived = derive(base('week', 70_000), now)
    expect(derived.generatedIncomes).toHaveLength(6) // Senin 5 Okt - Sabtu 10 Okt
    expect(derived.generatedIncomes.every((item) => Math.abs(item.amount - 10_000) < 1e-9)).toBe(true)
    expect(derived.totalIncome).toBeCloseTo(60_000, 6)
  })

  it('bulanan dibagi rata sesuai jumlah hari bulan itu', () => {
    const derived = derive(base('month', 620_000), now)
    expect(derived.generatedIncomes).toHaveLength(10) // 1-10 Oktober
    expect(derived.generatedIncomes.every((item) => Math.abs(item.amount - 20_000) < 1e-9)).toBe(true)
    expect(derived.totalIncome).toBeCloseTo(200_000, 6)
  })

  it('tanpa periode atau tanpa uang jajan tidak menghasilkan pemasukan', () => {
    const state = initialState()
    expect(derive(state, now).generatedIncomes).toHaveLength(0)
    expect(derive(base('week', 0), now).generatedIncomes).toHaveLength(0)
  })
})

describe('buildCashflow', () => {
  it('menjumlah pengeluaran per kategori pada jendela yang sama dengan grafik', () => {
    const now = new Date(2026, 9, 4)
    const incomes = [{ id: 'i1', date: '2026-10-01', source: 'Gaji', amount: 500_000 }]
    const expenses = [
      { date: '2026-10-01', amount: 15_000, categoryId: 'makan' },
      { date: '2026-10-02', amount: 5_000, categoryId: 'makan' },
      { date: '2026-10-03', amount: 10_000, categoryId: 'transport' },
      { date: '2026-01-15', amount: 99_000, categoryId: 'nongkrong' },
    ]

    const series = buildCashflow(incomes, expenses, 'day', now)

    expect(series.categoryTotals).toEqual({ makan: 20_000, transport: 10_000 })
    expect(series.expense.reduce((sum, value) => sum + value, 0)).toBe(30_000)
  })

  it('mengembalikan struktur kosong tanpa data', () => {
    const series = buildCashflow([], [], 'day', new Date(2026, 9, 4))
    expect(series.labels).toEqual([])
    expect(series.categoryTotals).toEqual({})
  })
})

describe('wishlistSavings', () => {
  it('menjumlah pengeluaran kategori tabungan yang diarahkan ke incaran', () => {
    const state: AppState = {
      ...initialState(),
      expenses: [
        { id: 'e1', date: '2026-10-01', categoryId: 'tabungan', note: 'setor', amount: 50_000, wishlistId: 'w1' },
        { id: 'e2', date: '2026-10-02', categoryId: 'tabungan', note: 'setor lagi', amount: 20_000, wishlistId: 'w1' },
        { id: 'e3', date: '2026-10-03', categoryId: 'tabungan', note: 'ke target', amount: 30_000, goalId: 'g1' },
        { id: 'e4', date: '2026-10-03', categoryId: 'makan', note: 'nasi', amount: 15_000, wishlistId: 'w2' },
      ],
    }
    const derived = derive(state, new Date(2026, 9, 4))
    expect(derived.wishlistSavings).toEqual({ w1: 70_000 })
  })
})

describe('expenseLast7Days', () => {
  it('menjumlah 7 hari terakhir hingga hari ini dan merinci hari ini per kategori', () => {
    const now = new Date(2026, 9, 10) // Sabtu, 10 Oktober 2026
    const state = initialState()
    state.expenses = [
      { id: 'e1', date: '2026-10-10', categoryId: 'makan', note: 'nasi', amount: 15_000 },
      { id: 'e2', date: '2026-10-10', categoryId: 'transport', note: 'ojek', amount: 5_000 },
      { id: 'e3', date: '2026-10-04', categoryId: 'makan', note: '6 hari lalu', amount: 9_000 },
      { id: 'e4', date: '2026-10-03', categoryId: 'makan', note: 'di luar jendela', amount: 99_000 },
    ]

    const week = expenseLast7Days(state, now)

    expect(week.days.map((day) => day.iso)).toEqual([
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
    ])
    expect(week.total7).toBe(29_000)
    expect(week.today.iso).toBe('2026-10-10')
    expect(week.today.total).toBe(20_000)
    expect(week.today.byCategory).toEqual([
      { id: 'makan', name: 'Makan & minum', amount: 15_000 },
      { id: 'transport', name: 'Transportasi/bensin', amount: 5_000 },
    ])
    expect(week.days[6]).toEqual({ iso: '2026-10-10', label: 'S', total: 20_000 })
  })

  it('menghasilkan 7 hari nol tanpa pengeluaran', () => {
    const week = expenseLast7Days(initialState(), new Date(2026, 9, 10))
    expect(week.days).toHaveLength(7)
    expect(week.total7).toBe(0)
    expect(week.today.byCategory).toEqual([])
  })
})
