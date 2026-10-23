import type { CSSProperties } from 'react'
import type { AppState } from '../types'
import type { Derived } from '../lib/derive'
import { formatIDR } from '../lib/money'
import { roundTo500 } from '../lib/allocation'
import { ProgressBar } from './ProgressBar'

interface Props {
  state: AppState
  derived: Derived
}

export function WalletCards({ state, derived }: Props) {
  if (state.mode === null || state.allowance <= 0) return null

  const activeCategories = state.categories.filter((category) => category.ratio > 0)
  if (activeCategories.length === 0) return null

  return (
    <section className="card">
      <header className="card-head">
        <h2>Kartu Saku</h2>
        <span className="muted small">Alokasi vs realisasi periode ini</span>
      </header>

      <div className="wallet-grid">
        {activeCategories.map((category) => {
          const allocated = roundTo500(state.allowance * category.ratio)
          const spent = derived.spentByCategory[category.id] ?? 0
          const over = allocated > 0 && spent > allocated

          return (
            <article key={category.id} className="wallet" style={{ '--wallet-color': category.color } as CSSProperties}>
              <header>
                <span className="wallet-dot" />
                <h3>{category.name}</h3>
              </header>
              <p className="wallet-amount">{formatIDR(spent)}</p>
              <p className="muted small">
                Alokasi {formatIDR(allocated)} · sisa {formatIDR(Math.max(0, allocated - spent))}
              </p>
              <ProgressBar value={spent} max={allocated} />
              {over && <span className="badge badge-danger">Melebihi alokasi {Math.round((spent / allocated) * 100)}%</span>}
              {!over && spent >= allocated * 0.8 && (
                <span className="badge badge-warn">Hampir mencapai batas ({Math.round((spent / allocated) * 100)}%)</span>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
