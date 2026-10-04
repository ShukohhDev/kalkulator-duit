import { useEffect, useMemo, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import type { AppState, CashflowChartType, CashflowView } from '../types'
import type { Derived } from '../lib/derive'
import { buildCashflow } from '../lib/derive'
import { CHART_FONT, EXPENSE_COLOR, INCOME_COLOR, MUTED_COLOR } from '../lib/chartSetup'
import { loadPrefs, savePrefs } from '../lib/prefs'
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

const CHARTS: { id: CashflowChartType; label: string }[] = [
  { id: 'bar', label: 'Batang' },
  { id: 'line', label: 'Garis' },
  { id: 'donut', label: 'Donut' },
  { id: 'category', label: 'Kategori' },
]

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: MUTED_COLOR, font: CHART_FONT } },
    tooltip: {
      callbacks: {
        label: (ctx: { label?: string; parsed: number }) => `${ctx.label}: ${formatIDR(Number(ctx.parsed))}`,
      },
    },
  },
}

export function CashflowChart({ state, derived }: Props) {
  const [view, setView] = useState<CashflowView>(() => loadPrefs().view)
  const [chartType, setChartType] = useState<CashflowChartType>(() => loadPrefs().chartType)

  useEffect(() => {
    savePrefs({ view, chartType })
  }, [view, chartType])

  const series = useMemo(
    () => buildCashflow(derived.allIncomes, state.expenses, view),
    [derived.allIncomes, state.expenses, view],
  )

  const totalIn = series.income.reduce((sum, value) => sum + value, 0)
  const totalOut = series.expense.reduce((sum, value) => sum + value, 0)
  const empty = series.labels.length === 0

  const categoryRows = state.categories
    .map((category) => ({ category, amount: series.categoryTotals[category.id] ?? 0 }))
    .filter((row) => row.amount > 0)
  const donutEmpty = chartType === 'donut' ? totalIn + totalOut === 0 : categoryRows.length === 0

  const lineData = {
    labels: series.labels,
    datasets: [
      {
        label: 'Pemasukan',
        data: series.income,
        borderColor: INCOME_COLOR,
        backgroundColor: INCOME_COLOR,
        tension: 0.25,
        pointRadius: 2,
      },
      {
        label: 'Pengeluaran',
        data: series.expense,
        borderColor: EXPENSE_COLOR,
        backgroundColor: EXPENSE_COLOR,
        tension: 0.25,
        pointRadius: 2,
      },
    ],
  }

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

      <div className="chart-type-row seg">
        {CHARTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`seg-btn${chartType === item.id ? ' seg-active' : ''}`}
            onClick={() => setChartType(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {empty || donutEmpty ? (
        <p className="muted">Belum ada data untuk digambar.</p>
      ) : (
        <>
          {chartType === 'bar' && (
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
          )}

          {chartType === 'line' && (
            <div className="chart-box chart-box-bar">
              <Line
                data={lineData}
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
          )}

          {chartType === 'donut' && (
            <div className="chart-box chart-box-donut">
              <Doughnut
                data={{
                  labels: ['Pemasukan', 'Pengeluaran'],
                  datasets: [
                    {
                      data: [totalIn, totalOut],
                      backgroundColor: [INCOME_COLOR, EXPENSE_COLOR],
                      borderWidth: 0,
                    },
                  ],
                }}
                options={donutOptions}
              />
            </div>
          )}

          {chartType === 'category' && (
            <div className="chart-box chart-box-donut">
              <Doughnut
                data={{
                  labels: categoryRows.map((row) => row.category.name),
                  datasets: [
                    {
                      data: categoryRows.map((row) => row.amount),
                      backgroundColor: categoryRows.map((row) => row.category.color),
                      borderWidth: 0,
                    },
                  ],
                }}
                options={donutOptions}
              />
            </div>
          )}

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
