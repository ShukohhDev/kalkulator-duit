import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import type { AppState, Notify } from '../types'
import type { Derived } from '../lib/derive'
import { expenseLast7Days } from '../lib/derive'
import { formatIDR, roundTo500 } from '../lib/money'
import { translate, useI18n, type Language } from '../lib/i18n'
import { CHART_FONT, MUTED_COLOR } from '../lib/chartSetup'

interface Props {
  state: AppState
  derived?: Derived
  notify: Notify
  lang?: Language
}

export function WeekCard({ state, derived, notify, lang: propLang }: Props) {
  const { language } = useI18n()
  const lang = propLang ?? language
  const isEn = lang === 'en'

  const week = useMemo(() => expenseLast7Days(state), [state])

  const rawDailyBudget =
    derived?.daily && derived.daily > 0
      ? derived.daily
      : state.allowance > 0
      ? state.mode === 'week'
        ? state.allowance / 7
        : state.allowance / 30
      : 0
  const dailyBudget = roundTo500(rawDailyBudget)

  const spentToday = week.today.total
  const remainingToday = Math.max(0, dailyBudget - spentToday)
  const isOver = dailyBudget > 0 && spentToday > dailyBudget
  const ratio = dailyBudget > 0 ? spentToday / dailyBudget : 0
  const pctUsed = Math.min(100, Math.round(ratio * 100))

  const statusLabel =
    dailyBudget <= 0
      ? translate('week.noBudget', lang)
      : isOver
      ? `${translate('week.statusOver', lang)} ${formatIDR(spentToday - dailyBudget)}`
      : ratio >= 0.8
      ? `${translate('week.statusWarning', lang)} (${pctUsed}%)`
      : `${translate('week.statusSafe', lang)} (${pctUsed}%)`

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
        borderColor: '#0F766E',
        backgroundColor: 'rgba(15, 118, 110, 0.08)',
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        pointRadius: 3.5,
        pointBackgroundColor: '#0F766E',
        pointBorderColor: 'var(--surface)',
        pointBorderWidth: 1.5,
        pointHoverRadius: 5.5,
        pointHoverBackgroundColor: '#0F766E',
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
            `${isEn ? "Today's expenses:" : 'Pengeluaran hari ini:'} ${formatIDR(week.today.total)}`,
            ...week.today.byCategory.map((item) => `- ${item.name}: ${formatIDR(item.amount)}`),
          ]
        : [isEn ? 'No expenses recorded today' : 'Belum ada pengeluaran hari ini']
    const titleApp = isEn ? 'Pocket Money Calculator' : 'Kalkulator Uang Jajan'
    const text = [`${titleApp} · ${week.today.label}`, ...body].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      notify(isEn ? "Today's summary copied" : 'Ringkasan hari ini disalin')
    } catch {
      notify(isEn ? 'Failed to copy summary' : 'Gagal menyalin ringkasan', { error: true })
    }
  }

  return (
    <section className="card week-card" aria-label={translate('week.title', lang)}>
      <header className="card-head">
        <h2>{translate('week.title', lang)}</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copySummary}>
          {translate('week.copy', lang)}
        </button>
      </header>

      {dailyBudget > 0 && (
        <div className="daily-meter-block">
          <div className="daily-meter-top">
            <div className="daily-meter-title-wrap">
              <strong>{translate('week.meterTitle', lang)}</strong>
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
              <span className="muted small">{translate('week.dailyBudget', lang)}</span>
              <strong>{formatIDR(dailyBudget)}</strong>
            </div>
            <div className="daily-stat">
              <span className="muted small">{translate('week.spent', lang)}</span>
              <strong className={isOver ? 'text-danger' : ''}>{formatIDR(spentToday)}</strong>
            </div>
            <div className="daily-stat">
              <span className="muted small">{translate('week.remaining', lang)}</span>
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
        <span className="muted">{translate('week.total7', lang)}</span>
        <strong>{formatIDR(week.total7)}</strong>
      </div>
    </section>
  )
}
