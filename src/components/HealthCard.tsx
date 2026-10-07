import type { AppState } from '../types'
import type { Derived } from '../lib/derive'
import { healthScore } from '../lib/health'

function getScoreGrade(score: number) {
  if (score >= 85) return { color: 'var(--ok)', label: 'Luar biasa' }
  if (score >= 70) return { color: 'var(--ok)', label: 'Sehat' }
  if (score >= 50) return { color: 'var(--warn)', label: 'Perlu perhatian' }
  return { color: 'var(--danger)', label: 'Kritis' }
}

export function HealthCard({ state, derived }: { state: AppState; derived: Derived }) {
  const result = healthScore(state, derived)
  const { color } = getScoreGrade(result.score)
  const circumference = 2 * Math.PI * 40
  const progress = (result.score / 100) * circumference

  return (
    <section className="card health-card" aria-label="Skor kesehatan keuangan">
      <header className="card-head">
        <h2>Skor Kesehatan Keuangan</h2>
      </header>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
          <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--surface-3)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={`${progress} ${circumference}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <strong className="health-score" style={{ color, fontSize: '24px', lineHeight: 1 }}>
              {result.score}
            </strong>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginTop: '2px' }}>/100</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '160px' }}>
          <p className="health-grade" style={{ color, margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>
            {result.grade}
          </p>
          <p className="muted small" style={{ margin: 0, lineHeight: 1.5 }}>
            Skor ini berdasarkan alokasi, penghematan, tabungan, dan keseimbangan keuanganmu.
          </p>
        </div>
      </div>

      <ul className="rec-list">
        {result.indicators.map((item) => (
          <li key={item.id}>
            <span>
              {item.label}
              <span className="muted small"> · {item.detail}</span>
            </span>
            <strong
              style={{
                color: item.score < 50 ? 'var(--danger)' : item.score >= 80 ? 'var(--ok)' : 'var(--warn)',
                fontSize: '15px',
              }}
            >
              {item.score}
            </strong>
          </li>
        ))}
      </ul>
    </section>
  )
}
