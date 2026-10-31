import { describe, expect, it } from 'vitest'
import type { Expense } from '../../types'
import { challenge, CHALLENGE_RATIO } from '../challenge'
import { derive } from '../derive'
import { initialState } from '../state'
import { periodRange } from '../allocation'
import { addDays, toISO } from '../money'

const now = new Date(2026, 9, 14) // Rabu

function base() {
  const state = initialState()
  state.mode = 'week'
  state.allowance = 700_000
  return state
}

function expense(date: string, amount: number): Expense {
  return { id: `e-${date}-${amount}`, date, categoryId: 'makan', note: '', amount }
}

describe('tantangan hemat otomatis', () => {
  it('tanpa mode atau uang jajan 0 → null', () => {
    expect(challenge(initialState(), derive(initialState(), now))).toBeNull()
    const zero = base()
    zero.allowance = 0
    expect(challenge(zero, derive(zero, now))).toBeNull()
  })

  it('target = 80% uang jajan, progres dari belanja periode ini', () => {
    const state = base()
    const period = periodRange('week', now)
    state.expenses.push(expense(toISO(period.start), 300_000))
    const result = challenge(state, derive(state, now))!
    expect(result.target).toBe(700_000 * CHALLENGE_RATIO)
    expect(result.spent).toBe(300_000)
    expect(result.left).toBe(560_000 - 300_000)
    expect(result.progressPct).toBe(Math.round((300_000 / 560_000) * 100))
    expect(result.passed).toBe(true)
    expect(result.finished).toBe(false)
  })

  it('melewati target → tidak lolos, periode sebelumnya yang bercatatan dihitung jadi poin', () => {
    const state = base()
    const current = periodRange('week', now)
    state.expenses.push(expense(toISO(current.start), 600_000)) // > 560rb → kalah

    // minggu lalu menang (200rb), minggu dua lalu kalah (650rb), minggu tiga lalu menang
    const prev = periodRange('week', addDays(current.start, -1))
    const prev2 = periodRange('week', addDays(prev.start, -1))
    const prev3 = periodRange('week', addDays(prev2.start, -1))
    state.expenses.push(expense(toISO(prev.start), 200_000))
    state.expenses.push(expense(toISO(prev2.start), 650_000))
    state.expenses.push(expense(toISO(prev3.start), 100_000))
    // minggu tanpa catatan tidak dihitung (prev2+3 di atas sudah termasuk)

    const result = challenge(state, derive(state, now))!
    expect(result.passed).toBe(false)
    expect(result.points).toBe(2)
    expect(result.streak).toBe(1) // menang terbaru, lalu kalah memutus deret
  })

  it('periode berjalan yang sudah lewat ditandai finished', () => {
    const state = base()
    const late = new Date(2026, 9, 25) // Minggu, hari terakhir minggu berjalan
    const result = challenge(state, derive(state, late))!
    expect(result.finished).toBe(true)
    expect(result.passed).toBe(true) // belum ada belanja
  })
})
