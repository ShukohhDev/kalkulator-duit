import type { AppState } from '../types'
import { formatIDR, toISO } from './money'

const REMIND_KEY = 'kalkulator-duitmu:remind'
const REMIND_WINDOW = 7

export function nowDate(): Date {
  return new Date()
}

export function daysUntilDue(dueDay: number, now: Date): number {
  const day = Math.min(28, Math.max(1, Math.round(dueDay)))
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (thisMonth.getTime() >= today.getTime()) {
    return Math.round((thisMonth.getTime() - today.getTime()) / 86_400_000)
  }
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, day)
  return Math.round((nextMonth.getTime() - today.getTime()) / 86_400_000)
}

export function dueThisMonth(lastPaid: string | undefined, now: Date): boolean {
  return typeof lastPaid === 'string' && lastPaid.slice(0, 7) === toISO(now).slice(0, 7)
}

export interface UpcomingDue {
  id: string
  name: string
  amount: number
  days: number
}

export function upcomingDue(state: AppState, now: Date = new Date()): UpcomingDue | null {
  const candidates: UpcomingDue[] = []
  for (const bill of state.bills) {
    const days = daysUntilDue(bill.dueDay, now)
    if (days <= REMIND_WINDOW) candidates.push({ id: bill.id, name: bill.name, amount: bill.amount, days })
  }
  for (const debt of state.debts) {
    if (debt.paid >= debt.total) continue
    const days = daysUntilDue(debt.dueDay, now)
    const remaining = Math.max(0, debt.total - debt.paid)
    if (days <= REMIND_WINDOW) {
      candidates.push({ id: debt.id, name: debt.name, amount: Math.min(debt.installment, remaining), days })
    }
  }
  candidates.sort((a, b) => a.days - b.days)
  return candidates[0] ?? null
}

function readRemindMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(REMIND_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, string>
  } catch {
    // data rusak: mulai ulang dedupe
  }
  return {}
}

// notifikasi per tagihan maksimal 1x sehari; butuh izin notifikasi yang sudah diberikan
export function notifyDue(state: AppState, now: Date = new Date()): number {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return 0
  const upcoming = [...state.bills, ...state.debts.filter((debt) => debt.paid < debt.total)]
    .map((item) => ({ item, days: daysUntilDue(item.dueDay, now) }))
    .filter((entry) => entry.days <= REMIND_WINDOW)
    .sort((a, b) => a.days - b.days)

  if (upcoming.length === 0) return 0

  const today = toISO(now)
  const map = readRemindMap()
  let sent = 0
  for (const { item, days } of upcoming) {
    if (map[item.id] === today) continue
    const when = days === 0 ? 'hari ini' : days === 1 ? 'besok' : `dalam ${days} hari`
    const amount = 'amount' in item ? item.amount : Math.min(item.installment, Math.max(0, item.total - item.paid))
    new Notification('Pengingat Kalkulator Uang Jajan', {
      body: `${item.name} jatuh tempo ${when}, ${formatIDR(amount)}.`,
    })
    map[item.id] = today
    sent += 1
  }
  if (sent > 0) {
    try {
      localStorage.setItem(REMIND_KEY, JSON.stringify(map))
    } catch {
      // storage penuh: dedupe gagal, besok bisa notifikasi ulang
    }
  }
  return sent
}

export function dueLabel(days: number): string {
  if (days === 0) return 'jatuh tempo hari ini'
  if (days === 1) return 'jatuh tempo besok'
  return `H-${days}`
}

export function dueDateLabel(dueDay: number, now: Date = new Date()): string {
  const days = daysUntilDue(dueDay, now)
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
