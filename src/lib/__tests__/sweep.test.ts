import { describe, expect, it } from 'vitest'
import type { AppState } from '../../types'
import { sweepTransition } from '../sweep'
import { categoryKind, initialState } from '../state'
import { periodRange } from '../allocation'
import { derive } from '../derive'

const NOW = new Date(2026, 9, 7, 12) // Rabu
const CUR = periodRange('week', NOW) // Sen 5-Min 11 Okt 2026
const PREV = periodRange('week', new Date(2026, 8, 30, 12)) // Sen 28 Sep-Min 4 Okt

function stateWith(patch: Partial<AppState>): AppState {
  return { ...initialState(), ...patch }
}

describe('jenis kategori', () => {
  it('resolusi: explicit > bawaan kategori > default harian', () => {
    expect(categoryKind({ id: 'nongkrong' })).toBe('keinginan')
    expect(categoryKind({ id: 'makan' })).toBe('harian')
    expect(categoryKind({ id: 'tabungan' })).toBe('tabungan')
    expect(categoryKind({ id: 'nongkrong', kind: 'harian' })).toBe('harian')
    expect(categoryKind({ id: 'cat-custom' })).toBe('harian')
  })
})

describe('sapuan akhir periode ke pot tabungan', () => {
  it('inisialisasi periode pertama tanpa menyapu', () => {
    const next = sweepTransition(stateWith({ mode: 'week', allowance: 700_000, periodKey: '' }), CUR)
    expect(next.periodKey).toBe(CUR.startISO)
    expect(next.endSavings).toBe(0)
  })

  it('periode sama tidak mengubah apa pun', () => {
    const state = stateWith({ mode: 'week', periodKey: CUR.startISO, endSavings: 10_000 })
    expect(sweepTransition(state, CUR)).toBe(state)
  })

  it('sisa semua kategori periode lalu masuk ke pot', () => {
    const state = stateWith({
      mode: 'week',
      allowance: 700_000,
      periodKey: PREV.startISO,
      endSavings: 10_000,
      expenses: [
        { id: 'e1', date: '2026-10-01', categoryId: 'makan', note: '', amount: 150_000 },
        { id: 'e2', date: '2026-10-02', categoryId: 'nongkrong', note: '', amount: 50_000 },
        { id: 'e3', date: '2026-10-03', categoryId: 'tabungan', note: '', amount: 20_000 },
      ],
    })
    const next = sweepTransition(state, CUR)

    expect(next.periodKey).toBe(CUR.startISO)
    // makan 210−150, transport 140−0, pulsa 35−0, nongkrong 105−50,
    // dana darurat 49−0, ditabung 140−20, langganan 21−0 = 480.000
    expect(next.endSavings).toBe(490_000)
  })

  it('belanja di luar periode sebelumnya tidak mengurangi sisa', () => {
    const state = stateWith({
      mode: 'week',
      allowance: 700_000,
      periodKey: PREV.startISO,
      expenses: [{ id: 'e1', date: '2026-10-05', categoryId: 'makan', note: '', amount: 500_000 }],
    })
    const next = sweepTransition(state, CUR)
    // semua kategori penuh (belanja 5 Okt bukan milik periode lalu)
    expect(next.endSavings).toBe(700_000)
  })

  it('sisa nol tidak menambah pot', () => {
    const state = stateWith({
      mode: 'week',
      allowance: 700_000,
      periodKey: PREV.startISO,
      expenses: [
        { id: 'e1', date: '2026-10-01', categoryId: 'makan', note: '', amount: 999_000 },
        { id: 'e2', date: '2026-10-01', categoryId: 'transport', note: '', amount: 999_000 },
        { id: 'e3', date: '2026-10-01', categoryId: 'pulsa', note: '', amount: 999_000 },
        { id: 'e4', date: '2026-10-01', categoryId: 'nongkrong', note: '', amount: 999_000 },
        { id: 'e5', date: '2026-10-01', categoryId: 'dana-darurat', note: '', amount: 999_000 },
        { id: 'e6', date: '2026-10-01', categoryId: 'tabungan', note: '', amount: 999_000 },
        { id: 'e7', date: '2026-10-01', categoryId: 'langganan', note: '', amount: 999_000 },
      ],
    })
    expect(sweepTransition(state, CUR).endSavings).toBe(0)
  })
})

describe('derive tanpa rollover', () => {
  it('sisa periode = allowance − belanja (pot di luar perhitungan)', () => {
    const state = stateWith({
      mode: 'week',
      allowance: 700_000,
      endSavings: 60_000,
      periodKey: CUR.startISO,
      expenses: [{ id: 'e1', date: '2026-10-07', categoryId: 'makan', note: '', amount: 100_000 }],
    })
    const derived = derive(state, NOW)
    expect(derived.remainingInPeriod).toBe(600_000)
    expect(derived.safeToSpend).toBeCloseTo(600_000 / 4, 4)
  })
})
