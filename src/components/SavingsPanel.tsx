import { useMemo } from 'react'
import type { AppState, Goal } from '../types'
import type { Derived } from '../lib/derive'
import type { Updater } from '../hooks/useAppState'
import { formatIDR } from '../lib/money'
import { uid } from '../lib/id'
import { ageAfter, formatDuration, futureValue, monthsToTarget, requiredDeposit } from '../lib/savings'
import { MoneyInput } from './MoneyInput'
import { ProgressBar } from './ProgressBar'

interface Props {
  state: AppState
  derived: Derived
  update: Updater
}

const defaultDeposit = (derived: Derived) => Math.round(derived.monthly * 0.2)

const monthsLeft = (goal: Goal, currentAge: number) => (goal.targetAge - currentAge) * 12

export function SavingsPanel({ state, derived, update }: Props) {

  
  const primary = state.goals.find((goal) => goal.primary) ?? state.goals[0]

  const recommendation = useMemo(() => {
    if (!primary || primary.target <= 0) return null
    const months = monthsLeft(primary, state.currentAge)
    if (months <= 0) return null
    const need = requiredDeposit({ target: primary.target, saved: primary.saved, months })
    const projected = monthsToTarget({ target: primary.target, saved: primary.saved, deposit: primary.deposit })
    const value = futureValue({ target: primary.target, saved: primary.saved, deposit: primary.deposit, months })
    const deposits = primary.deposit * months
    return { need, projected, value, months, deposits, interest: Math.max(0, value - primary.saved - deposits) }
  }, [primary, state.currentAge])

  const addGoal = () => {
    const goal: Goal = {
      id: uid('goal'),
      name: `Target ${state.goals.length + 1}`,
      target: 0,
      saved: 0,
      deposit: defaultDeposit(derived),
      targetAge: Math.max(18, state.currentAge + 1),
      primary: state.goals.length === 0,
    }
    update((s) => ({ ...s, goals: [...s.goals, goal] }))
  }

  const patchGoal = (id: string, patch: Partial<Goal>) => {
    update((s) => ({ ...s, goals: s.goals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)) }))
  }

  const removeGoal = (id: string) => {
    update((s) => {
      const rest = s.goals.filter((goal) => goal.id !== id)
      if (rest.length > 0 && !rest.some((goal) => goal.primary)) {
        return { ...s, goals: rest.map((goal, index) => (index === 0 ? { ...goal, primary: true } : goal)) }
      }
      return { ...s, goals: rest }
    })
  }


  return (
    <section className="card">
      <header className="card-head">
        <h2>Target Tabungan</h2>
        <span className="muted small">bunga 8% per tahun</span>
      </header>

      <div className="field field-inline">
        <label htmlFor="age-now">Umur kamu sekarang</label>
        <input
          id="age-now"
          className="input input-narrow"
          type="number"
          min={1}
          max={90}
          value={state.currentAge}
          onChange={(e) => update((s) => ({ ...s, currentAge: Math.max(1, Number(e.target.value) || 1) }))}
        />
        <span className="muted small">tahun — target minimal umur 18 (sudah punya KTP)</span>
      </div>

      <div className="goal-list">
        {state.goals.map((goal) => {
          const months = monthsLeft(goal, state.currentAge)
          const percent = goal.target > 0 ? Math.round((goal.saved / goal.target) * 100) : 0

          return (
            <article key={goal.id} className={`goal${goal.primary ? ' goal-primary' : ''}`}>
              <header className="goal-head">
                <input
                  className="input input-name"
                  value={goal.name}
                  onChange={(e) => patchGoal(goal.id, { name: e.target.value })}
                  aria-label="Nama target"
                />
                <div className="goal-head-actions">
                  <button
                    type="button"
                    className={`btn btn-ghost btn-sm${goal.primary ? ' btn-active' : ''}`}
                    onClick={() =>
                      update((s) => ({ ...s, goals: s.goals.map((item) => ({ ...item, primary: item.id === goal.id })) }))
                    }
                  >
                    {goal.primary ? '★ Utama' : 'Jadikan utama'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeGoal(goal.id)}>
                    Hapus
                  </button>
                </div>
              </header>

              <div className="form-grid form-grid-2">
                <div className="field">
                  <label>Target (Rp)</label>
                  <MoneyInput value={goal.target} onValueChange={(value) => patchGoal(goal.id, { target: value })} />
                </div>
                <div className="field">
                  <label>Sudah terkumpul (Rp)</label>
                  <MoneyInput value={goal.saved} onValueChange={(value) => patchGoal(goal.id, { saved: value })} />
                </div>
                <div className="field">
                  <label>Setoran riil / bulan (Rp)</label>
                  <MoneyInput value={goal.deposit} onValueChange={(value) => patchGoal(goal.id, { deposit: value })} />
                </div>
                <div className="field">
                  <label>Dicapai di umur</label>
                  <input
                    className="input"
                    type="number"
                    min={18}
                    value={goal.targetAge}
                    onChange={(e) => patchGoal(goal.id, { targetAge: Math.max(18, Number(e.target.value)) })}
                  />
                </div>
              </div>

              <div className="goal-progress">
                <ProgressBar value={goal.saved} max={goal.target} />
                <span className="muted small">
                  {formatIDR(goal.saved)} / {formatIDR(goal.target)} ({percent}%)
                  {months > 0 ? ` · ${formatDuration(months)} lagi` : ' · umur target sudah terlampaui'}
                </span>
              </div>
            </article>
          )
        })}
      </div>


      <button type="button" className="btn btn-ghost" onClick={addGoal}>
        + Tambah target baru
      </button>
      {state.goals.length === 0 && <p className="muted small">Belum ada target. Buat satu untuk mulai menghitung bunga 8% per tahun.</p>}

      {primary && recommendation && (
        <div className="recommend">
          <h3 className="section-title">Perhitungan untuk {primary.name}</h3>
          <ul className="rec-list">
            <li>
              <span>Rekomendasi setoran</span>
              <strong>{recommendation.need === null ? '—' : `${formatIDR(recommendation.need)} / bulan`}</strong>
            </li>
            <li>
              <span>Setoran riil kamu</span>
              <strong>{formatIDR(primary.deposit)} / bulan</strong>
            </li>
            <li>
              <span>Perkiraan tercapai</span>
              <strong>
                {recommendation.projected === null
                  ? 'Tidak tercapai (belum ada setoran/saldo)'
                  : recommendation.projected === 0
                    ? 'Sudah tercapai'
                    : `umur ${ageAfter(state.currentAge, recommendation.projected).label} (${formatDuration(recommendation.projected)})`}
              </strong>
            </li>
            <li>
              <span>Nilai tabungan di umur {primary.targetAge}</span>
              <strong>
                {formatIDR(recommendation.value)}
                <span className="muted small"> (setoran {formatIDR(recommendation.deposits)} + bunga {formatIDR(recommendation.interest)})</span>
              </strong>
            </li>
          </ul>
        </div>
      )}
    </section>
  )
}
