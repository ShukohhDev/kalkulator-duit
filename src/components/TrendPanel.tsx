import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import type { AppState, CashflowView } from '../types'
import { buildCashflow } from '../lib/derive'
import { CHART_FONT, EXPENSE_COLOR, MUTED_COLOR } from '../lib/chartSetup'
import { loadPrefs, savePrefs } from '../lib/prefs'
import { formatIDR } from '../lib/money'
import { nowDate } from '../lib/obligations'
import { CustomSelect } from './CustomSelect'

const VIEWS: { id: CashflowView; label: string }[] = [
  { id: 'day', label: 'Harian' },
  { id: 'week', label: 'Mingguan' },
  { id: 'month', label: 'Bulanan' },
  { id: 'year', label: 'Tahunan' },
]

interface Props {
  state: AppState
}

export function TrendPanel({ state }: Props) {
  const [categoryId, setCategoryId] = useState(state.categories[0]?.id ?? 'makan')
  const [view, setView] = useState<CashflowView>(() => loadPrefs().trendView)

  const now = nowDate()
  const expenses = state.expenses.filter((item) => item.categoryId === categoryId)
  const series = buildCashflow([], expenses, view, now)
  const total = series.expense.reduce((sum, value) => sum + value, 0)
  const active = state.categories.find((category) => category.id === categoryId)

  const pickView = (next: CashflowView) => {
    setView(next)
    savePrefs({ trendView: next })
  }

  const data = {
    labels: series.labels,
    datasets: [
      {
        label: active?.name ?? 'Pengeluaran',
        data: series.expense,
        borderColor: active?.color ?? EXPENSE_COLOR,
        backgroundColor: active?.color ?? EXPENSE_COLOR,
        tension: 0.3,
        pointRadius: 3,
        fill: false,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx: { parsed: { y: number | null } }) => formatIDR(Number(ctx.parsed.y ?? 0)) },
      },
    },
    scales: {
      x: { ticks: { color: MUTED_COLOR, font: CHART_FONT } },
      y: {
        beginAtZero: true,
        ticks: {
          color: MUTED_COLOR,
          font: CHART_FONT,
          callback: (value: unknown) => formatIDR(Number(value)),
        },
      },
    },
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Tren per Kategori</h2>
        <div className="seg">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`seg-btn${view === item.id ? ' seg-active' : ''}`}
              onClick={() => pickView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="filter-row">
        <CustomSelect
          className="input"
          aria-label="Kategori tren"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          title="Pilih Kategori Tren"
        >
          {state.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </CustomSelect>
        <span className="muted small">Total terlihat {formatIDR(total)}</span>
      </div>

      {expenses.length === 0 ? (
        <p className="muted">Belum ada pengeluaran pada kategori ini.</p>
      ) : (
        <div className="chart-box chart-box-bar">
          <Line data={data} options={options} />
        </div>
      )}
    </section>
  )
}
