import { describe, expect, it } from 'vitest'
import type { Expense } from '../../types'
import { currentStreak, evaluateBadges } from '../streak'
import { initialState } from '../state'

const now = new Date(2026, 9, 10) // Sabtu, 10 Oktober 2026

function exp(date: string): Expense {
  return { id: `e-${date}`, date, categoryId: 'makan', note: '', amount: 10_000 }
}

describe('currentStreak', () => {
  it('tanpa catatan → 0', () => {
    expect(currentStreak([], now)).toBe(0)
  })

  it('hari ini saja → 1', () => {
    expect(currentStreak([exp('2026-10-10')], now)).toBe(1)
  })

  it('beruntun 3 hari sampai hari ini', () => {
    const list = [exp('2026-10-10'), exp('2026-10-09'), exp('2026-10-08'), exp('2026-10-01')]
    expect(currentStreak(list, now)).toBe(3)
  })

  it('kemarin saja masih dihitung (grace)', () => {
    expect(currentStreak([exp('2026-10-09')], now)).toBe(1)
  })

  it('ada celah → streak terputus', () => {
    expect(currentStreak([exp('2026-10-10'), exp('2026-10-08')], now)).toBe(1)
  })

  it('terakhir 3 hari lalu → 0', () => {
    expect(currentStreak([exp('2026-10-07')], now)).toBe(0)
  })
})

describe('evaluateBadges', () => {
  it('belum ada apa-apa → semua terkunci kecuali tidak ada', () => {
    const badges = evaluateBadges(initialState(), {}, now)
    expect(badges.every((b) => !b.unlocked)).toBe(true)
  })

  it('catatan pertama membuka badge', () => {
    const state = initialState()
    state.expenses = [exp('2026-10-10')]
    const badges = evaluateBadges(state, {}, now)
    expect(badges.find((b) => b.id === 'first-log')?.unlocked).toBe(true)
    expect(badges.find((b) => b.id === 'streak-7')?.unlocked).toBe(false)
  })

  it('target utama 50% membuka badge setengah jalan', () => {
    const state = initialState()
    state.goals = [
      { id: 'g1', name: 'HP', target: 1_000_000, saved: 500_000, deposit: 0, targetAge: 18, primary: true, active: true },
    ]
    const badges = evaluateBadges(state, {}, now)
    expect(badges.find((b) => b.id === 'goal-half')?.unlocked).toBe(true)
    expect(badges.find((b) => b.id === 'goal-full')?.unlocked).toBe(false)
  })

  it('saldo dari catatan kategori tabungan ikut dihitung', () => {
    const state = initialState()
    state.goals = [
      { id: 'g1', name: 'Sepeda', target: 500_000, saved: 100_000, deposit: 0, targetAge: 18, primary: true, active: true },
    ]
    const badges = evaluateBadges(state, { g1: 400_000 }, now)
    expect(badges.find((b) => b.id === 'goal-full')?.unlocked).toBe(true)
  })
})
