import type { AppState } from '../types'
import { currentStreak, evaluateBadges } from '../lib/streak'

interface Props {
  state: AppState
  savingsByGoal: Record<string, number>
}

export function StreakBar({ state, savingsByGoal }: Props) {
  const streak = currentStreak(state.expenses)
  const badges = evaluateBadges(state, savingsByGoal)
  const unlocked = badges.filter((badge) => badge.unlocked)

  return (
    <section className="card">
      <header className="card-head">
        <h2>Kebiasaan</h2>
        <span className="muted small">
          {streak > 0 ? `${streak} hari berturut-turut` : 'belum ada streak'}
        </span>
      </header>

      <div className="streak-row" aria-label="Streak mencatat">
        <span className="streak-number">{streak}</span>
        <span className="muted">hari mencatat beruntun</span>
      </div>

      <div className="badge-row">
        {badges.map((badge) => (
          <span key={badge.id} className={`badge-chip${badge.unlocked ? ' badge-chip-on' : ''}`} title={badge.desc}>
            <span className="badge-dot" aria-hidden="true" />
            {badge.name}
          </span>
        ))}
      </div>

      <p className="muted small">
        {unlocked.length} dari {badges.length} badge terbuka. Catat pengeluaran tiap hari untuk menjaga streak.
      </p>
    </section>
  )
}
