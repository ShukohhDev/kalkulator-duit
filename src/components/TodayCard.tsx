import type { AppState } from '../types'
import type { Derived } from '../lib/derive'
import { formatIDR, todayISO } from '../lib/money'
import { ProgressBar } from './ProgressBar'

interface Props {
  state: AppState
  derived: Derived
}

const labelFor = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })

export function TodayCard({ state, derived }: Props) {
  const today = todayISO()
  const spentToday = state.expenses
    .filter((item) => item.date === today)
    .reduce((sum, item) => sum + item.amount, 0)
  const loggedToday = state.expenses.some((item) => item.date === today)

  const logNow = () => {
    const field = document.getElementById('exp-date')
    if (!field) return
    field.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    field.focus()
  }

  const dateLabel = labelFor(today)

  return (
    <section className="card">
      <header className="card-head">
        <h2>Hari Ini</h2>
        <span className="muted small">{dateLabel}</span>
      </header>

      {!derived.period ? (
        <p className="muted small">Pilih periode dulu untuk melihat status hari ini.</p>
      ) : (
        <>
          <p className="muted small">
            Hari ke-{derived.elapsedDays} dari {derived.period.totalDays} periode ini
          </p>

          {derived.daily > 0 ? (
            <div className="today-progress">
              <div className="today-head">
                <span>Realisasi vs rencana hari ini</span>
                <span className="muted small">
                  {formatIDR(spentToday)} / {formatIDR(derived.daily)}
                </span>
              </div>
              <ProgressBar value={spentToday} max={derived.daily} />
            </div>
          ) : (
            <p className="muted small">Isi nominal uang jajan dulu untuk melihat rencana hari ini.</p>
          )}

          {loggedToday ? (
            <p className="today-ok">✓ Sudah catat hari ini</p>
          ) : (
            <button type="button" className="btn btn-sm cta-log" onClick={logNow}>
              Catat sekarang
            </button>
          )}
        </>
      )}
    </section>
  )
}
