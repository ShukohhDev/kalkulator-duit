import { useState } from 'react'
import type { AppState, PeriodMode } from '../types'
import type { Derived } from '../lib/derive'
import type { Updater } from '../hooks/useAppState'
import { formatIDR } from '../lib/money'
import { defaultCategories } from '../lib/state'
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
  const [editingRatios, setEditingRatios] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})

  const percentOf = (categoryId: string) => {
    const value = Number(draft[categoryId])
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  }
  const percentTotal = state.categories.reduce((sum, category) => sum + percentOf(category.id), 0)
  const sumOk = Math.abs(percentTotal - 100) < 0.01

  const openRatioEdit = () => {
    setDraft(Object.fromEntries(state.categories.map((category) => [category.id, String(Math.round(category.ratio * 100))])))
    setEditingRatios(true)
  }

  const saveRatios = () => {
    if (!sumOk) return
    update((s) => ({
      ...s,
      categories: s.categories.map((category) => ({ ...category, ratio: percentOf(category.id) / 100 })),
    }))
    setEditingRatios(false)
  }

  const resetRatios = () => {
    const defaults = new Map(defaultCategories().map((category) => [category.id, Math.round(category.ratio * 100)]))
    setDraft(
      Object.fromEntries(
        state.categories.map((category) => [category.id, String(defaults.get(category.id) ?? Math.round(category.ratio * 100))]),
      ),
    )
  }

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

          {!editingRatios && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={openRatioEdit}>
              Ubah rasio alokasi
            </button>
          )}

          {editingRatios && (
            <div className="ratio-edit">
              <p className="muted small">Bagian tiap posisi dari total 100% uang jajan {LABEL[mode].toLowerCase()}.</p>
              <div className="ratio-grid">
                {state.categories.map((category) => (
                  <label key={category.id} className="ratio-field">
                    <span className="ratio-name">
                      <i className="alloc-dot" style={{ background: category.color }} />
                      {category.name}
                    </span>
                    <input
                      className="input ratio-input"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      inputMode="numeric"
                      value={draft[category.id] ?? '0'}
                      aria-label={`Persen ${category.name}`}
                      onChange={(event) => setDraft((prev) => ({ ...prev, [category.id]: event.target.value }))}
                    />
                    <span className="ratio-unit">%</span>
                  </label>
                ))}
              </div>
              <p className={`ratio-sum ${sumOk ? 'muted small' : 'text-danger small'}`}>
                Jumlah {percentTotal}% {sumOk ? '— pas, siap disimpan' : '— harus tepat 100% sebelum disimpan'}
              </p>
              <div className="btn-row">
                <button type="button" className="btn btn-sm" disabled={!sumOk} onClick={saveRatios}>
                  Simpan rasio
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={resetRatios}>
                  Reset ke default
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingRatios(false)}>
                  Batal
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
