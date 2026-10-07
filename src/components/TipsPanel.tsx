import type { Tip } from '../lib/tips'

interface Props {
  tips: Tip[]
}

export function TipsPanel({ tips }: Props) {
  if (tips.length === 0) return null

  return (
    <section className="card">
      <header className="card-head">
        <h2>Tips Hemat</h2>
        <span className="muted small">dari pola belanjamu</span>
      </header>
      <ul className="tip-list">
        {tips.map((tip) => (
          <li key={tip.id} className="tip">
            <span className="tip-icon" aria-hidden="true">
              →
            </span>
            <span>{tip.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
