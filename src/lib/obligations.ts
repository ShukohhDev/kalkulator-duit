import type { AppState, Bill, Debt } from '../types'
import { formatIDR, toISO, todayISO } from './money'
import { uid } from './id'
import { CICILAN_CATEGORY, TAGIHAN_CATEGORY } from './state'

const REMIND_KEY = 'kalkulator-duitmu:remind'
const REMIND_WINDOW = 7

export function nowDate(): Date {
  return new Date()
}

export function daysUntilDue(dueDay: number, now: Date): number {
  const day = Math.min(31, Math.max(1, Math.round(dueDay)))
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const maxThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const targetThisMonth = Math.min(day, maxThisMonth)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), targetThisMonth)

  if (thisMonth.getTime() >= today.getTime()) {
    return Math.round((thisMonth.getTime() - today.getTime()) / 86_400_000)
  }

  const maxNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()
  const targetNextMonth = Math.min(day, maxNextMonth)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, targetNextMonth)

  return Math.round((nextMonth.getTime() - today.getTime()) / 86_400_000)
}

export function billPaidThisMonth(bill: Bill, now: Date = nowDate()): number {
  if (!bill.lastPaid) return 0
  const isCurrentMonth = bill.lastPaid.slice(0, 7) === toISO(now).slice(0, 7)
  if (!isCurrentMonth) return 0
  if (typeof bill.paidThisMonth === 'number') {
    return Math.min(bill.amount, Math.max(0, bill.paidThisMonth))
  }
  return bill.amount
}

export function billRemainingThisMonth(bill: Bill, now: Date = nowDate()): number {
  const paid = billPaidThisMonth(bill, now)
  return Math.max(0, bill.amount - paid)
}

export function isBillFullyPaidThisMonth(bill: Bill, now: Date = nowDate()): boolean {
  if (!bill.lastPaid) return false
  const isCurrentMonth = bill.lastPaid.slice(0, 7) === toISO(now).slice(0, 7)
  if (!isCurrentMonth) return false
  return billRemainingThisMonth(bill, now) <= 0
}

export function dueThisMonth(lastPaid: string | undefined, now: Date): boolean {
  return typeof lastPaid === 'string' && lastPaid.slice(0, 7) === toISO(now).slice(0, 7)
}

export function markBillPaid(
  s: AppState,
  bill: Bill,
  customAmount?: number,
  now: Date = nowDate(),
  walletId?: string,
): AppState {
  const date = todayISO()
  const currentPaid = billPaidThisMonth(bill, now)
  const remaining = Math.max(0, bill.amount - currentPaid)
  const payAmount =
    typeof customAmount === 'number' && customAmount > 0
      ? Math.min(customAmount, remaining)
      : remaining

  if (payAmount <= 0) return s

  const newTotalPaid = currentPaid + payAmount
  const isFull = newTotalPaid >= bill.amount
  const note = isFull && currentPaid === 0 ? bill.name : isFull ? `${bill.name} (Pelunasan)` : `${bill.name} (Cicil)`

  let nextWallets = s.wallets
  let nextEndSavings = s.endSavings
  if (walletId === 'pot') {
    nextEndSavings = Math.max(0, nextEndSavings - payAmount)
  } else if (walletId) {
    const targetId = walletId.startsWith('wallet:') ? walletId.slice(7) : walletId
    nextWallets = s.wallets.map((w) =>
      w.id === targetId ? { ...w, balance: Math.max(0, w.balance - payAmount) } : w,
    )
  }

  return {
    ...s,
    endSavings: nextEndSavings,
    wallets: nextWallets,
    bills: s.bills.map((item) =>
      item.id === bill.id
        ? {
            ...item,
            lastPaid: date,
            paidThisMonth: newTotalPaid,
          }
        : item
    ),
    expenses: [
      { id: uid('exp'), date, categoryId: TAGIHAN_CATEGORY, note, amount: payAmount },
      ...s.expenses,
    ],
  }
}

export function markDebtPaid(
  s: AppState,
  debt: Debt,
  customAmount?: number,
  walletId?: string,
): AppState {
  const remaining = Math.max(0, debt.total - debt.paid)
  const payAmount =
    typeof customAmount === 'number' && customAmount > 0
      ? Math.min(customAmount, remaining)
      : Math.min(debt.installment, remaining)
  if (payAmount <= 0) return s

  let nextWallets = s.wallets
  let nextEndSavings = s.endSavings
  if (walletId === 'pot') {
    nextEndSavings = Math.max(0, nextEndSavings - payAmount)
  } else if (walletId) {
    const targetId = walletId.startsWith('wallet:') ? walletId.slice(7) : walletId
    nextWallets = s.wallets.map((w) =>
      w.id === targetId ? { ...w, balance: Math.max(0, w.balance - payAmount) } : w,
    )
  }

  const isFull = debt.paid + payAmount >= debt.total
  const note = isFull ? `${debt.name} (Lunas)` : `${debt.name} (Angsuran)`

  return {
    ...s,
    endSavings: nextEndSavings,
    wallets: nextWallets,
    debts: s.debts.map((item) => (item.id === debt.id ? { ...item, paid: item.paid + payAmount } : item)),
    expenses: [
      { id: uid('exp'), date: todayISO(), categoryId: CICILAN_CATEGORY, note, amount: payAmount },
      ...s.expenses,
    ],
  }
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
    if (isBillFullyPaidThisMonth(bill, now)) continue
    const days = daysUntilDue(bill.dueDay, now)
    const remaining = billRemainingThisMonth(bill, now)
    if (days <= REMIND_WINDOW) candidates.push({ id: bill.id, name: bill.name, amount: remaining, days })
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
  const upcoming = [
    ...state.bills
      .filter((b) => !isBillFullyPaidThisMonth(b, now))
      .map((item) => ({ item, days: daysUntilDue(item.dueDay, now) })),
    ...state.debts
      .filter((debt) => debt.paid < debt.total)
      .map((item) => ({ item, days: daysUntilDue(item.dueDay, now) })),
  ]
    .filter((entry) => entry.days <= REMIND_WINDOW)
    .sort((a, b) => a.days - b.days)

  if (upcoming.length === 0) return 0

  const today = toISO(now)
  const map = readRemindMap()
  let sent = 0
  for (const { item, days } of upcoming) {
    if (map[item.id] === today) continue
    const when = days === 0 ? 'hari ini' : days === 1 ? 'besok' : `dalam ${days} hari`
    const amount =
      'amount' in item
        ? billRemainingThisMonth(item, now)
        : Math.min(item.installment, Math.max(0, item.total - item.paid))
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
