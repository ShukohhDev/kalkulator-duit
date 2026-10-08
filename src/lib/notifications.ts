import type { AppState } from '../types'
import type { Derived } from './derive'
import { billRemainingThisMonth, daysUntilDue, isBillFullyPaidThisMonth } from './obligations'
import { fetchUserReports } from './reports'

export type NotificationKind = 'finance' | 'report_status' | 'admin_reply'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  title: string
  message: string
  timestamp: string // ISO string
  read: boolean
  tag: string
  metadata?: {
    reportId?: string
    status?: string
    type?: string
  }
}

const READ_KEY_PREFIX = 'kalkulator-duitmu:read_notifs:'

export function getReadNotificationIds(username: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${READ_KEY_PREFIX}${username.toLowerCase()}`)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function markNotificationAsRead(username: string, notifId: string): void {
  try {
    const set = getReadNotificationIds(username)
    set.add(notifId)
    localStorage.setItem(
      `${READ_KEY_PREFIX}${username.toLowerCase()}`,
      JSON.stringify(Array.from(set)),
    )
  } catch {
    // ignore
  }
}

export function markAllNotificationsAsRead(username: string, notifIds: string[]): void {
  try {
    const set = getReadNotificationIds(username)
    for (const id of notifIds) {
      set.add(id)
    }
    localStorage.setItem(
      `${READ_KEY_PREFIX}${username.toLowerCase()}`,
      JSON.stringify(Array.from(set)),
    )
  } catch {
    // ignore
  }
}

export async function buildUserNotifications(
  username: string,
  state: AppState,
  derived: Derived,
): Promise<NotificationItem[]> {
  const items: NotificationItem[] = []
  const readIds = getReadNotificationIds(username)
  const now = new Date()

  // 1. Notifikasi Finansial: Peringatan Pengeluaran & Anggaran Kategori
  for (const cat of state.categories) {
    if (cat.off) continue
    const spent = derived.spentByCategory[cat.id] ?? 0
    const alloc = derived.allocationByCategory[cat.id] ?? 0

    if (alloc > 0 && spent >= alloc) {
      const over = spent - alloc
      items.push({
        id: `fin-cat-over-${cat.id}`,
        kind: 'finance',
        title: `Kategori ${cat.name} Melebihi Batas`,
        message: `Pengeluaran sudah melampaui batas alokasi sebesar Rp ${over.toLocaleString('id-ID')}. Pertimbangkan berhemat untuk pos ini.`,
        timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        read: readIds.has(`fin-cat-over-${cat.id}`),
        tag: 'Peringatan Anggaran',
      })
    } else if (alloc > 0 && spent >= alloc * 0.85) {
      items.push({
        id: `fin-cat-warn-${cat.id}`,
        kind: 'finance',
        title: `Kategori ${cat.name} Hampir Mencapai Batas`,
        message: `Pengeluaran sudah mencapai ${Math.round((spent / alloc) * 100)}% dari batas yang direncanakan.`,
        timestamp: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
        read: readIds.has(`fin-cat-warn-${cat.id}`),
        tag: 'Peringatan Anggaran',
      })
    }
  }

  // 2. Notifikasi Finansial: Tagihan & Cicilan Utang
  for (const bill of state.bills) {
    const isPaid = isBillFullyPaidThisMonth(bill, now)
    if (isPaid) continue
    const days = daysUntilDue(bill.dueDay, now)
    const remaining = billRemainingThisMonth(bill, now)
    if (days === 0) {
      items.push({
        id: `fin-bill-today-${bill.id}`,
        kind: 'finance',
        title: `Tagihan Jatuh Tempo Hari Ini: ${bill.name}`,
        message: `Tagihan sebesar Rp ${remaining.toLocaleString('id-ID')} jatuh tempo hari ini.`,
        timestamp: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
        read: readIds.has(`fin-bill-today-${bill.id}`),
        tag: 'Jatuh Tempo',
      })
    } else if (days <= 3) {
      items.push({
        id: `fin-bill-soon-${bill.id}`,
        kind: 'finance',
        title: `Tagihan Mendekati Tenggat: ${bill.name}`,
        message: `Tagihan sebesar Rp ${remaining.toLocaleString('id-ID')} jatuh tempo dalam ${days} hari lagi.`,
        timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        read: readIds.has(`fin-bill-soon-${bill.id}`),
        tag: 'Jatuh Tempo',
      })
    }
  }

  for (const debt of state.debts) {
    const remaining = Math.max(0, debt.total - debt.paid)
    if (remaining <= 0) continue
    const days = daysUntilDue(debt.dueDay, now)
    if (days === 0) {
      items.push({
        id: `fin-debt-today-${debt.id}`,
        kind: 'finance',
        title: `Cicilan Utang Jatuh Tempo Hari Ini: ${debt.name}`,
        message: `Cicilan sebesar Rp ${debt.installment.toLocaleString('id-ID')} jatuh tempo hari ini. Sisa utang: Rp ${remaining.toLocaleString('id-ID')}.`,
        timestamp: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
        read: readIds.has(`fin-debt-today-${debt.id}`),
        tag: 'Jatuh Tempo',
      })
    } else if (days <= 3) {
      items.push({
        id: `fin-debt-soon-${debt.id}`,
        kind: 'finance',
        title: `Cicilan Utang Segera Jatuh Tempo: ${debt.name}`,
        message: `Cicilan sebesar Rp ${debt.installment.toLocaleString('id-ID')} jatuh tempo dalam ${days} hari lagi.`,
        timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        read: readIds.has(`fin-debt-soon-${debt.id}`),
        tag: 'Jatuh Tempo',
      })
    }
  }

  // 3. Notifikasi Laporan Pengguna & Balasan Admin
  try {
    const allReports = await fetchUserReports()
    // Pengguna melihat laporannya sendiri; Admin dapat melihat semua laporan
    const userReports = allReports.filter(
      (r) => r.username.toLowerCase() === username.toLowerCase(),
    )

    for (const rep of userReports) {
      // A. Jika ada balasan dari Admin:
      if (rep.admin_reply) {
        const replyNotifId = `rep-reply-${rep.id}-${rep.replied_at || 'v1'}`
        items.push({
          id: replyNotifId,
          kind: 'admin_reply',
          title: `Balasan Admin atas ${rep.type}: "${rep.message.slice(0, 30)}${rep.message.length > 30 ? '...' : ''}"`,
          message: rep.admin_reply,
          timestamp: rep.replied_at || rep.created_at,
          read: readIds.has(replyNotifId),
          tag: 'Balasan Admin',
          metadata: {
            reportId: rep.id,
            status: rep.status,
            type: rep.type,
          },
        })
      }

      // B. Notifikasi Pembaruan Status Laporan (Diproses / Selesai)
      if (rep.status !== 'baru') {
        const statusNotifId = `rep-status-${rep.id}-${rep.status}`
        const statusLabel = rep.status === 'selesai' ? 'Sudah Selesai Diproses' : 'Sedang Diproses'
        items.push({
          id: statusNotifId,
          kind: 'report_status',
          title: `Status ${rep.type} Diperbarui: ${statusLabel}`,
          message: `Laporan Anda: "${rep.message.slice(0, 40)}${rep.message.length > 40 ? '...' : ''}" saat ini ${statusLabel.toLowerCase()} oleh pemilik website.`,
          timestamp: rep.created_at,
          read: readIds.has(statusNotifId),
          tag: 'Status Laporan',
          metadata: {
            reportId: rep.id,
            status: rep.status,
            type: rep.type,
          },
        })
      }
    }
  } catch (err) {
    console.warn('Gagal memuat notifikasi laporan pengguna:', err)
  }

  // Urutkan berdasarkan waktu terbaru
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
