import type { Category, PeriodMode } from '../types'
import { addDays, toISO } from './money'

export interface Allocation {
  makan: number
  transport: number
  nongkrong: number
  tabungan: number
}

export const ALLOCATION_RATIOS = {
  makan: 0.5,
  transport: 0.2,
  nongkrong: 0.1,
  tabungan: 0.2,
} as const

export function computeAllocation(allowance: number): Allocation {
  return {
    makan: allowance * ALLOCATION_RATIOS.makan,
    transport: allowance * ALLOCATION_RATIOS.transport,
    nongkrong: allowance * ALLOCATION_RATIOS.nongkrong,
    tabungan: allowance * ALLOCATION_RATIOS.tabungan,
  }
}

export function allocationFor(
  allowance: number,
  categoryId: string,
  categories: Category[],
): number {
  const category = categories.find((item) => item.id === categoryId)
  if (!category) return 0
  return allowance * category.ratio
}

export interface PeriodRange {
  start: Date
  end: Date
  startISO: string
  endISO: string
  totalDays: number
}

function startOfWeek(date: Date): Date {
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  return addDays(date, offset)
}

export function periodRange(mode: PeriodMode, ref: Date = new Date()): PeriodRange {
  let start: Date
  let end: Date

  if (mode === 'week') {
    start = startOfWeek(ref)
    end = addDays(start, 6)
  } else {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1)
    end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  }

  return {
    start,
    end,
    startISO: toISO(start),
    endISO: toISO(end),
    totalDays: Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
  }
}

export function dailyAllowanceEntries(
  allowance: number,
  mode: PeriodMode,
  fromISO: string,
  toISODate: string,
): { iso: string; amount: number }[] {
  const entries: { iso: string; amount: number }[] = []
  if (allowance <= 0 || fromISO > toISODate) return entries

  let cursor = new Date(fromISO + 'T00:00:00')
  const to = new Date(toISODate + 'T00:00:00')
  let guard = 0

  while (cursor <= to && guard < 800) {
    const amount = mode === 'week' ? allowance / 7 : allowance / daysInMonth(cursor)
    entries.push({ iso: toISO(cursor), amount })
    cursor = addDays(cursor, 1)
    guard++
  }

  return entries
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}
