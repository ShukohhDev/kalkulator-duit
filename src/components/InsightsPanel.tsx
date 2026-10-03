import type { Insight } from '../lib/insights'

interface Props {
  insights: Insight[]
}

const ICON: Record<Insight['tone'], string> = { warn: '!', good: '✓', info: 'i' }

export function InsightsPanel({ insights }: Props) {
  if (insights.length === 0) return null

  return (
    <section className="card">
      <header className="card-head">
        <h2>Saran Otomatis</h2>
        <span className="muted small">dihitung dari catatanmu</span>
      </header>
      <ul className="insight-list">
        {insights.map((item) => (
          <li key={item.id} className={`insight insight-${item.tone}`}>
            <span className="insight-icon" aria-hidden="true">
              {ICON[item.tone]}
            </span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
