import type { PeriodMode } from '../types'

export const DAYS_PER_YEAR = 365
export const WEEKS_PER_YEAR = DAYS_PER_YEAR / 7
export const MONTHS_PER_YEAR = 12

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatIDR(value: number): string {
  if (!Number.isFinite(value)) return 'Rp 0'
  return rupiah.format(Math.round(value))
}

export function parseAmount(raw: string): number {
  const digits = raw.replace(/[^\d-]/g, '')
  if (!digits) return 0
  const n = Number(digits)
  return Number.isFinite(n) ? n : 0
}

export function toYearly(amount: number, mode: PeriodMode): number {
  return mode === 'week' ? (amount * DAYS_PER_YEAR) / 7 : amount * MONTHS_PER_YEAR
}

export function fromYearly(yearly: number, mode: PeriodMode): number {
  return mode === 'week' ? (yearly * 7) / DAYS_PER_YEAR : yearly / MONTHS_PER_YEAR
}

export const perDay = (yearly: number): number => yearly / DAYS_PER_YEAR
export const perWeek = (yearly: number): number => (yearly * 7) / DAYS_PER_YEAR
export const perMonth = (yearly: number): number => yearly / MONTHS_PER_YEAR

export function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function todayISO(): string {
  return toISO(new Date())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b - a) / 86400000)
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDate(iso: string): string {
  return parseISO(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}
