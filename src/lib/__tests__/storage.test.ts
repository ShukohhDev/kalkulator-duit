import { describe, expect, it } from 'vitest'
import { sanitize } from '../storage'

const legacyCategories = [
  { id: 'makan', name: 'Makan & Minum', ratio: 0.5, builtin: true, color: '#e8590c' },
  { id: 'transport', name: 'Transport & Pulsa', ratio: 0.2, builtin: true, color: '#1971c2' },
  { id: 'nongkrong', name: 'Nongkrong / Ngopi', ratio: 0.1, builtin: true, color: '#9c36b5' },
  { id: 'tabungan', name: 'Ditabung / Investasi', ratio: 0.2, builtin: true, color: '#2f9e44' },
  { id: 'custom', name: 'Beli Buku', ratio: 0, builtin: false, color: '#5f3dc4' },
]

const legacy = {
  version: 1,
  mode: 'week',
  allowance: 700_000,
  categories: legacyCategories,
  expenses: [{ id: 'e1', date: '2026-10-01', categoryId: 'transport', note: 'bus', amount: 15_000 }],
}

describe('migrasi kategori lama ke 5 kategori', () => {
  it('memecah Transport & Pulsa 20% menjadi transport 15% + pulsa 5%', () => {
    const state = sanitize(legacy)
    const transport = state.categories.find((category) => category.id === 'transport')!
    const pulsa = state.categories.find((category) => category.id === 'pulsa')!

    expect(transport.ratio).toBeCloseTo(0.15, 9)
    expect(pulsa.ratio).toBeCloseTo(0.05, 9)
    expect(transport.name).toBe('Transport / Bensin')
    expect(pulsa.name).toBe('Pulsa & Kuota')

    const sum = state.categories.reduce((total, category) => total + category.ratio, 0)
    expect(sum).toBeCloseTo(1, 9)
  })

  it('rasio transport kustom dibagi 3:1 dan jumlah tetap 100%', () => {
    const custom = legacyCategories.map((category) =>
      category.id === 'transport'
        ? { ...category, ratio: 0.25 }
        : category.id === 'tabungan'
          ? { ...category, ratio: 0.15 }
          : category,
    )
    const state = sanitize({ ...legacy, categories: custom })
    const transport = state.categories.find((category) => category.id === 'transport')!
    const pulsa = state.categories.find((category) => category.id === 'pulsa')!

    expect(transport.ratio).toBeCloseTo(0.1875, 9)
    expect(pulsa.ratio).toBeCloseTo(0.0625, 9)
    const sum = state.categories.reduce((total, category) => total + category.ratio, 0)
    expect(sum).toBeCloseTo(1, 9)
  })

  it('kategori buatan pengguna dan catatan lama tidak tersentuh', () => {
    const state = sanitize(legacy)
    expect(state.categories.find((category) => category.id === 'custom')?.name).toBe('Beli Buku')
    expect(state.expenses).toHaveLength(1)
    expect(state.expenses[0].categoryId).toBe('transport')
  })

  it('data baru (sudah ada pulsa) tidak dimigrasi ulang dan idempoten', () => {
    const fresh = sanitize({ version: 1 })
    expect(fresh.categories).toHaveLength(5)
    expect(fresh.categories.find((category) => category.id === 'pulsa')?.ratio).toBe(0.05)
    expect(sanitize(JSON.parse(JSON.stringify(fresh)))).toEqual(fresh)
  })
})
