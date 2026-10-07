import type { AppState } from '../types'
import type { Derived } from '../lib/derive'
import { challenge } from '../lib/challenge'
import { formatIDR } from '../lib/money'

export function ChallengeCard({ state, derived }: { state: AppState; derived: Derived }) {
  const result = challenge(state, derived)
  if (!result) return null

  const deficit = result.left < 0
  const circumference = 2 * Math.PI * 34
  const progress = Math.min(1, result.spent / Math.max(1, result.target))
  const progressArc = progress * circumference

  const statusColor = deficit ? 'var(--danger)' : result.finished ? 'var(--ok)' : 'var(--accent)'

  return (
    <section className="card challenge-card" aria-label="Tantangan Hemat">
      <header className="card-head">
        <h2>Tantangan Hemat</h2>
        <span className="chip" style={{ background: 'var(--surface-3)', color: 'var(--text)', fontWeight: 600 }}>
          {result.points} poin
        </span>
      </header>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div
          role="progressbar"
          aria-valuenow={result.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progres pengeluaran tantangan"
          style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}
        >
          <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-3)" strokeWidth="7" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={statusColor}
              strokeWidth="7"
              strokeDasharray={`${progressArc} ${circumference}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <strong style={{ fontSize: '16px', fontWeight: 700, color: statusColor }}>
              {result.progressPct}%
            </strong>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '140px' }}>
          <p className="muted small" style={{ margin: '0 0 4px' }}>
            Target: <strong style={{ color: 'var(--text)' }}>{formatIDR(result.target)}</strong>
            <span> (80% uang jajan)</span>
          </p>
          <p className="muted small" style={{ margin: '0 0 6px' }}>
            Terpakai: <strong style={{ color: statusColor }}>{formatIDR(result.spent)}</strong>
          </p>

          {deficit ? (
            <p className="challenge-status text-danger" style={{ margin: 0, fontSize: '13px' }}>
              Kelebihan {formatIDR(-result.left)}. Tantangan gagal.
            </p>
          ) : result.finished ? (
            <p className="challenge-status text-ok" style={{ margin: 0, fontSize: '13px' }}>
              Lolos! Sisa {formatIDR(result.left)} tidak terpakai.
            </p>
          ) : (
            <p className="challenge-status" style={{ margin: 0, fontSize: '13px' }}>
              Di jalur hemat: sisa {formatIDR(result.left)}.
            </p>
          )}
        </div>
      </div>

      {result.streak > 0 && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--ok-soft)',
            color: 'var(--ok)',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '12.5px',
            fontWeight: 600,
          }}
        >
          Menang beruntun {result.streak} periode!
        </div>
      )}
    </section>
  )
}
