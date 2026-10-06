import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import type { AppState, Notify } from '../types'
import { expenseLast7Days } from '../lib/derive'
import { formatIDR } from '../lib/money'
import { CHART_FONT, EXPENSE_COLOR, MUTED_COLOR } from '../lib/chartSetup'

interface Props {
  state: AppState
  notify: Notify
}

export function WeekCard({ state, notify }: Props) {
  const week = useMemo(() => expenseLast7Days(state), [state])

  const data = {
    labels: week.days.map((day) => day.label),
    datasets: [
      {
        data: week.days.map((day) => day.total),
        borderColor: EXPENSE_COLOR,
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: EXPENSE_COLOR,
        pointBorderWidth: 0,
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
      x: { grid: { display: false }, ticks: { color: MUTED_COLOR, font: CHART_FONT } },
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
      <div className="spark-wrap">
        <Line data={data} options={options} />
      </div>
      <p className="week-total">
        <span className="muted">Total pengeluaran 7 hari</span>
        <strong>{formatIDR(week.total7)}</strong>
      </p>
    </section>
  )
}
