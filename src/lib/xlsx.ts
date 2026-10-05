import type { AppState } from '../types'
import { monthKey, monthLabel } from './money'

const HEAD = {
  backgroundColor: '#1971c2',
  color: '#ffffff',
  fontWeight: 'bold',
  align: 'left',
} as const

const rp = (value: number) => ({ value, type: Number, format: '#,##0' })

interface TxRow {
  date: string
  kind: string
  category: string
  note: string
  amount: number
}

export async function exportXlsx(state: AppState): Promise<void> {
  const categoryMap = new Map(state.categories.map((category) => [category.id, category]))

  const transactions: TxRow[] = [
    ...state.expenses.map((expense) => ({
      date: expense.date,
      kind: 'Pengeluaran',
      category: categoryMap.get(expense.categoryId)?.name ?? '-',
      note: expense.note,
      amount: expense.amount,
    })),
    ...state.incomes.map((income) => ({
      date: income.date,
      kind: 'Pemasukan',
      category: income.source,
      note: income.generated ? 'Otomatis' : '',
      amount: income.amount,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const transactionRows = [
    [
      { value: 'Tanggal', ...HEAD },
      { value: 'Jenis', ...HEAD },
      { value: 'Kategori', ...HEAD },
      { value: 'Catatan', ...HEAD },
      { value: 'Nominal (Rp)', ...HEAD, align: 'right' as const },
    ],
    ...transactions.map((row) => [
      { value: new Date(row.date), type: Date, format: 'DD/MM/YYYY' },
      row.kind,
      row.category,
      row.note,
      rp(row.amount),
    ]),
  ]

  const byCategory = new Map<string, { count: number; total: number }>()
  for (const expense of state.expenses) {
    const name = categoryMap.get(expense.categoryId)?.name ?? 'Tanpa kategori'
    const entry = byCategory.get(name) ?? { count: 0, total: 0 }
    entry.count += 1
    entry.total += expense.amount
    byCategory.set(name, entry)
  }
  const categoryTotal = [...byCategory.values()].reduce((sum, entry) => sum + entry.total, 0)

  const categoryRows = [
    [
      { value: 'Kategori', ...HEAD },
      { value: 'Jumlah transaksi', ...HEAD, align: 'right' as const },
      { value: 'Total (Rp)', ...HEAD, align: 'right' as const },
      { value: 'Porsi', ...HEAD, align: 'right' as const },
    ],
    ...[...byCategory.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, entry]) => [
        name,
        { value: entry.count, type: Number },
        rp(entry.total),
        {
          value: categoryTotal > 0 ? entry.total / categoryTotal : 0,
          type: Number,
          format: '0%',
        },
      ]),
  ]

  const byMonth = new Map<string, { income: number; expense: number }>()
  for (const income of state.incomes) {
    const key = monthKey(income.date)
    const entry = byMonth.get(key) ?? { income: 0, expense: 0 }
    entry.income += income.amount
    byMonth.set(key, entry)
  }
  for (const expense of state.expenses) {
    const key = monthKey(expense.date)
    const entry = byMonth.get(key) ?? { income: 0, expense: 0 }
    entry.expense += expense.amount
    byMonth.set(key, entry)
  }

  const monthRows = [
    [
      { value: 'Bulan', ...HEAD },
      { value: 'Pemasukan (Rp)', ...HEAD, align: 'right' as const },
      { value: 'Pengeluaran (Rp)', ...HEAD, align: 'right' as const },
      { value: 'Selisih (Rp)', ...HEAD, align: 'right' as const },
    ],
    ...[...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, entry]) => {
        const diff = entry.income - entry.expense
        return [
          monthLabel(key),
          rp(entry.income),
          rp(entry.expense),
          { ...rp(diff), color: diff >= 0 ? '#2f9e44' : '#e03131' },
        ]
      }),
  ]

  const date = new Date().toISOString().slice(0, 10)
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  await writeExcelFile([
    { data: transactionRows, sheet: 'Transaksi', columns: [{ width: 13 }, { width: 14 }, { width: 24 }, { width: 36 }, { width: 16 }], stickyRowsCount: 1 },
    { data: categoryRows, sheet: 'Ringkasan Kategori', columns: [{ width: 26 }, { width: 18 }, { width: 18 }, { width: 10 }], stickyRowsCount: 1 },
    { data: monthRows, sheet: 'Ringkasan Bulan', columns: [{ width: 20 }, { width: 18 }, { width: 18 }, { width: 16 }], stickyRowsCount: 1 },
  ]).toFile(`kalkulator-duitmu-${date}.xlsx`)
}
