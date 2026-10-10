// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialState } from '../state'
import {
  billPaidThisMonth,
  billRemainingThisMonth,
  daysUntilDue,
  dueLabel,
  isBillFullyPaidThisMonth,
  markBillPaid,
  markDebtPaid,
  notifyDue,
  nowDate,
  upcomingDue,
} from '../obligations'

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

  it('clamp tanggal di luar 1-31', () => {
    expect(daysUntilDue(99, NOW)).toBe(daysUntilDue(31, NOW))
    expect(daysUntilDue(0, NOW)).toBe(daysUntilDue(1, NOW))
  })

  it('penyesuaian hari terakhir pada bulan pendek (misal Februari)', () => {
    const feb = new Date(2026, 1, 15) // 15 Februari 2026 (Februari ada 28 hari)
    // Jatuh tempo tanggal 31 disesuaikan ke tanggal 28 Februari (13 hari lagi)
    expect(daysUntilDue(31, feb)).toBe(13)
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

describe('markBillPaid dan pembayaran cicil tagihan', () => {
  it('bayar lunas sekaligus mencatat pengeluaran penuh', () => {
    const state = initialState()
    const bill = { id: 'b1', name: 'Listrik', amount: 150_000, dueDay: 20 }
    state.bills = [bill]

    const next = markBillPaid(state, bill, undefined, NOW)
    expect(next.bills[0]?.paidThisMonth).toBe(150_000)
    expect(next.expenses).toHaveLength(1)
    expect(next.expenses[0]?.amount).toBe(150_000)
    expect(next.expenses[0]?.note).toBe('Listrik')
    expect(isBillFullyPaidThisMonth(next.bills[0]!, NOW)).toBe(true)
    expect(billRemainingThisMonth(next.bills[0]!, NOW)).toBe(0)
  })

  it('bayar sebagian (nyicil) mencatat nominal cicilan dan menyisakan sisa tagihan', () => {
    const state = initialState()
    const bill = { id: 'b1', name: 'Internet', amount: 300_000, dueDay: 15 }
    state.bills = [bill]

    // Bayar cicil pertama: Rp 100.000
    const step1 = markBillPaid(state, bill, 100_000, NOW)
    expect(step1.bills[0]?.paidThisMonth).toBe(100_000)
    expect(step1.expenses).toHaveLength(1)
    expect(step1.expenses[0]?.amount).toBe(100_000)
    expect(step1.expenses[0]?.note).toBe('Internet (Cicil)')
    expect(isBillFullyPaidThisMonth(step1.bills[0]!, NOW)).toBe(false)
    expect(billPaidThisMonth(step1.bills[0]!, NOW)).toBe(100_000)
    expect(billRemainingThisMonth(step1.bills[0]!, NOW)).toBe(200_000)

    // Bayar cicil kedua / pelunasan: Rp 200.000
    const step2 = markBillPaid(step1, step1.bills[0]!, 200_000, NOW)
    expect(step2.bills[0]?.paidThisMonth).toBe(300_000)
    expect(step2.expenses).toHaveLength(2)
    expect(step2.expenses[0]?.amount).toBe(200_000)
    expect(step2.expenses[0]?.note).toBe('Internet (Pelunasan)')
    expect(isBillFullyPaidThisMonth(step2.bills[0]!, NOW)).toBe(true)
    expect(billRemainingThisMonth(step2.bills[0]!, NOW)).toBe(0)
  })

  it('nominal pembayaran di atas sisa tagihan otomatis di-clamp ke sisa', () => {
    const state = initialState()
    const bill = { id: 'b1', name: 'Air', amount: 100_000, dueDay: 10 }
    state.bills = [bill]

    const next = markBillPaid(state, bill, 250_000, NOW)
    expect(next.bills[0]?.paidThisMonth).toBe(100_000)
    expect(next.expenses[0]?.amount).toBe(100_000)
    expect(isBillFullyPaidThisMonth(next.bills[0]!, NOW)).toBe(true)
  })

  it('bayar tagihan memotong saldo dompet yang dipilih', () => {
    const state = initialState()
    state.wallets = [
      { id: 'w1', name: 'BCA', balance: 500_000 },
      { id: 'w2', name: 'GoPay', balance: 100_000 },
    ]
    const bill = { id: 'b1', name: 'Wifi', amount: 300_000, dueDay: 10 }
    state.bills = [bill]

    const next = markBillPaid(state, bill, 200_000, NOW, 'wallet:w1')
    expect(next.wallets.find((w) => w.id === 'w1')?.balance).toBe(300_000)
    expect(next.wallets.find((w) => w.id === 'w2')?.balance).toBe(100_000)
    expect(next.bills[0]?.paidThisMonth).toBe(200_000)
  })

  it('bayar tagihan memotong Saku Tabungan (pot)', () => {
    const state = initialState()
    state.endSavings = 250_000
    const bill = { id: 'b1', name: 'Listrik', amount: 100_000, dueDay: 10 }
    state.bills = [bill]

    const next = markBillPaid(state, bill, 100_000, NOW, 'pot')
    expect(next.endSavings).toBe(150_000)
  })
})

describe('markDebtPaid dan pembayaran angsuran dengan dompet', () => {
  it('bayar angsuran utang memotong saldo dompet', () => {
    const state = initialState()
    state.wallets = [{ id: 'w1', name: 'Mandiri', balance: 1_000_000 }]
    const debt = { id: 'd1', name: 'Cicilan Laptop', total: 5_000_000, paid: 0, installment: 500_000, dueDay: 15 }
    state.debts = [debt]

    const next = markDebtPaid(state, debt, 500_000, 'wallet:w1')
    expect(next.wallets[0]?.balance).toBe(500_000)
    expect(next.debts[0]?.paid).toBe(500_000)
    expect(next.expenses[0]?.note).toBe('Cicilan Laptop (Angsuran)')
  })

  it('bayar angsuran utang memotong Saku Tabungan (pot)', () => {
    const state = initialState()
    state.endSavings = 600_000
    const debt = { id: 'd1', name: 'Pinjaman', total: 500_000, paid: 0, installment: 500_000, dueDay: 15 }
    state.debts = [debt]

    const next = markDebtPaid(state, debt, 500_000, 'pot')
    expect(next.endSavings).toBe(100_000)
    expect(next.debts[0]?.paid).toBe(500_000)
    expect(next.expenses[0]?.note).toBe('Pinjaman (Lunas)')
  })
})
