import type { AppState, PeriodMode } from '../types'
import type { Derived } from '../lib/derive'
import type { Updater } from '../hooks/useAppState'
import { formatIDR } from '../lib/money'
import { MoneyInput } from './MoneyInput'
import { ProgressBar } from './ProgressBar'

interface Props {
  state: AppState
  derived: Derived
  update: Updater
  onChangePeriod: () => void
}

const LABEL: Record<PeriodMode, string> = { week: '1 Minggu', month: '1 Bulan' }
const UNIT: Record<PeriodMode, string> = { week: 'minggu', month: 'bulan' }

export function AllowanceCard({ state, derived, update, onChangePeriod }: Props) {
  const mode = state.mode

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
          <ul className="alloc-list">
            {state.categories
              .filter((category) => category.ratio > 0)
              .map((category) => (
                <li key={category.id}>
                  <span className="alloc-dot" style={{ background: category.color }} />
                  <span className="alloc-name">{category.name}</span>
                  <span className="alloc-pct">{Math.round(category.ratio * 100)}%</span>
                  <strong className="alloc-value">{formatIDR(state.allowance * category.ratio)}</strong>
                </li>
              ))}
          </ul>
          <p className="muted small">
            Total alokasi = {formatIDR(state.allowance)} (100% dari uang jajan {LABEL[mode ?? 'week'].toLowerCase()}).
          </p>
        </>
      )}
    </section>
  )
}
