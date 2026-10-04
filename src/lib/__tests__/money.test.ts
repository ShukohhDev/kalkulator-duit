import { describe, expect, it } from 'vitest'
import {
  DAYS_PER_YEAR,
  formatIDR,
  fromYearly,
  monthKey,
  parseAmount,
  perDay,
  perMonth,
  perWeek,
  toYearly,
} from '../money'
import { computeAllocation, dailyAllowanceEntries, periodRange } from '../allocation'

describe('konversi periode', () => {
  it('uang jajan mingguan → tahunan memakai 365/7', () => {
    expect(toYearly(70_000, 'week')).toBeCloseTo(70_000 * (DAYS_PER_YEAR / 7), 6)
  })

  it('uang jajan bulanan → tahunan dikali 12', () => {
    expect(toYearly(300_000, 'month')).toBe(3_600_000)
  })

  it('bolak-balik konsisten', () => {
    for (const mode of ['week', 'month'] as const) {
      const yearly = toYearly(123_456, mode)
      expect(fromYearly(yearly, mode)).toBeCloseTo(123_456, 6)
    }
  })

  it('harian + mingguan + bulanan ≈ tahunan', () => {
    const yearly = toYearly(500_000, 'month')
    const sum = perDay(yearly) * 365
    expect(sum).toBeCloseTo(yearly, 6)
    expect(perWeek(yearly) * (365 / 7)).toBeCloseTo(yearly, 6)
    expect(perMonth(yearly) * 12).toBeCloseTo(yearly, 6)
  })
})

describe('format & parse', () => {
  it('formatIDR', () => {
    expect(formatIDR(15000)).toContain('15.000')
    expect(formatIDR(0)).toContain('0')
  })

  it('parseAmount buang pemisah ribuan', () => {
    expect(parseAmount('Rp 1.500.000')).toBe(1500000)
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('abc')).toBe(0)
  })

  it('monthKey', () => {
    expect(monthKey('2026-10-03')).toBe('2026-10')
  })
})

describe('alokasi 50/15/5/10/20', () => {
  it('menjumlah 100% dari uang jajan', () => {
    const a = computeAllocation(700_000)
    expect(a.makan).toBe(350_000)
    expect(a.transport).toBe(105_000)
    expect(a.pulsa).toBe(35_000)
    expect(a.nongkrong).toBe(70_000)
    expect(a.tabungan).toBe(140_000)
    expect(a.makan + a.transport + a.pulsa + a.nongkrong + a.tabungan).toBe(700_000)
  })
})

describe('rentang periode', () => {
  it('minggu dimulai Senin', () => {
    const range = periodRange('week', new Date(2026, 9, 3)) // Sabtu
    expect(range.startISO).toBe('2026-09-28')
    expect(range.endISO).toBe('2026-10-04')
    expect(range.totalDays).toBe(7)
  })

  it('bulan = 1 sampai akhir bulan', () => {
    const range = periodRange('month', new Date(2026, 9, 15))
    expect(range.startISO).toBe('2026-10-01')
    expect(range.endISO).toBe('2026-10-31')
    expect(range.totalDays).toBe(31)
  })

  it('uang jajan dibagi rata per hari', () => {
    const weekly = dailyAllowanceEntries(70_000, 'week', '2026-10-01', '2026-10-03')
    expect(weekly.map((e) => e.iso)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
    expect(weekly.every((e) => Math.abs(e.amount - 10_000) < 1e-9)).toBe(true)

    const monthly = dailyAllowanceEntries(620_000, 'month', '2026-10-01', '2026-10-31')
    expect(monthly).toHaveLength(31)
    expect(monthly.reduce((sum, e) => sum + e.amount, 0)).toBeCloseTo(620_000, 6)

    expect(dailyAllowanceEntries(70_000, 'week', '2026-10-05', '2026-10-01')).toEqual([])
    expect(dailyAllowanceEntries(0, 'week', '2026-10-01', '2026-10-03')).toEqual([])
  })
})
