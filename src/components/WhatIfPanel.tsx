import { useState } from 'react'
import type { AppState } from '../types'
import type { Derived } from '../lib/derive'
import { whatIf } from '../lib/whatif'
import { formatIDR, roundTo500 } from '../lib/money'
import { useI18n } from '../lib/i18n'
import { CustomSelect } from './CustomSelect'

interface Props {
  state: AppState
  derived: Derived
}

const ALLOWANCE_STEPS = [0, -30, -20, -10, 10, 20, 30]
const PACE_STEPS = [-30, -20, -10, 0, 10, 20]

export function WhatIfPanel({ state, derived }: Props) {
  const { language } = useI18n()
  const isEn = language === 'en'

  const [allowancePct, setAllowancePct] = useState(0)
  const [pacePct, setPacePct] = useState(0)

  const result = whatIf(state, derived, { allowancePct, pacePct })
  if (!result) return null

  const endLabel =
    result.projectedEnd >= 0
      ? isEn
        ? `Remaining ${formatIDR(result.projectedEnd)}`
        : `Sisa ${formatIDR(result.projectedEnd)}`
      : isEn
        ? `Deficit ${formatIDR(-result.projectedEnd)}`
        : `Kurang ${formatIDR(-result.projectedEnd)}`
  const delta = result.projectedEnd - result.currentEnd

  return (
    <section className="card whatif-card">
      <header className="card-head">
        <h2>{isEn ? 'What If' : 'Bagaimana Kalau'}</h2>
        <span className="muted small">
          {isEn
            ? 'simulation only (relaxed, does not modify your data)'
            : 'simulasi saja (santai, tidak mengubah data kamu)'}
        </span>
      </header>

      <div className="form-grid form-grid-2">
        <div className="field">
          <label htmlFor="whatif-allowance">
            {isEn ? 'Allowance changes' : 'Uang jajan berubah'}
          </label>
          <CustomSelect
            id="whatif-allowance"
            className="input"
            value={allowancePct}
            onChange={(e) => setAllowancePct(Number(e.target.value))}
            title={isEn ? 'Select Allowance Change' : 'Pilih Perubahan Uang Jajan'}
          >
            {ALLOWANCE_STEPS.map((step) => (
              <option key={step} value={step}>
                {step === 0
                  ? isEn
                    ? 'Unchanged (100%)'
                    : 'Tetap (100%)'
                  : `${step > 0 ? '+' : ''}${step}%`}
              </option>
            ))}
          </CustomSelect>
        </div>
        <div className="field">
          <label htmlFor="whatif-pace">
            {isEn ? 'Spending pace' : 'Laju pengeluaran'}
          </label>
          <CustomSelect
            id="whatif-pace"
            className="input"
            value={pacePct}
            onChange={(e) => setPacePct(Number(e.target.value))}
            title={isEn ? 'Select Spending Pace' : 'Pilih Laju Pengeluaran'}
          >
            {PACE_STEPS.map((step) => (
              <option key={step} value={step}>
                {step === 0
                  ? isEn
                    ? 'Same as now'
                    : 'Sama seperti sekarang'
                  : isEn
                    ? `${step > 0 ? 'up' : 'down'} ${Math.abs(step)}%`
                    : `${step > 0 ? 'naik' : 'turun'} ${Math.abs(step)}%`}
              </option>
            ))}
          </CustomSelect>
        </div>
      </div>

      <ul className="rec-list">
        <li>
          <span>{isEn ? 'Scenario allowance' : 'Uang jajan skenario'}</span>
          <strong>{formatIDR(result.allowance)}</strong>
        </li>
        <li>
          <span>
            {isEn ? 'Projected period-end expense' : 'Proyeksi pengeluaran akhir periode'}
          </span>
          <strong>{formatIDR(result.projectedExpense)}</strong>
        </li>
        <li>
          <span>{isEn ? 'Estimated at period end' : 'Perkiraan saat periode berakhir'}</span>
          <strong className={result.projectedEnd < 0 ? 'text-danger' : undefined}>{endLabel}</strong>
        </li>
        <li>
          <span>{isEn ? 'Daily spending allowance' : 'Boleh belanja per hari'}</span>
          <strong>{formatIDR(roundTo500(result.perDay))}</strong>
        </li>
      </ul>
      {Math.abs(delta) >= 1 && (
        <p className="muted small">
          {isEn
            ? `${delta > 0 ? 'More relaxed by' : 'Tighter by'} ${formatIDR(Math.abs(delta))} compared to current.`
            : `${delta > 0 ? 'Lebih lega' : 'Lebih ketat'} ${formatIDR(Math.abs(delta))} dibanding kondisi sekarang.`}
        </p>
      )}
    </section>
  )
}
