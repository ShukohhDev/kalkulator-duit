import type { AppState } from '../types'

function escapeCell(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function row(cells: string[]): string {
  return cells.map(escapeCell).join(';')
}

// BOM UTF-8 + pemisah ';' biar rapi dibuka di Excel/LibreOffice (locale Indonesia)
export function buildCsv(state: AppState): string {
  const categoryNames = new Map(state.categories.map((category) => [category.id, category.name]))
  const lines: string[] = [row(['jenis', 'tanggal', 'kategori', 'catatan', 'nominal'])]

  for (const expense of [...state.expenses].sort((a, b) => a.date.localeCompare(b.date))) {
    lines.push(
      row([
        'pengeluaran',
        expense.date,
        categoryNames.get(expense.categoryId) ?? expense.categoryId,
        expense.note,
        String(expense.amount),
      ]),
    )
  }
  for (const income of [...state.incomes].sort((a, b) => a.date.localeCompare(b.date))) {
    lines.push(row(['pemasukan', income.date, income.source, '', String(income.amount)]))
  }

  return `\uFEFF${lines.join('\r\n')}`
}
