import type { AppState } from '../types'
import type { Badge } from '../lib/streak'
import { currentStreak, evaluateBadges } from '../lib/streak'
import { todayISO } from '../lib/money'
import { ProgressBar } from './ProgressBar'

interface Props {
  state: AppState
  savingsByGoal: Record<string, number>
}

const FlameIcon = () => (
  <svg className="streak-flame" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

const progressLabel = (badge: Badge) =>
  badge.unit === 'persen' ? `${badge.current}% dari ${badge.target}%` : `${badge.current}/${badge.target} ${badge.unit}`

export function StreakBar({ state, savingsByGoal }: Props) {
  const streak = currentStreak(state.expenses)
  const badges = evaluateBadges(state, savingsByGoal)
  const unlocked = badges.filter((badge) => badge.unlocked)
  const next = badges.reduce<Badge | null>(
    (best, badge) => (badge.unlocked ? best : best === null || badge.progress > best.progress ? badge : best),
    null,
  )
  const loggedToday = state.expenses.some((item) => item.date === todayISO())

  const logToday = () => {
    const field = document.getElementById('exp-date')
    if (!field) return
    field.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    field.focus()
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Kebiasaan</h2>
        <span className="muted small">
          {streak > 0 ? `${streak} hari berturut-turut` : 'belum ada streak'}
        </span>
      </header>

      <div className="streak-row" aria-label="Streak mencatat">
        <span className={`streak-number${streak === 0 ? ' is-zero' : ''}`}>{streak}</span>
        <FlameIcon />
        <span className="muted">hari mencatat beruntun</span>
      </div>

      {next && (
        <div className="badge-next">
          <div className="badge-next-head">
            <span className="badge-next-title">Menuju {next.name}</span>
            <span className="muted small">{progressLabel(next)}</span>
          </div>
          <ProgressBar value={next.current} max={next.target} />
        </div>
      )}

      <div className="badge-row">
        {badges.map((badge) => (
          <span key={badge.id} className={`badge-chip${badge.unlocked ? ' badge-chip-on' : ''}`} title={badge.desc}>
            {badge.unlocked ? <CheckIcon /> : <span className="badge-dot" aria-hidden="true" />}
            {badge.name}
            {!badge.unlocked && <span className="badge-progress">{progressLabel(badge)}</span>}
          </span>
        ))}
      </div>

      {!loggedToday && (
        <button type="button" className="btn btn-sm cta-log" onClick={logToday}>
          Catat pengeluaran hari ini
        </button>
      )}

      <p className="muted small">
        {unlocked.length} dari {badges.length} badge terbuka. Catat pengeluaran tiap hari untuk menjaga streak.
      </p>
    </section>
  )
}
