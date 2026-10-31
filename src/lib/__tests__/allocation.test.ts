import { describe, expect, it } from 'vitest'
import { allocationFor, roundAllocationCategories, roundTo500 } from '../allocation'
import type { Category } from '../../types'

describe('roundTo500', () => {
  it('membulatkan angka ke kelipatan 500 terdekat', () => {
    expect(roundTo500(56200)).toBe(56000)
    expect(roundTo500(56250)).toBe(56500)
    expect(roundTo500(56000)).toBe(56000)
    expect(roundTo500(32500)).toBe(32500)
    expect(roundTo500(32490)).toBe(32500)
    expect(roundTo500(32240)).toBe(32000)
    expect(roundTo500(0)).toBe(0)
    expect(roundTo500(-500)).toBe(0)
  })
})

describe('roundAllocationCategories', () => {
  const baseCategories: Category[] = [
    { id: 'makan', name: 'Makan', ratio: 0.5, builtin: true, color: '#f59e0b', kind: 'harian' },
    { id: 'jajan', name: 'Jajan', ratio: 0.3, builtin: true, color: '#3b82f6', kind: 'keinginan' },
    { id: 'tabungan', name: 'Tabungan', ratio: 0.2, builtin: true, color: '#10b981', kind: 'tabungan' },
  ]

  it('menghasilkan alokasi yang semuanya kelipatan 500 dan totalnya sama dengan uang saku', () => {
    const allowance = 153500
    const rounded = roundAllocationCategories(baseCategories, allowance)

    let totalAllocated = 0
    for (const cat of rounded) {
      const allocated = allowance * cat.ratio
      expect(allocated % 500).toBe(0)
      totalAllocated += allocated
    }
    expect(totalAllocated).toBe(allowance)
  })

  it('menangani kategori ganjil seimbang (contoh 100.000 dibagi 3)', () => {
    const categories: Category[] = [
      { id: 'a', name: 'A', ratio: 1 / 3, builtin: true, color: '#1', kind: 'harian' },
      { id: 'b', name: 'B', ratio: 1 / 3, builtin: true, color: '#2', kind: 'keinginan' },
      { id: 'c', name: 'C', ratio: 1 / 3, builtin: true, color: '#3', kind: 'tabungan' },
    ]
    const allowance = 100000
    const rounded = roundAllocationCategories(categories, allowance)

    let totalAllocated = 0
    for (const cat of rounded) {
      const allocated = Math.round(allowance * cat.ratio)
      expect(allocated % 500).toBe(0)
      totalAllocated += allocated
    }
    expect(totalAllocated).toBe(100000)
  })

  it('tidak mengubah apa-apa jika uang saku 0 atau kategori kosong', () => {
    expect(roundAllocationCategories([], 100000)).toEqual([])
    expect(roundAllocationCategories(baseCategories, 0)).toEqual(baseCategories)
  })

  it('mengabaikan kategori nonaktif (off)', () => {
    const categoriesWithOff: Category[] = [
      ...baseCategories,
      { id: 'darurat', name: 'Darurat', ratio: 0, builtin: false, color: '#999', kind: 'tabungan', off: true },
    ]
    const rounded = roundAllocationCategories(categoriesWithOff, 100000)
    const offCat = rounded.find((c) => c.id === 'darurat')
    expect(offCat?.ratio).toBe(0)
    expect(offCat?.off).toBe(true)
  })
})

describe('allocationFor', () => {
  it('mengembalikan nominal yang sudah dibulatkan ke kelipatan 500', () => {
    const categories: Category[] = [
      { id: 'makan', name: 'Makan', ratio: 0.333333, builtin: true, color: '#f59e0b', kind: 'harian' },
    ]
    const nominal = allocationFor(100000, 'makan', categories)
    expect(nominal % 500).toBe(0)
  })
})
