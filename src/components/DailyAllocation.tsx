import type { AppState, PeriodMode } from '../types'
import type { Derived } from '../lib/derive'
import { formatIDR } from '../lib/money'

interface Props {
  state: AppState
  derived: Derived
}

const UNIT: Record<PeriodMode, string> = { week: '1 minggu', month: '1 bulan' }

export function DailyAllocation({ state, derived }: Props) {
  if (!state.mode || state.allowance <= 0) return null

  return (
    <section className="card">
      <header className="card-head">
        <h2>Saran Pengeluaran per Hari</h2>
        <span className="muted small">{formatIDR(derived.daily)} / hari</span>
      </header>

      <ul className="alloc-list">
        {state.categories
          .filter((category) => category.ratio > 0)
          .map((category) => (
            <li key={category.id}>
              <span className="alloc-dot" style={{ background: category.color }} />
              <span className="alloc-name">{category.name}</span>
              <span className="alloc-pct">{Math.round(category.ratio * 100)}%</span>
              <strong className="alloc-value">{formatIDR(derived.daily * category.ratio)}</strong>
            </li>
          ))}
      </ul>
      <p className="muted small">
        Dibagi rata tiap hari dari uang jajan {UNIT[state.mode]} — dipakai untuk cek cepat "boleh keluar berapa
        hari ini" per pos.
      </p>
    </section>
  )
}
