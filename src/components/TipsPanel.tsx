import type { Tip } from '../lib/tips'
import { useI18n } from '../lib/i18n'

interface Props {
  tips: Tip[]
}

export function TipsPanel({ tips }: Props) {
  const { language } = useI18n()
  const isEn = language === 'en'

  if (tips.length === 0) return null

  return (
    <section className="card">
      <header className="card-head">
        <h2>{isEn ? 'Savings Tips' : 'Tips Hemat'}</h2>
        <span className="muted small">{isEn ? 'from your spending patterns' : 'dari pola belanjamu'}</span>
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
