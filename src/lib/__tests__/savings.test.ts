import { describe, expect, it } from 'vitest'
import {
  ANNUAL_RATE,
  ageAfter,
  formatDuration,
  futureValue,
  monthsToTarget,
  requiredDeposit,
} from '../savings'

const n = 60
const target = 10_000_000

describe('requiredDeposit', () => {
  it('menyetor tanpa saldo awal menghasilkan FV yang benar', () => {
    const deposit = requiredDeposit({ target, saved: 0, months: n })
    expect(deposit).not.toBeNull()
    const fv = futureValue({ target, saved: 0, deposit: deposit!, months: n })
    expect(fv).toBeCloseTo(target, 0)
  })

  it('saldo awal yang tumbuh menurunkan kebutuhan setoran', () => {
    const noBalance = requiredDeposit({ target, saved: 0, months: n })!
    const withBalance = requiredDeposit({ target, saved: 2_000_000, months: n })!
    expect(withBalance).toBeLessThan(noBalance)
  })

  it('target sudah terlampaui → setoran 0', () => {
    expect(requiredDeposit({ target: 1_000_000, saved: 5_000_000, months: n })).toBe(0)
  })

  it('bulan nol → null', () => {
    expect(requiredDeposit({ target, saved: 0, months: 0 })).toBeNull()
  })
})

describe('monthsToTarget', () => {
  it('balik konsisten dengan requiredDeposit', () => {
    const deposit = requiredDeposit({ target, saved: 0, months: n })!
    const months = monthsToTarget({ target, saved: 0, deposit })!
    expect(months).toBeGreaterThanOrEqual(n - 1)
    expect(months).toBeLessThanOrEqual(n + 1)
    expect(futureValue({ target, saved: 0, deposit, months: months - 1 })).toBeLessThan(target)
    expect(futureValue({ target, saved: 0, deposit, months })).toBeGreaterThanOrEqual(target * 0.999999)
  })

  it('tanpa setoran, tumbuh murni dari bunga', () => {
    const months = monthsToTarget({ target: 2_000_000, saved: 1_000_000, deposit: 0 })
    expect(months).toBe(Math.ceil(Math.log(2) / Math.log(1 + ANNUAL_RATE / 12)))
  })

  it('tanpa setoran dan tanpa saldo → tidak pernah tercapai', () => {
    expect(monthsToTarget({ target, saved: 0, deposit: 0 })).toBeNull()
  })

  it('sudah tercapai → 0 bulan', () => {
    expect(monthsToTarget({ target: 100_000, saved: 500_000, deposit: 0 })).toBe(0)
  })
})

describe('futureValue', () => {
  it('bunga majemuk 8% per tahun tumbuh lebih dari setoran kotor', () => {
    const deposit = 100_000
    const fv = futureValue({ target: 0, saved: 0, deposit, months: 120 })
    expect(fv).toBeGreaterThan(deposit * 120)
  })

  it('nol bulan = saldo saat ini', () => {
    expect(futureValue({ target: 0, saved: 750_000, deposit: 10_000, months: 0 })).toBe(750_000)
  })
})

describe('durasi & umur', () => {
  it('formatDuration', () => {
    expect(formatDuration(6)).toBe('6 bulan')
    expect(formatDuration(24)).toBe('2 tahun')
    expect(formatDuration(30)).toBe('2 tahun 6 bulan')
  })

  it('ageAfter', () => {
    expect(ageAfter(17, 18).label).toBe('18 tahun 6 bulan')
    expect(ageAfter(17, 12).years).toBe(18)
  })
})
