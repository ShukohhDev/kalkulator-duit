import type { AppState } from '../types'
import type { Derived } from './derive'
import { formatIDR, toISO } from './money'
import { categoryKind } from './state'

export interface Alert {
  id: string
  tone: 'warn' | 'danger'
  text: string
}

const MAX_ALERTS = 4
const ALERT_REMIND_KEY = 'kalkulator-duitmu:remind-alerts'

// belanja per kategori di periode berjalan (bukan sepanjang masa)
function spentInPeriodByCategory(state: AppState, derived: Derived): Map<string, number> {
  const out = new Map<string, number>()
  const period = derived.period
  if (!period) return out
  for (const expense of state.expenses) {
    if (expense.date < period.startISO || expense.date > period.endISO) continue
    out.set(expense.categoryId, (out.get(expense.categoryId) ?? 0) + expense.amount)
  }
  return out
}

export function buildAlerts(state: AppState, derived: Derived): Alert[] {
  const out: Alert[] = []
  if (!state.mode || state.allowance <= 0 || !derived.period) return out

  const spentByCategory = spentInPeriodByCategory(state, derived)
  const rows = state.categories
    .map((category) => {
      const alloc = derived.allocationByCategory[category.id] ?? 0
      const spent = spentByCategory.get(category.id) ?? 0
      return { category, alloc, spent, over: spent - alloc, pct: alloc > 0 ? Math.round((spent / alloc) * 100) : 0 }
    })
    .filter((item) => item.alloc > 0)

  for (const item of rows.filter((row) => row.spent > row.alloc).sort((a, b) => b.over - a.over).slice(0, 2)) {
    out.push({
      id: `over-${item.category.id}`,
      tone: 'danger',
      text: `${item.category.name} sudah ${item.pct}% dari alokasi periode ini, kelebihan ${formatIDR(item.over)}.`,
    })
  }

  for (const item of rows
    .filter((row) => row.spent <= row.alloc && row.spent >= row.alloc * 0.8)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2)) {
    out.push({
      id: `near-${item.category.id}`,
      tone: 'warn',
      text: `${item.category.name} sudah terpakai ${item.pct}% dari alokasi, hampir mencapai batas. Sisa ${formatIDR(item.alloc - item.spent)}.`,
    })
  }

  if (derived.elapsedDays >= 1) {
    const daysLeft = Math.max(1, derived.period.totalDays - derived.elapsedDays)
    const harianShare = state.categories
      .filter((category) => categoryKind(category) === 'harian')
      .reduce((sum, category) => sum + category.ratio, 0)
    const need = (harianShare * state.allowance * daysLeft) / derived.period.totalDays
    if (derived.remainingInPeriod < need) {
      out.push({
        id: 'low-remaining',
        tone: 'danger',
        text: `Sisa ${formatIDR(derived.remainingInPeriod)} untuk ${daysLeft} hari ke depan. Kebutuhan harian butuh sekitar ${formatIDR(need)}.`,
      })
    }
  }

  return out.slice(0, MAX_ALERTS)
}

// notifikasi per peringatan maksimal 1x sehari; hanya kalau izin notifikasi sudah diberikan
export function notifyAlerts(state: AppState, derived: Derived, now: Date = new Date()): number {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return 0
  const alerts = buildAlerts(state, derived)
  if (alerts.length === 0) return 0

  const today = toISO(now)
  let map: Record<string, string> = {}
  try {
    map = JSON.parse(localStorage.getItem(ALERT_REMIND_KEY) ?? '{}')
  } catch {
    // data korup: mulai dari kosong
  }

  let sent = 0
  for (const alert of alerts) {
    if (map[alert.id] === today) continue
    new Notification('Peringatan Kalkulator Uang Jajan', { body: alert.text })
    map[alert.id] = today
    sent += 1
  }
  if (sent > 0) {
    try {
      localStorage.setItem(ALERT_REMIND_KEY, JSON.stringify(map))
    } catch {
      // storage penuh: dedupe gagal, besok bisa notifikasi ulang
    }
  }
  return sent
}
