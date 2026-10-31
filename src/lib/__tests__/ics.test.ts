import { describe, expect, it } from 'vitest'
import { buildICS } from '../ics'
import { initialState } from '../state'

const now = new Date(2026, 9, 14) // 14 Oktober 2026

describe('ekspor kalender .ics', () => {
  it('state kosong tetap menghasilkan kalender valid', () => {
    const ics = buildICS(initialState(), now)
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).not.toContain('BEGIN:VEVENT')
    expect(ics.endsWith('\r\n')).toBe(true)
  })

  it('tagihan jadi event bulanan dengan tanggal jatuh tempo berikutnya', () => {
    const state = initialState()
    state.bills = [{ id: 'b1', name: 'Listrik', amount: 100_000, dueDay: 20 }]
    const ics = buildICS(state, now)
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261020')
    expect(ics).toContain('RRULE:FREQ=MONTHLY')
    expect(ics).toContain('SUMMARY:Listrik · tagihan ')
    expect(ics).toContain('UID:b1-tagihan@kalkulator-duitmu')
    // tanggal sudah lewat bulan ini → geser ke bulan depan
    const past = buildICS(state, new Date(2026, 9, 25))
    expect(past).toContain('DTSTART;VALUE=DATE:20261120')
  })

  it('utang berjalan → COUNT = sisa/angsuran, utang lunas dilewati', () => {
    const state = initialState()
    state.debts = [
      { id: 'd1', name: 'Pinjaman', total: 1_000_000, paid: 400_000, installment: 150_000, dueDay: 5 },
      { id: 'd2', name: 'Lunas', total: 500_000, paid: 500_000, installment: 100_000, dueDay: 5 },
    ]
    const ics = buildICS(state, now)
    expect(ics).toContain('RRULE:FREQ=MONTHLY;COUNT:4')
    expect(ics).toContain('UID:d1-utang@kalkulator-duitmu')
    expect(ics).not.toContain('UID:d2-utang@kalkulator-duitmu')
  })

  it('koma dan titik koma di nama diri-escape', () => {
    const state = initialState()
    state.bills = [{ id: 'b1', name: 'Listrik, air; dsb', amount: 50_000, dueDay: 10 }]
    const ics = buildICS(state, now)
    expect(ics).toContain('SUMMARY:Listrik\\, air\\; dsb · tagihan ')
    expect(ics).not.toContain('Listrik, air; dsb')
  })
})
