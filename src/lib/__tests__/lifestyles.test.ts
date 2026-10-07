import { describe, expect, it } from 'vitest'
import type { Category } from '../../types'
import { LIFESTYLES, applyLifestyle, findLifestyle, isLifestyleId } from '../lifestyles'
import { initialState } from '../state'

function cats(): Category[] {
  return initialState().categories
}

describe('gaya hidup', () => {
  it('seimbang tidak mengubah kategori dan id tak dikenal jatuh ke seimbang', () => {
    const list = cats()
    expect(applyLifestyle(list, 'seimbang')).toBe(list)
    expect(applyLifestyle(list, 'ngawur')).toBe(list)
    expect(findLifestyle('ngawur').id).toBe('seimbang')
    expect(isLifestyleId('hemat')).toBe(true)
    expect(isLifestyleId(42)).toBe(false)
  })

  it('hemat memangkas keinginan, memperkuat tabungan, total tetap 100%', () => {
    const list = cats()
    const before = new Map(list.map((category) => [category.id, category.ratio]))
    const result = applyLifestyle(list, 'hemat')

    const nongkrong = result.find((category) => category.id === 'nongkrong')!
    const tabungan = result.find((category) => category.id === 'tabungan')!
    expect(nongkrong.ratio).toBeLessThan(before.get('nongkrong')!)
    expect(tabungan.ratio).toBeGreaterThan(before.get('tabungan')!)
    // harian tidak difaktori, hanya ikut dinormalkan
    const makan = result.find((category) => category.id === 'makan')!
    expect(makan.ratio).toBeLessThanOrEqual(before.get('makan')!)
    expect(result.reduce((sum, category) => sum + category.ratio, 0)).toBeCloseTo(1, 9)
    // kategori asli tidak dimutasi
    expect(list.find((category) => category.id === 'nongkrong')!.ratio).toBe(before.get('nongkrong')!)
  })

  it('santai menaikkan keinginan dan menurunkan tabungan', () => {
    const result = applyLifestyle(cats(), 'santai')
    const before = new Map(cats().map((category) => [category.id, category.ratio]))
    expect(result.find((category) => category.id === 'nongkrong')!.ratio).toBeGreaterThan(
      before.get('nongkrong')!,
    )
    expect(result.find((category) => category.id === 'tabungan')!.ratio).toBeLessThan(before.get('tabungan')!)
    expect(result.reduce((sum, category) => sum + category.ratio, 0)).toBeCloseTo(1, 9)
  })

  it('daftar lengkap dan konsisten', () => {
    expect(LIFESTYLES.map((item) => item.id)).toEqual(['seimbang', 'hemat', 'santai'])
    for (const item of LIFESTYLES) expect(item.blurb.length).toBeGreaterThan(0)
  })
})
