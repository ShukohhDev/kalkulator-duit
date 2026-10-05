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

  const amountOf = (categoryId: string) => {
    const value = Number(draft[categoryId])
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
  }
  const amountTotal = state.categories.reduce((sum, category) => sum + amountOf(category.id), 0)
  const diff = state.allowance - amountTotal
  const sumOk = diff === 0
  const pctLabel = (amount: number) => {
    const pct = state.allowance > 0 ? (amount / state.allowance) * 100 : 0
    return `${Number(pct.toFixed(1))}%`.replace('.', ',')
  }

  const openRatioEdit = () => {
    setDraft(
      Object.fromEntries(
        state.categories.map((category) => [category.id, String(Math.round(category.ratio * state.allowance))]),
      ),
    )
    setEditingRatios(true)
  }

  const saveRatios = () => {
    if (!sumOk || state.allowance <= 0) return
    update((s) => ({
      ...s,
      categories: s.categories.map((category) => ({ ...category, ratio: amountOf(category.id) / state.allowance })),
    }))
    setEditingRatios(false)
  }

  const resetRatios = () => {
    const defaults = new Map(
      defaultCategories().map((category) => [category.id, Math.round(category.ratio * state.allowance)]),
    )
    setDraft(
      Object.fromEntries(
        state.categories.map((category) => [
          category.id,
          String(defaults.get(category.id) ?? Math.round(category.ratio * state.allowance)),
        ]),
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
              Ubah alokasi
            </button>
          )}

          {editingRatios && (
            <div className="ratio-edit">
              <p className="muted small">
                Isi nominal kebutuhanmu per kategori untuk {LABEL[mode].toLowerCase()}; persen dihitung otomatis dari
                uang jajan.
              </p>
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
                      step={1000}
                      inputMode="numeric"
                      value={draft[category.id] ?? '0'}
                      aria-label={`Alokasi ${category.name}`}
                      onChange={(event) => setDraft((prev) => ({ ...prev, [category.id]: event.target.value }))}
                    />
                    <span className="ratio-unit">{pctLabel(amountOf(category.id))}</span>
                  </label>
                ))}
              </div>
              <p className={`ratio-sum ${sumOk ? 'muted small' : 'text-danger small'}`}>
                Jumlah {formatIDR(amountTotal)}
                {sumOk
                  ? ', pas, siap disimpan'
                  : diff > 0
                    ? `, kurang ${formatIDR(diff)} dari uang jajan`
                    : `, lebih ${formatIDR(-diff)} dari uang jajan`}
              </p>
              <div className="btn-row">
                <button type="button" className="btn btn-sm" disabled={!sumOk} onClick={saveRatios}>
                  Simpan alokasi
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
