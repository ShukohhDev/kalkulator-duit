import { useMemo } from 'react'
import type { AppState } from '../types'
import type { Derived } from '../lib/derive'
import { healthScore } from '../lib/health'
import { useI18n } from '../lib/i18n'

function getScoreGrade(score: number, lang: 'id' | 'en') {
  if (score >= 85) return { color: 'var(--ok)', label: lang === 'en' ? 'Outstanding' : 'Luar biasa' }
  if (score >= 70) return { color: 'var(--ok)', label: lang === 'en' ? 'Healthy' : 'Sehat' }
  if (score >= 50) return { color: 'var(--warn)', label: lang === 'en' ? 'Needs Attention' : 'Perlu perhatian' }
  return { color: 'var(--danger)', label: lang === 'en' ? 'Critical' : 'Kritis' }
}

export function HealthCard({ state, derived }: { state: AppState; derived: Derived }) {
  const { language } = useI18n()
  const now = useMemo(() => new Date(), [])
  const result = healthScore(state, derived, now, language)
  const { color } = getScoreGrade(result.score, language)
  const circumference = 2 * Math.PI * 40
  const progress = (result.score / 100) * circumference

  return (
    <section className="card health-card" aria-label={language === 'en' ? 'Financial health score' : 'Skor kesehatan keuangan'}>
      <header className="card-head">
        <h2>{language === 'en' ? 'Financial Health Score' : 'Skor Kesehatan Keuangan'}</h2>
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
            {language === 'en'
              ? 'This score is automatically calculated from how you allocate, save, and manage your spending habits.'
              : 'Skor ini dinilai otomatis dari caramu ngatur alokasi, nabung, dan nahan pengeluaran.'}
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
