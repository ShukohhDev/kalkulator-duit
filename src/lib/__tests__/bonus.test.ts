import { describe, expect, it } from 'vitest'
import { DEFAULT_BONUS_SPLIT, bonusAmounts, sanitizeBonusSplit, splitTotal } from '../bonus'

describe('bonus pemasukan tidak tetap', () => {
  it('membagi bonus 50/30/20 dengan sisa pembulatan ke keinginan', () => {
    expect(bonusAmounts(100_000, DEFAULT_BONUS_SPLIT)).toEqual({ savings: 50_000, buffer: 30_000, fun: 20_000 })
    // 33% dari 100.000 = 33.000 (bulat), sisa 1.000 ke fun
    expect(bonusAmounts(100_000, { savings: 33, buffer: 33, fun: 34 })).toEqual({
      savings: 33_000,
      buffer: 33_000,
      fun: 34_000,
    })
    expect(bonusAmounts(0, DEFAULT_BONUS_SPLIT)).toEqual({ savings: 0, buffer: 0, fun: 0 })
  })

  it('jumlah persen dihitung dari ketiga bidang', () => {
    expect(splitTotal(DEFAULT_BONUS_SPLIT)).toBe(100)
    expect(splitTotal({ savings: 60, buffer: 30, fun: 20 })).toBe(110)
  })

  it('sanitize mengembalikan default kalau rusak dan meng-clamp nilai valid', () => {
    expect(sanitizeBonusSplit(null)).toEqual(DEFAULT_BONUS_SPLIT)
    expect(sanitizeBonusSplit('abc')).toEqual(DEFAULT_BONUS_SPLIT)
    expect(sanitizeBonusSplit({ savings: 60, buffer: -5, fun: 'x' })).toEqual({
      savings: 60,
      buffer: 0,
      fun: DEFAULT_BONUS_SPLIT.fun,
    })
    expect(sanitizeBonusSplit({ savings: 250.4, buffer: 10, fun: 10 })).toEqual({
      savings: 100,
      buffer: 10,
      fun: 10,
    })
  })
})
