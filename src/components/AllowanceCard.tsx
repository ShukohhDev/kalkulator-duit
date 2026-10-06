import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { AppState, PeriodMode } from '../types'
import type { Derived } from '../lib/derive'
import type { Updater } from '../hooks/useAppState'
import { formatIDR } from '../lib/money'
import { MoneyInput } from './MoneyInput'
import { ProgressBar } from './ProgressBar'
import { AllocationEditor } from './AllocationEditor'

interface Props {
  state: AppState
  derived: Derived
  update: Updater
  onChangePeriod: () => void
}

const LABEL: Record<PeriodMode, string> = { week: '1 Minggu', month: '1 Bulan' }
const UNIT: Record<PeriodMode, string> = { week: 'minggu', month: 'bulan' }

const pctText = (ratio: number) => `${String(Number((ratio * 100).toFixed(1))).replace('.', ',')}%`

export function AllowanceCard({ state, derived, update, onChangePeriod }: Props) {
  const mode = state.mode
  const [editing, setEditing] = useState(false)

  return (
    <section className="card">
      <header className="card-head">
        <h2>Uang Jajan</h2>
        {mode && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onChangePeriod}>
            Ubah ke {mode === 'week' ? 'bulanan' : 'mingguan'}
          </button>
        )}
      </header>

      <div className="field">
        <label htmlFor="allowance">
          Total uang jajan {mode ? `per ${UNIT[mode]}` : ''}
          {mode && <span className="chip">{LABEL[mode]}</span>}
        </label>
        <MoneyInput value={state.allowance} onValueChange={(value) => update((s) => ({ ...s, allowance: value }))} id="allowance" />
      </div>

      {state.allowance > 0 && mode && (
        <>
          <p className="muted small">
            Setara {formatIDR(derived.daily)}/hari · {formatIDR(derived.weekly)}/minggu · {formatIDR(derived.monthly)}/bulan
          </p>

          <div className="safe">
            <span className="safe-label">Boleh belanja hari ini</span>
            <strong className="safe-value">{formatIDR(derived.safeToSpend)}</strong>
            <span className="muted small">
              Sisa {formatIDR(derived.remainingInPeriod)} dari {formatIDR(state.allowance)} untuk periode ini
            </span>
            <ProgressBar value={derived.spentInPeriod} max={state.allowance} />
          </div>

          <h3 className="section-title">Hasil alokasi</h3>
          <div className="wallet-grid alloc-cards">
            {state.categories
              .filter((category) => category.ratio > 0)
              .map((category) => (
                <article
                  key={category.id}
                  className="wallet"
                  style={{ '--wallet-color': category.color } as CSSProperties}
                >
                  <header>
                    <span className="wallet-dot" />
                    <h3>{category.name}</h3>
                  </header>
                  <p className="wallet-amount">{formatIDR(state.allowance * category.ratio)}</p>
                  <p className="muted small">{pctText(category.ratio)} dari uang jajan</p>
                </article>
              ))}
          </div>
          <p className="muted small">
            Total alokasi = {formatIDR(state.allowance)} (100% dari uang jajan {LABEL[mode ?? 'week'].toLowerCase()}).
          </p>

          {!editing && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              Ubah alokasi
            </button>
          )}

          {editing && <AllocationEditor state={state} update={update} onDone={() => setEditing(false)} />}
        </>
      )}
    </section>
  )
}
