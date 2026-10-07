import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import type { AppState, Notify } from '../types'
import type { Derived } from '../lib/derive'
import { expenseLast7Days } from '../lib/derive'
import { formatIDR } from '../lib/money'
import { CHART_FONT, MUTED_COLOR } from '../lib/chartSetup'

interface Props {
  state: AppState
  derived?: Derived
  notify: Notify
}

export function WeekCard({ state, derived, notify }: Props) {
  const week = useMemo(() => expenseLast7Days(state), [state])

  const dailyBudget =
    derived?.daily && derived.daily > 0
      ? derived.daily
      : state.allowance > 0
      ? state.mode === 'week'
        ? state.allowance / 7
        : state.allowance / 30
      : 0

  const spentToday = week.today.total
  const remainingToday = Math.max(0, dailyBudget - spentToday)
  const isOver = dailyBudget > 0 && spentToday > dailyBudget
  const ratio = dailyBudget > 0 ? spentToday / dailyBudget : 0
  const pctUsed = Math.min(100, Math.round(ratio * 100))

  const statusLabel =
    dailyBudget <= 0
      ? 'Belum ada anggaran'
      : isOver
      ? `Lewat ${formatIDR(spentToday - dailyBudget)}`
      : ratio >= 0.8
      ? `Mendekati Batas (${pctUsed}%)`
      : `Aman (${pctUsed}%)`

  const statusClass =
    dailyBudget <= 0
      ? 'meter-neutral'
      : isOver
      ? 'meter-danger'
      : ratio >= 0.8
      ? 'meter-warning'
      : 'meter-safe'

  const data = {
    labels: week.days.map((day) => day.label),
    datasets: [
      {
        data: week.days.map((day) => day.total),
        borderColor: '#ea580c',
        backgroundColor: 'rgba(234, 88, 12, 0.08)',
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        pointRadius: 3.5,
        pointBackgroundColor: '#ea580c',
        pointBorderColor: 'var(--surface)',
        pointBorderWidth: 1.5,
        pointHoverRadius: 5.5,
        pointHoverBackgroundColor: '#ea580c',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'var(--text)',
        titleColor: 'var(--surface)',
        bodyColor: 'var(--surface)',
        borderWidth: 0,
        padding: 10,
        cornerRadius: 8,
        callbacks: { label: (ctx: { parsed: { y: number | null } }) => formatIDR(Number(ctx.parsed.y ?? 0)) },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: MUTED_COLOR, font: CHART_FONT },
      },
      y: { display: false, beginAtZero: true },
    },
  }

  const copySummary = async () => {
    const body =
      week.today.total > 0
        ? [
            `Pengeluaran hari ini: ${formatIDR(week.today.total)}`,
            ...week.today.byCategory.map((item) => `- ${item.name}: ${formatIDR(item.amount)}`),
          ]
        : ['Belum ada pengeluaran hari ini']
    const text = [`Kalkulator Uang Jajan · ${week.today.label}`, ...body].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      notify('Ringkasan hari ini disalin')
    } catch {
      notify('Gagal menyalin ringkasan', { error: true })
    }
  }

  return (
    <section className="card week-card" aria-label="7 hari terakhir">
      <header className="card-head">
        <h2>7 Hari Terakhir</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copySummary}>
          Salin ringkasan hari ini
        </button>
      </header>

      {dailyBudget > 0 && (
        <div className="daily-meter-block">
          <div className="daily-meter-top">
            <div className="daily-meter-title-wrap">
              <strong>Meteran Belanja Hari Ini</strong>
              <span className="muted small">{week.today.label}</span>
            </div>
            <span className={`daily-meter-chip ${statusClass}`}>{statusLabel}</span>
          </div>

          <div className="daily-progress-track">
            <div
              className={`daily-progress-fill ${statusClass}`}
              style={{ width: `${Math.min(100, Math.max(0, pctUsed))}%` }}
            />
          </div>

          <div className="daily-meter-stats">
            <div className="daily-stat">
              <span className="muted small">Jatah Hari Ini</span>
              <strong>{formatIDR(dailyBudget)}</strong>
            </div>
            <div className="daily-stat">
              <span className="muted small">Terpakai</span>
              <strong className={isOver ? 'text-danger' : ''}>{formatIDR(spentToday)}</strong>
            </div>
            <div className="daily-stat">
              <span className="muted small">Sisa Hari Ini</span>
              <strong className={isOver ? 'text-danger' : 'text-success'}>
                {isOver ? `−${formatIDR(spentToday - dailyBudget)}` : formatIDR(remainingToday)}
              </strong>
            </div>
          </div>
        </div>
      )}

      <div className="spark-wrap">
        <Line data={data} options={options} />
      </div>
      <div className="week-total">
        <span className="muted">Total pengeluaran 7 hari</span>
        <strong>{formatIDR(week.total7)}</strong>
      </div>
    </section>
  )
}
