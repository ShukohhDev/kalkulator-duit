import { describe, expect, it, vi } from 'vitest'
import { initialState } from '../state'
import { exportXlsx } from '../xlsx'

const mocks = vi.hoisted(() => ({
  toFile: vi.fn(async () => undefined),
  writeExcelFile: vi.fn((_sheets: unknown) => ({ toFile: mocks.toFile })),
}))

vi.mock('write-excel-file/browser', () => ({ default: mocks.writeExcelFile }))

function base() {
  const state = initialState()
  state.expenses = [
    { id: 'e1', date: '2026-10-06', categoryId: state.categories[0]!.id, note: 'nasi', amount: 15_000 },
    { id: 'e2', date: '2026-10-03', categoryId: state.categories[1]!.id, note: 'bensin', amount: 25_000 },
  ]
  state.incomes = [{ id: 'i1', date: '2026-10-05', source: 'Lain', amount: 50_000 }]
  return state
}

describe('exportXlsx', () => {
  it('membuat 3 sheet berurutan transaksi tanggal naik, ringkasan kategori, ringkasan bulan', async () => {
    await exportXlsx(base())

    expect(mocks.writeExcelFile).toHaveBeenCalledTimes(1)
    const sheets = mocks.writeExcelFile.mock.calls[0]![0] as {
      sheet: string
      data: unknown[][]
    }[]
    expect(sheets.map((s) => s.sheet)).toEqual(['Transaksi', 'Ringkasan Kategori', 'Ringkasan Bulan'])

    const tx = sheets[0]!.data
    expect(tx).toHaveLength(4) // header + 2 pengeluaran + 1 pemasukan
    expect((tx[1]![0] as { value: Date }).value.toISOString().slice(0, 10)).toBe('2026-10-03')
    expect(tx[1]![1]).toBe('Pengeluaran')
    expect(tx[2]![1]).toBe('Pemasukan')
    expect((tx[2]![4] as { value: number }).value).toBe(50_000)
    expect((tx[3]![4] as { value: number }).value).toBe(15_000)

    const category = sheets[1]!.data
    expect((category[0]![0] as { value: string }).value).toBe('Kategori')
    expect(category[1]![0]).toBe(initialState().categories[1]!.name)
    expect((category[1]![2] as { value: number }).value).toBe(25_000)

    const months = sheets[2]!.data
    expect(months).toHaveLength(2) // header + Oktober 2026
    expect(months[1]![0]).toBe('Oktober 2026')
    expect((months[1]![1] as { value: number }).value).toBe(50_000)
    expect((months[1]![2] as { value: number }).value).toBe(40_000)

    expect(mocks.toFile).toHaveBeenCalledWith(expect.stringMatching(/^kalkulator-duitmu-\d{4}-\d{2}-\d{2}\.xlsx$/))
  })
})
