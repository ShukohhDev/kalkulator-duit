import { useState } from 'react'
import type { Alert } from '../lib/alerts'

interface Props {
  alerts: Alert[]
}

export function AlertsPanel({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const visible = alerts.filter((alert) => !dismissed.includes(alert.id))
  if (visible.length === 0) return null

  return (
    <section className="card alert-card">
      <header className="card-head">
        <h2>Peringatan</h2>
        <span className="muted small">dihitung otomatis dari alokasi & sisa uang</span>
      </header>
      <ul className="alert-list">
        {visible.map((alert) => (
          <li key={alert.id} className={`alert alert-${alert.tone}`}>
            <span className="alert-icon" aria-hidden="true">
              !
            </span>
            <span className="alert-text">{alert.text}</span>
            <button
              type="button"
              className="alert-dismiss"
              aria-label={`Tutup peringatan ${alert.id}`}
              onClick={() => setDismissed((prev) => [...prev, alert.id])}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
