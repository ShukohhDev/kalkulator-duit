import { useMemo } from 'react'
import type { AppState, Goal } from '../types'
import type { Derived } from '../lib/derive'
import type { Updater } from '../hooks/useAppState'
import { formatIDR } from '../lib/money'
import { activeGoals, effectiveSaved } from '../lib/state'
import { uid } from '../lib/id'
import { ageAfter, formatDuration, futureValue, monthsToTarget, requiredDeposit } from '../lib/savings'
import { translate, type Language } from '../lib/i18n'
import { MoneyInput } from './MoneyInput'
import { ProgressBar } from './ProgressBar'

interface Props {
  state: AppState
  derived: Derived
  update: Updater
  lang?: Language
}

const defaultDeposit = (derived: Derived) => Math.round(derived.monthly * 0.2)

const monthsLeft = (goal: Goal, currentAge: number) => (goal.targetAge - currentAge) * 12

function projection(goal: Goal, currentAge: number, savingsByGoal: Record<string, number>) {
  const months = monthsLeft(goal, currentAge)
  if (goal.target <= 0 || months <= 0) return null
  const saved = effectiveSaved(goal, savingsByGoal)
  const need = requiredDeposit({ target: goal.target, saved, months })
  const projected = monthsToTarget({ target: goal.target, saved, deposit: goal.deposit })
  const value = futureValue({ target: goal.target, saved, deposit: goal.deposit, months })
  const deposits = goal.deposit * months
  return { need, projected, value, months, deposits, interest: Math.max(0, value - saved - deposits) }
}

export function SavingsPanel({ state, derived, update, lang = 'id' }: Props) {
  const recommendations = useMemo(
    () =>
      activeGoals(state.goals)
        .map((goal) => ({ goal, calc: projection(goal, state.currentAge, derived.savingsByGoal) }))
        .filter((item): item is { goal: Goal; calc: NonNullable<ReturnType<typeof projection>> } => item.calc !== null),
    [state.goals, state.currentAge, derived.savingsByGoal],
  )

  const addGoal = () => {
    const goal: Goal = {
      id: uid('goal'),
      name: `Target ${state.goals.length + 1}`,
      target: 0,
      saved: 0,
      deposit: defaultDeposit(derived),
      targetAge: Math.max(18, state.currentAge + 1),
      primary: state.goals.length === 0,
      active: true,
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
        <h2>{translate('savings.title', lang)}</h2>
        <span className="muted small">{translate('savings.sub', lang)}</span>
      </header>

      <div className="field field-inline">
        <label htmlFor="age-now">{translate('savings.ageLabel', lang)}</label>
        <input
          id="age-now"
          className="input input-narrow"
          type="number"
          min={1}
          max={90}
          value={state.currentAge}
          onChange={(e) => update((s) => ({ ...s, currentAge: Math.max(1, Number(e.target.value) || 1) }))}
        />
        <span className="muted small">{translate('savings.ageUnit', lang)}</span>
      </div>

      <div className="goal-list">
        {state.goals.map((goal) => {
          const months = monthsLeft(goal, state.currentAge)
          const logged = derived.savingsByGoal[goal.id] ?? 0
          const savedNow = effectiveSaved(goal, derived.savingsByGoal)
          const percent = goal.target > 0 ? Math.round((savedNow / goal.target) * 100) : 0

          return (
            <article key={goal.id} className={`goal${goal.primary ? ' goal-primary' : ''}${goal.active ? '' : ' goal-off'}`}>
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
                    className={`btn btn-ghost btn-sm${goal.active ? ' btn-active' : ''}`}
                    aria-pressed={goal.active}
                    onClick={() => patchGoal(goal.id, { active: !goal.active })}
                  >
                    {goal.active ? translate('savings.active', lang) : translate('savings.inactive', lang)}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-sm${goal.primary ? ' btn-active' : ''}`}
                    onClick={() =>
                      update((s) => ({ ...s, goals: s.goals.map((item) => ({ ...item, primary: item.id === goal.id })) }))
                    }
                  >
                    {goal.primary ? translate('savings.primary', lang) : translate('savings.setPrimary', lang)}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeGoal(goal.id)}>
                    {translate('savings.deleteBtn', lang)}
                  </button>
                </div>
              </header>

              <div className="form-grid form-grid-2">
                <div className="field">
                  <label>{translate('savings.targetAmount', lang)}</label>
                  <MoneyInput value={goal.target} onValueChange={(value) => patchGoal(goal.id, { target: value })} />
                </div>
                <div className="field">
                  <label>{translate('savings.otherSaved', lang)}</label>
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
                <ProgressBar value={savedNow} max={goal.target} />
                <span className="muted small">
                  {formatIDR(savedNow)} / {formatIDR(goal.target)} ({percent}%)
                  {months > 0 ? ` · ${formatDuration(months)} lagi` : ' · umur target sudah lewat nih'}
                </span>
                {logged > 0 && (
                  <span className="muted small">
                    = saldo manual {formatIDR(goal.saved)} + dari catatan kategori tabungan {formatIDR(logged)}
                  </span>
                )}
              </div>
            </article>
          )
        })}
      </div>


      <button type="button" className="btn btn-ghost" onClick={addGoal}>
        {translate('savings.addBtn', lang)}
      </button>
      {state.goals.length === 0 && <p className="muted small">Belum ada target tabungan nih. Bikin satu yuk biar semangat nabungnya!</p>}

      {recommendations.map(({ goal, calc }) => (
        <div className="recommend" key={goal.id}>
          <h3 className="section-title">Perhitungan untuk {goal.name}</h3>
          <ul className="rec-list">
            <li>
              <span>Rekomendasi setoran</span>
              <strong>{calc.need === null ? '·' : `${formatIDR(calc.need)} / bulan`}</strong>
            </li>
            <li>
              <span>Setoran riil kamu</span>
              <strong>{formatIDR(goal.deposit)} / bulan</strong>
            </li>
            <li>
              <span>Perkiraan tercapai</span>
              <strong>
                {calc.projected === null
                  ? 'Belum kehitung (masukin setoran dulu yuk)'
                  : calc.projected === 0
                    ? 'Sudah tercapai'
                    : `umur ${ageAfter(state.currentAge, calc.projected).label} (${formatDuration(calc.projected)})`}
              </strong>
            </li>
            <li>
              <span>Nilai tabungan di umur {goal.targetAge}</span>
              <strong>
                {formatIDR(calc.value)}
                <span className="muted small"> (setoran {formatIDR(calc.deposits)} + bunga {formatIDR(calc.interest)})</span>
              </strong>
            </li>
          </ul>
        </div>
      ))}
      {state.goals.length > 0 && recommendations.length === 0 && (
        <p className="muted small">Belum ada target aktif yang bisa dihitung nih. Coba aktifkan salah satu target di atas ya.</p>
      )}
    </section>
  )
}
