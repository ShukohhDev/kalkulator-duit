// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialState } from '../state'
import { daysUntilDue, dueLabel, notifyDue, nowDate, upcomingDue } from '../obligations'

const NOW = new Date(2026, 9, 5, 9, 0, 0) // Senin, 5 Oktober 2026

describe('daysUntilDue', () => {
  it('hitung hari ke tanggal jatuh tempo bulan ini', () => {
    expect(daysUntilDue(5, NOW)).toBe(0)
    expect(daysUntilDue(6, NOW)).toBe(1)
    expect(daysUntilDue(12, NOW)).toBe(7)
  })

  it('tanggal yang sudah lewat bulan ini loncat ke bulan depan', () => {
    expect(daysUntilDue(3, NOW)).toBe(29) // 3 November
    expect(daysUntilDue(1, NOW)).toBe(27)
  })

  it('clamp tanggal di luar 1-28', () => {
    expect(daysUntilDue(99, NOW)).toBe(daysUntilDue(28, NOW))
    expect(daysUntilDue(0, NOW)).toBe(daysUntilDue(1, NOW))
  })
})

describe('dueLabel', () => {
  it('label hari-H dan hitung mundur', () => {
    expect(dueLabel(0)).toBe('jatuh tempo hari ini')
    expect(dueLabel(1)).toBe('jatuh tempo besok')
    expect(dueLabel(3)).toBe('H-3')
  })
})

describe('upcomingDue', () => {
  it('ambil yang paling dekat, termasuk cicilan belum lunas', () => {
    const state = initialState()
    state.bills = [
      { id: 'b1', name: 'Internet', amount: 200_000, dueDay: 12 },
      { id: 'b2', name: 'Listrik', amount: 150_000, dueDay: 7 },
    ]
    state.debts = [
      { id: 'd1', name: 'Motor', total: 6_000_000, paid: 0, installment: 500_000, dueDay: 6 },
      { id: 'd2', name: 'Lama', total: 1_000_000, paid: 1_000_000, installment: 100_000, dueDay: 5 },
    ]

    const due = upcomingDue(state, NOW)
    expect(due?.name).toBe('Motor')
    expect(due?.days).toBe(1)
    expect(due?.amount).toBe(500_000)
  })

  it('null kalau semua lebih dari 7 hari', () => {
    const state = initialState()
    state.bills = [{ id: 'b1', name: 'Listrik', amount: 150_000, dueDay: 20 }]
    expect(upcomingDue(state, NOW)).toBeNull()
  })
})

describe('notifyDue', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubNotification(permission: NotificationPermission) {
    const calls: { title: string; body?: string }[] = []
    class FakeNotification {
      static permission = permission
      static requestPermission = vi.fn(async () => 'granted')
      constructor(title: string, options?: NotificationOptions) {
        calls.push({ title, body: options?.body })
      }
    }
    vi.stubGlobal('Notification', FakeNotification)
    return calls
  }

  it('kirim notifikasi sekali per tagihan per hari', () => {
    const calls = stubNotification('granted')
    const state = initialState()
    state.bills = [{ id: 'b1', name: 'Listrik', amount: 150_000, dueDay: 7 }]

    expect(notifyDue(state, NOW)).toBe(1)
    expect(notifyDue(state, NOW)).toBe(0)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.body).toContain('Listrik')
    expect(calls[0]?.body).toContain('dalam 2 hari')
  })

  it('tanpa izin notifikasi tidak apa-apa', () => {
    const calls = stubNotification('default')
    const state = initialState()
    state.bills = [{ id: 'b1', name: 'Listrik', amount: 150_000, dueDay: 7 }]
    expect(notifyDue(state, NOW)).toBe(0)
    expect(calls).toHaveLength(0)
    expect(nowDate()).toBeInstanceOf(Date)
  })
})
