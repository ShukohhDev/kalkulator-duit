import { describe, expect, it } from 'vitest'
import type { AppState } from '../../types'
import { MAX_ACTIVITY, appendActivity, diffActivity } from '../activity'
import { initialState } from '../state'
import { sanitize } from '../storage'
import { formatIDR } from '../money'

function stateWith(patch: Partial<AppState>): AppState {
  return { ...initialState(), ...patch }
}

describe('catatan aktivitas', () => {
  it('mencatat pemasukan & pengeluaran baru, mengabaikan edit dan hapus', () => {
    const prev = stateWith({
      categories: [{ id: 'makan', name: 'Makan & minum', ratio: 1, builtin: true, color: '#e8590c' }],
      expenses: [{ id: 'e1', date: '2026-10-01', categoryId: 'makan', note: 'nasi', amount: 10_000 }],
      incomes: [{ id: 'i1', date: '2026-10-01', source: 'Transfer', amount: 50_000 }],
    })
    const next = stateWith({
      categories: prev.categories,
      expenses: [
        { ...prev.expenses[0], amount: 12_000 },
        { id: 'e2', date: '2026-10-02', categoryId: 'makan', note: 'ayam', amount: 15_000 },
      ],
      incomes: prev.incomes,
    })

    const added = diffActivity(prev, next)
    expect(added).toHaveLength(1)
    expect(added[0].kind).toBe('pengeluaran')
    expect(added[0].text).toContain(formatIDR(15_000))
    expect(added[0].text).toContain('Makan & minum')
    expect(added[0].text).toContain('ayam')

    const removed = diffActivity(prev, stateWith({ categories: prev.categories }))
    expect(removed).toHaveLength(0)
  })

  it('entri terbaru di depan dan dibatasi 200', () => {
    let state = initialState()
    for (let i = 0; i < MAX_ACTIVITY + 25; i += 1) {
      state = appendActivity(state, 'pengeluaran', `beli ${i}`)
    }
    expect(state.activity).toHaveLength(MAX_ACTIVITY)
    expect(state.activity[0].text).toBe(`beli ${MAX_ACTIVITY + 24}`)
    expect(state.activity[MAX_ACTIVITY - 1].text).toBe('beli 25')
  })

  it('sanitize membuang entri rusak dan menyimpan yang valid', () => {
    const state = sanitize({
      activity: [
        { id: 'a1', ts: 1, kind: 'login', text: 'Masuk ke akun adi' },
        { id: 'a2', ts: 2, kind: 'aneh', text: 'buang' },
        { id: 'a3', ts: 3, kind: 'pemasukan', text: '' },
        'bukan-objek',
      ],
    })
    expect(state.activity).toHaveLength(1)
    expect(state.activity[0]).toMatchObject({ id: 'a1', kind: 'login', text: 'Masuk ke akun adi' })
  })
})
