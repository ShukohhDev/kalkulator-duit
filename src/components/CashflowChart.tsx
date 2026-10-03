import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import type { AppState, CashflowView } from '../types'
import type { Derived } from '../lib/derive'
import { buildCashflow } from '../lib/derive'
import { CHART_FONT, EXPENSE_COLOR, INCOME_COLOR, MUTED_COLOR } from '../lib/chartSetup'
import { formatIDR } from '../lib/money'

interface Props {
  state: AppState
  derived: Derived
}

const VIEWS: { id: CashflowView; label: string }[] = [
  { id: 'day', label: 'Harian' },
  { id: 'week', label: 'Mingguan' },
  { id: 'month', label: 'Bulanan' },
  { id: 'year', label: 'Tahunan' },
]

export function CashflowChart({ state, derived }: Props) {
  const [view, setView] = useState<CashflowView>('day')

  const series = useMemo(
    () => buildCashflow(derived.allIncomes, state.expenses, view),
    [derived.allIncomes, state.expenses, view],
  )

  const totalIn = series.income.reduce((sum, value) => sum + value, 0)
  const totalOut = series.expense.reduce((sum, value) => sum + value, 0)

  const empty = series.labels.length === 0

  return (
    <section className="card">
      <header className="card-head">
        <h2>Pemasukan vs Pengeluaran</h2>
        <div className="seg">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`seg-btn${view === item.id ? ' seg-active' : ''}`}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {empty ? (
        <p className="muted">Belum ada data untuk digambar.</p>
      ) : (
        <>
          <div className="chart-box chart-box-bar">
            <Bar
              data={{
                labels: series.labels,
                datasets: [
                  { label: 'Pemasukan', data: series.income, backgroundColor: INCOME_COLOR, borderRadius: 4 },
                  { label: 'Pengeluaran', data: series.expense, backgroundColor: EXPENSE_COLOR, borderRadius: 4 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { labels: { color: MUTED_COLOR, font: CHART_FONT } },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatIDR(Number(ctx.parsed.y))}` } },
                },
                scales: {
                  x: { ticks: { color: MUTED_COLOR, font: CHART_FONT }, grid: { display: false } },
                  y: {
                    ticks: { color: MUTED_COLOR, font: CHART_FONT, callback: (value) => formatIDR(Number(value)) },
                    grid: { color: 'rgba(134,142,150,0.15)' },
                  },
                },
              }}
            />
          </div>

          <div className="chart-summary">
            <span>
              <i className="dot" style={{ background: INCOME_COLOR }} /> Pemasukan {formatIDR(totalIn)}
            </span>
            <span>
              <i className="dot" style={{ background: EXPENSE_COLOR }} /> Pengeluaran {formatIDR(totalOut)}
            </span>
            <span className={totalIn - totalOut < 0 ? 'text-danger' : ''}>Selisih {formatIDR(totalIn - totalOut)}</span>
          </div>
        </>
      )}
    </section>
  )
}
