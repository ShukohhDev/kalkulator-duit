import { describe, expect, it } from 'vitest'
import type { AppState, Expense } from '../../types'
import { buildTips } from '../tips'
import { derive } from '../derive'
import { initialState } from '../state'

const now = new Date(2026, 9, 10) // Jumat 10 Okt; periode Sen 5 - Min 11 Okt

function base(): AppState {
  const state = initialState()
  state.mode = 'week'
  state.allowance = 700_000
  return state
}

function expense(date: string, categoryId: string, amount: number): Expense {
  return { id: `e-${date}-${categoryId}-${amount}`, date, categoryId, note: '', amount }
}

describe('buildTips', () => {
  it('tanpa pengeluaran periode ini → tanpa tips', () => {
    const state = base()
    expect(buildTips(state, derive(state, now))).toEqual([])
    state.expenses = [expense('2026-09-20', 'makan', 90_000)]
    expect(buildTips(state, derive(state, now))).toEqual([])
  })

  it('keinginan dominan → saran pangkas 20%', () => {
    const state = base()
    state.expenses = [expense('2026-10-06', 'nongkrong', 150_000)]
    const tips = buildTips(state, derive(state, now))
    const tip = tips.find((item) => item.id === 'keinginan')
    expect(tip?.text).toContain('Nongkrong & ngopi')
    expect(tip?.text).toContain('pangkas 20%')
  })

  it('setengah hari berlalu tanpa setoran → saran mulai menabung', () => {
    const state = base()
    state.expenses = [expense('2026-10-06', 'makan', 100_000)]
    const ids = buildTips(state, derive(state, now)).map((item) => item.id)
    expect(ids).toContain('belum-nabung')

    state.expenses.push(expense('2026-10-07', 'tabungan', 20_000))
    const after = buildTips(state, derive(state, now)).map((item) => item.id)
    expect(after).not.toContain('belum-nabung')
  })

  it('belanja padat akhir pekan → saran satukan hari', () => {
    const state = base()
    state.expenses = [expense('2026-10-10', 'makan', 100_000)] // Sabtu
    const tip = buildTips(state, derive(state, now)).find((item) => item.id === 'akhir-pekan')
    expect(tip?.text).toContain('akhir pekan')
  })

  it('banyak transaksi kecil → saran gabungkan', () => {
    const state = base()
    for (let day = 5; day <= 9; day += 1) {
      state.expenses.push(expense(`2026-10-0${day}`, 'makan', 10_000))
      state.expenses.push(expense(`2026-10-0${day}`, 'transport', 12_000))
    }
    state.expenses.push(expense('2026-10-06', 'tabungan', 50_000)) // cegah belum-nabung
    const tip = buildTips(state, derive(state, now)).find((item) => item.id === 'mikro')
    expect(tip?.text).toContain('transaksi kecil')
  })

  it('maksimal 3 tips dengan urutan prioritas', () => {
    const state = base()
    state.expenses = [expense('2026-10-10', 'nongkrong', 150_000)] // Sabtu, keinginan dominan
    for (let i = 1; i <= 8; i += 1) {
      state.expenses.push(expense(`2026-10-0${i < 5 ? i + 1 : 6}`, 'makan', 10_000))
    }
    const tips = buildTips(state, derive(state, now))
    expect(tips).toHaveLength(3)
    expect(tips.map((tip) => tip.id)).toEqual(['keinginan', 'belum-nabung', 'akhir-pekan'])
  })
})
