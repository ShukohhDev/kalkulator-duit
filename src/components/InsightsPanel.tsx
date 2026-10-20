import type { ReactNode } from 'react'
import type { Insight } from '../lib/insights'
import { ICON_CHECK, ICON_ALERT, ICON_INFO } from './icons'

interface Props {
  insights: Insight[]
}

const ICONS: Record<Insight['tone'], ReactNode> = {
  warn: ICON_ALERT,
  good: ICON_CHECK,
  info: ICON_INFO,
}

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
              {ICONS[item.tone]}
            </span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
