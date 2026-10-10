import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { AppState, BonusSplit, Notify, PeriodMode } from '../types'
import type { Derived } from '../lib/derive'
import type { Updater } from '../hooks/useAppState'
import { formatIDR } from '../lib/money'
import { bonusAmounts, splitTotal } from '../lib/bonus'
import { latePlan } from '../lib/lateperiod'
import { LIFESTYLES, applyLifestyle, findLifestyle } from '../lib/lifestyles'
import { MoneyInput } from './MoneyInput'
import { ProgressBar } from './ProgressBar'
import { AllocationEditor } from './AllocationEditor'
import { CustomSelect } from './CustomSelect'

interface Props {
  state: AppState
  derived: Derived
  update: Updater
  notify: Notify
  onChangePeriod: () => void
}

const LABEL: Record<PeriodMode, string> = { week: '1 Minggu', month: '1 Bulan' }
const UNIT: Record<PeriodMode, string> = { week: 'minggu', month: 'bulan' }

const pctText = (ratio: number) => `${String(Number((ratio * 100).toFixed(1))).replace('.', ',')}%`

const BONUS_FIELDS: { key: keyof BonusSplit; label: string; id: string }[] = [
  { key: 'savings', label: 'Tabungan', id: 'bonus-savings' },
  { key: 'buffer', label: 'Dana darurat / target', id: 'bonus-buffer' },
  { key: 'fun', label: 'Keinginan', id: 'bonus-fun' },
]

export function AllowanceCard({ state, derived, update, notify, onChangePeriod }: Props) {
  const mode = state.mode
  const [editing, setEditing] = useState(false)
  const [lifestyleId, setLifestyleId] = useState('')
  const [zeroPending, setZeroPending] = useState<string | null>(null)
  const varOn = state.incomeVar
  const bonus = Math.max(0, state.allowanceMax - state.allowance)
  const total = splitTotal(state.bonusSplit)
  const amounts = bonusAmounts(bonus, state.bonusSplit)
  const late = latePlan(state, derived)
  const budget = state.allowance
  const totalRatio = state.categories.reduce((sum, category) => sum + Math.max(0, category.ratio), 0)

  const toggleVar = () =>
    update((s) => ({ ...s, incomeVar: !s.incomeVar }))

  const applyLifestyleChoice = () => {
    if (lifestyleId === '') return
    update((s) => ({ ...s, lifestyle: lifestyleId, categories: applyLifestyle(s.categories, lifestyleId) }))
    setLifestyleId('')
  }

  const setAllocAmount = (id: string, value: number) => {
    if (state.allowance <= 0) return
    if (value <= 0) {
      // jangan commit 0 saat mengetik: kartu akan hilang dari hasil alokasi
      setZeroPending(id)
      return
    }
    setZeroPending(null)
    const ratio = value / state.allowance
    update((s) => ({
      ...s,
      categories: s.categories.map((category) => (category.id === id ? { ...category, ratio } : category)),
    }))
  }

  const commitZeroAmount = (id: string) => {
    if (zeroPending !== id) return
    setZeroPending(null)
    update((s) => ({
      ...s,
      categories: s.categories.map((category) => (category.id === id ? { ...category, ratio: 0 } : category)),
    }))
  }

  const setAllowance = (value: number) =>
    update((s) => ({
      ...s,
      allowance: value,
      allowanceMax: s.allowanceMax > 0 ? Math.max(s.allowanceMax, value) : 0,
    }))

  const setSplit = (key: keyof BonusSplit, raw: number) =>
    update((s) => ({ ...s, bonusSplit: { ...s.bonusSplit, [key]: Math.min(100, Math.max(0, raw)) } }))

  const applyLatePlan = () => {
    if (!late) return
    update((s) => ({
      ...s,
      categories: s.categories.map((category) => {
        const next = late.ratios[category.id]
        return next !== undefined && Math.abs(next - category.ratio) > 1e-9
          ? { ...category, ratio: next }
          : category
      }),
    }))
    notify('Alokasi diperbarui untuk sisa periode.')
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
        <MoneyInput value={state.allowance} onValueChange={setAllowance} id="allowance" />
      </div>

      <div className="bonus-block">
        <div className="bonus-row">
          <button
            type="button"
            className={`btn btn-ghost btn-sm${varOn ? ' btn-active' : ''}`}
            aria-pressed={varOn}
            onClick={toggleVar}
          >
            Pemasukan tidak tetap
          </button>
          <CustomSelect
            className="input"
            aria-label="Gaya hidup"
            value={lifestyleId}
            onChange={(event) => setLifestyleId(event.target.value)}
            title="Pilih Gaya Hidup"
          >
            <option value="">Gaya hidup...</option>
            {LIFESTYLES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}: {item.blurb}
              </option>
            ))}
          </CustomSelect>
          <button type="button" className="btn btn-sm" disabled={lifestyleId === ''} onClick={applyLifestyleChoice}>
            Terapkan
          </button>
        </div>
        {state.lifestyle !== 'seimbang' && (
          <p className="muted small">
            Gaya hidup aktif: {findLifestyle(state.lifestyle).name} (diterapkan ulang saat ganti profil alokasi).
          </p>
        )}
        {varOn && (
          <p className="muted small">
            Semua hitungan (alokasi, per hari, sisa) pakai dasar {formatIDR(state.allowance)}. Batas atas hanya
            untuk skenario bonus.
          </p>
        )}
        {varOn && (
          <div className="field">
            <label htmlFor="allowance-max">
              Pemasukan tertinggi {mode ? `per ${UNIT[mode]}` : ''}
            </label>
            <MoneyInput
              id="allowance-max"
              value={state.allowanceMax}
              onValueChange={(value) => update((s) => ({ ...s, allowanceMax: Math.max(value, s.allowance) }))}
            />
          </div>
        )}
        {varOn && bonus > 0 && (
          <div className="bonus-card">
            <header>
              <strong>Skenario bonus</strong>
              <span className="chip">Dasar {formatIDR(state.allowance)}</span>
            </header>
            <p className="muted small">
              Kalau dapat {formatIDR(state.allowanceMax)}, sisa{' '}
              <strong className="bonus-total">{formatIDR(bonus)}</strong> di atas dasar dibagi:
            </p>
            <div className="bonus-fields">
              {BONUS_FIELDS.map((field) => (
                <label key={field.key} className="bonus-field" htmlFor={field.id}>
                  <span>{field.label}</span>
                  <span className="bonus-pct-wrap">
                    <input
                      id={field.id}
                      className="input bonus-pct"
                      type="number"
                      min={0}
                      max={100}
                      value={state.bonusSplit[field.key]}
                      onChange={(event) => setSplit(field.key, Number(event.target.value))}
                    />
                    %
                  </span>
                </label>
              ))}
            </div>
            {total !== 100 && (
              <p className="bonus-warn">Total persen {total}%, seharusnya 100%.</p>
            )}
            <div className="bonus-amounts">
              {BONUS_FIELDS.map((field) => (
                <span key={field.key} className="chip">
                  {field.label} {formatIDR(amounts[field.key])}
                </span>
              ))}
            </div>
          </div>
        )}
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
              Sisa {formatIDR(derived.remainingInPeriod)} dari {formatIDR(budget)} untuk periode ini
            </span>
            <ProgressBar value={derived.spentInPeriod} max={budget} />
          </div>

          {late && (
            <div className="late-card">
              <header>
                <strong>Uang tanggal tua</strong>
                <span className="chip">Sisa {formatIDR(late.remaining)}</span>
              </header>
              <p className="muted small">{late.text}</p>
              <ul className="late-changes">
                {late.changes.map((change) => (
                  <li key={change.id}>
                    {change.name}: {pctText(change.before)} → <strong>{pctText(change.after)}</strong>
                  </li>
                ))}
              </ul>
              {late.shortfall > 0 && (
                <p className="text-danger small">
                  Kebutuhan sisa hari masih kurang {formatIDR(late.shortfall)}. Tahan menabung dulu sampai
                  periode berikutnya.
                </p>
              )}
              <button type="button" className="btn btn-sm" onClick={applyLatePlan}>
                Terapkan rencana alokasi
              </button>
            </div>
          )}

          <h3 className="section-title">Hasil alokasi</h3>
          <div className="wallet-grid alloc-cards">
            {state.categories
              .filter((category) => category.ratio > 0)
              .map((category) => {
                return (
                  <article
                    key={category.id}
                    className="wallet"
                    style={{ '--wallet-color': category.color } as CSSProperties}
                  >
                    <header>
                      <span className="wallet-dot" />
                      <h3>{category.name}</h3>
                    </header>
                    <MoneyInput
                      id={`alloc-${category.id}`}
                      value={Math.round(state.allowance * category.ratio)}
                      disabled={state.allowance <= 0}
                      onValueChange={(value) => setAllocAmount(category.id, value)}
                      onBlur={() => commitZeroAmount(category.id)}
                    />
                    <p className="muted small">{pctText(category.ratio)} dari uang jajan</p>
                  </article>
                )
              })}
          </div>
          <p className="muted small">
            Total alokasi = {formatIDR(state.allowance)} ({Math.round(totalRatio * 100)}% dari uang jajan{' '}
            {LABEL[mode ?? 'week'].toLowerCase()}).
          </p>
          {Math.abs(totalRatio - 1) > 0.0005 && (
            <p className="bonus-warn">Total persen alokasi {pctText(totalRatio)}, seharusnya 100%.</p>
          )}

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
