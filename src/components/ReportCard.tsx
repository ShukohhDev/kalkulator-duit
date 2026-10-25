import { useMemo, useState } from 'react'
import type { AppState, Notify } from '../types'
import { buildReport } from '../lib/report'
import { formatIDR, formatShortDate, monthKey, monthLabel, todayISO } from '../lib/money'
import { useI18n } from '../lib/i18n'
import { CustomSelect } from './CustomSelect'

export function ReportCard({ state, notify }: { state: AppState; notify: Notify }) {
  const { language } = useI18n()
  const [month, setMonth] = useState(() => monthKey(todayISO()))

  const months = useMemo(() => {
    const keys = new Set(state.expenses.map((item) => monthKey(item.date)))
    for (const income of state.incomes) keys.add(monthKey(income.date))
    keys.add(monthKey(todayISO()))
    return [...keys].sort().reverse()
  }, [state.expenses, state.incomes])

  const report = useMemo(() => buildReport(state, month), [state, month])
  const categoryMap = useMemo(
    () => new Map(state.categories.map((category) => [category.id, category])),
    [state.categories],
  )
  const empty = report.noteCount === 0 && report.byGoal.every((item) => item.logged === 0)

  const copyReport = async () => {
    const lines = [
      `${language === 'en' ? 'Report' : 'Laporan'} ${monthLabel(month)} · Kalkulator Uang Jajan`,
      `${language === 'en' ? 'Allowance' : 'Uang jajan'}: ${formatIDR(report.allowance)}`,
      `${language === 'en' ? 'Other income' : 'Pemasukan lain'}: ${formatIDR(report.manualIncome)}`,
      `${language === 'en' ? 'Expenses' : 'Pengeluaran'}: ${formatIDR(report.expense)} (${report.noteCount} ${language === 'en' ? 'records' : 'catatan'})`,
      `${language === 'en' ? 'Remaining' : 'Sisa'}: ${formatIDR(report.net)}`,
      ...report.byCategory.map(
        ({ category, amount, share }) =>
          `- ${category.name}: ${formatIDR(amount)} (${Math.round(share * 100)}%)`,
      ),
      ...report.topExpenses.map((item) => `- ${item.note || (language === 'en' ? 'Expense' : 'Pengeluaran')}: ${formatIDR(item.amount)}`),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(lines)
      notify(language === 'en' ? 'Report summary copied' : 'Ringkasan laporan disalin')
    } catch {
      notify(language === 'en' ? 'Failed to copy summary' : 'Gagal menyalin ringkasan', { error: true })
    }
  }

  return (
    <section className="card report">
      <header className="card-head">
        <h2>{language === 'en' ? 'Monthly Report' : 'Laporan Bulanan'}</h2>
        <div className="report-actions no-print">
          <CustomSelect
            className="input"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label={language === 'en' ? 'Report month' : 'Bulan laporan'}
            title={language === 'en' ? 'Select Report Month' : 'Pilih Bulan Laporan'}
          >
            {months.map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </CustomSelect>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copyReport()}>
            {language === 'en' ? 'Copy summary' : 'Salin ringkasan'}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => window.print()}>
            {language === 'en' ? 'Print / Save PDF' : 'Cetak / Simpan PDF'}
          </button>
        </div>
      </header>

      <div className="report-summary">
        <div className="report-stat">
          <span className="muted small">{language === 'en' ? 'Allowance' : 'Uang jajan'}</span>
          <strong>{formatIDR(report.allowance)}</strong>
        </div>
        <div className="report-stat">
          <span className="muted small">{language === 'en' ? 'Other income' : 'Pemasukan lain'}</span>
          <strong>{formatIDR(report.manualIncome)}</strong>
        </div>
        <div className="report-stat">
          <span className="muted small">
            {language === 'en' ? `Expenses (${report.noteCount} records)` : `Pengeluaran (${report.noteCount} catatan)`}
          </span>
          <strong>{formatIDR(report.expense)}</strong>
        </div>
        <div className="report-stat">
          <span className="muted small">{language === 'en' ? 'Remaining' : 'Sisa'}</span>
          <strong className={report.net < 0 ? 'text-danger' : ''}>{formatIDR(report.net)}</strong>
        </div>
      </div>

      {empty && (
        <p className="muted small">
          {language === 'en' ? `No records in ${monthLabel(month)}.` : `Belum ada catatan di ${monthLabel(month)}.`}
        </p>
      )}

      {report.byCategory.length > 0 && (
        <>
          <h3 className="section-title">{language === 'en' ? 'Expenses by category' : 'Pengeluaran per kategori'}</h3>
          <ul className="alloc-list">
            {report.byCategory.map(({ category, amount, share }) => (
              <li key={category.id}>
                <span className="alloc-dot" style={{ background: category.color }} />
                <span className="alloc-name">{category.name}</span>
                <span className="alloc-pct">{Math.round(share * 100)}%</span>
                <strong className="alloc-value">{formatIDR(amount)}</strong>
              </li>
            ))}
          </ul>
        </>
      )}

      {report.byGoal.length > 0 && (
        <>
          <h3 className="section-title">{language === 'en' ? 'Savings goals' : 'Target tabungan'}</h3>
          <ul className="alloc-list">
            {report.byGoal.map(({ goal, saved, logged, percent }) => (
              <li key={goal.id}>
                <span className="alloc-dot" style={{ background: 'var(--accent)' }} />
                <span className="alloc-name">{goal.name}</span>
                <span className="alloc-pct">{percent}%</span>
                <strong className="alloc-value">
                  {formatIDR(saved)}
                  {logged > 0 && (
                    <span className="muted small">
                      {' '}
                      ({language === 'en' ? `+${formatIDR(logged)} this month` : `+${formatIDR(logged)} bulan ini`})
                    </span>
                  )}
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}

      {report.topExpenses.length > 0 && (
        <>
          <h3 className="section-title">{language === 'en' ? 'Top 5 expenses' : '5 pengeluaran terbesar'}</h3>
          <ul className="tx-list">
            {report.topExpenses.map((item) => {
              const category = categoryMap.get(item.categoryId)
              return (
                <li key={item.id} className="tx">
                  <span className="tx-dot" style={{ background: category?.color ?? '#868e96' }} />
                  <span className="tx-main">
                    <strong>{item.note || category?.name || (language === 'en' ? 'Expense' : 'Pengeluaran')}</strong>
                    <span className="muted small">
                      {formatShortDate(item.date)} · {category?.name ?? (language === 'en' ? 'Uncategorized' : 'Tanpa kategori')}
                    </span>
                  </span>
                  <span className="tx-amount">−{formatIDR(item.amount)}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <p className="muted small report-footer">
        {language === 'en'
          ? 'Printed from Kalkulator Uang Jajan · data saved locally in browser · 8% annual compound growth.'
          : 'Dicetak dari Kalkulator Uang Jajan · data tersimpan lokal di browser · bunga majemuk 8% per tahun.'}
      </p>
    </section>
  )
}

