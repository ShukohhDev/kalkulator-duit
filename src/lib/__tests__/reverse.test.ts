import { describe, expect, it } from 'vitest'
import { reversePlan } from '../reverse'

describe('kalkulator terbalik', () => {
  it('membagi rata sisa target per bulan/minggu/hari', () => {
    const plan = reversePlan({ target: 1_200_000, saved: 200_000, months: 10 })!
    expect(plan.gap).toBe(1_000_000)
    expect(plan.perMonth).toBe(100_000)
    expect(plan.perWeek).toBeCloseTo((100_000 * 12) / 52, 6)
    expect(plan.perDay).toBeCloseTo(100_000 / 30, 6)
    expect(plan.achieved).toBe(false)
  })

  it('target sudah tercapai → tanpa setoran', () => {
    const plan = reversePlan({ target: 100_000, saved: 150_000, months: 6 })!
    expect(plan.gap).toBe(0)
    expect(plan.perMonth).toBe(0)
    expect(plan.achieved).toBe(true)
  })

  it('input tak valid → null', () => {
    expect(reversePlan({ target: 0, saved: 0, months: 12 })).toBeNull()
    expect(reversePlan({ target: 100_000, saved: 0, months: 0 })).toBeNull()
    expect(reversePlan({ target: Number.NaN, saved: 0, months: 12 })).toBeNull()
    expect(reversePlan({ target: -1, saved: 0, months: 12 })).toBeNull()
  })
})
