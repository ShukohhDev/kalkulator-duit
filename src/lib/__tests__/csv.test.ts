import { describe, expect, it } from 'vitest'
import type { AppState } from '../../types'
import { buildCsv } from '../csv'
import { initialState } from '../state'

function fixture(): AppState {
  const state = initialState()
  return {
    ...state,
    expenses: [
      { id: 'e2', date: '2026-10-02', categoryId: 'makan', note: 'nasi "pedas"; enak', amount: 15_000 },
      { id: 'e1', date: '2026-10-01', categoryId: 'transport', note: 'bus', amount: 10_000 },
    ],
    incomes: [{ id: 'i1', date: '2026-10-01', source: 'Jual sepeda', amount: 200_000 }],
  }
}

describe('buildCsv', () => {
  it('menulis BOM UTF-8, header, dan baris per transaksi terurut tanggal', () => {
    const csv = buildCsv(fixture())
    expect(csv.startsWith('\uFEFF')).toBe(true)

    const lines = csv.slice(1).split('\r\n')
    expect(lines[0]).toBe('jenis;tanggal;kategori;catatan;nominal')
    expect(lines[1]).toBe('pengeluaran;2026-10-01;Transport / Bensin;bus;10000')
    expect(lines[2]).toBe('pengeluaran;2026-10-02;Makan & Minum;"nasi ""pedas""; enak";15000')
    expect(lines[3]).toBe('pemasukan;2026-10-01;Jual sepeda;;200000')
    expect(lines).toHaveLength(4)
  })
})
