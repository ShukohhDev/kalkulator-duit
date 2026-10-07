import type { AppState } from '../types'
import { formatIDR } from './money'

const pad = (value: number) => String(value).padStart(2, '0')

function dateValue(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

function dtstamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// jatuh tempo bulanan berikutnya (dueDay dikunci 1–28 supaya aman di semua bulan)
function nextDue(dueDay: number, now: Date): Date {
  const day = Math.min(28, Math.max(1, Math.round(dueDay) || 1))
  const candidate = new Date(now.getFullYear(), now.getMonth(), day)
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (candidate < midnight) return new Date(now.getFullYear(), now.getMonth() + 1, day)
  return candidate
}

// Kalender format iCalendar (RFC 5545) untuk tagihan & angsuran utang,
// dipakai untuk tombol unduh .ics di halaman Kewajiban.
export function buildICS(state: AppState, now: Date = new Date()): string {
  const stamp = dtstamp(now)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kalkulator Uang Jajan//Kewajiban//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const bill of state.bills) {
    if (bill.amount <= 0) continue
    const start = nextDue(bill.dueDay, now)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${bill.id}-tagihan@kalkulator-duitmu`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(start)}`,
      'RRULE:FREQ=MONTHLY',
      `SUMMARY:${escapeText(`${bill.name} · tagihan ${formatIDR(bill.amount)}`)}`,
      `DESCRIPTION:${escapeText(`Tagihan rutin, jatuh tiap tanggal ${start.getDate()}.`)}`,
      'END:VEVENT',
    )
  }

  for (const debt of state.debts) {
    const remaining = debt.total - debt.paid
    if (remaining <= 0 || debt.installment <= 0) continue
    const count = Math.ceil(remaining / debt.installment)
    const start = nextDue(debt.dueDay, now)
    const perMonth = Math.min(debt.installment, remaining)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${debt.id}-utang@kalkulator-duitmu`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(start)}`,
      `RRULE:FREQ=MONTHLY;COUNT:${count}`,
      `SUMMARY:${escapeText(`${debt.name} · angsuran ${formatIDR(perMonth)}`)}`,
      `DESCRIPTION:${escapeText(`Sisa utang ${formatIDR(remaining)}, ${count} angsuran lagi.`)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}
